"""Parser de texto de OCR -> insumos.

Estratégia (independe de estrutura fixa):
  1. Linhas de contexto (Refeição / Receita / Fornecedor / Marca) atualizam o estado.
  2. Em cada linha, primeiro se extraem os ATRIBUTOS (data, peso, quantidade); o que sobra
     é o NOME do alimento. Se o nome parece válido, o alimento é adicionado — mesmo sem
     nenhum atributo (ex.: "1 banana amassada").
  3. Linhas que só têm atributos ("5 kg", "Validade: 10/12/2026") são associadas ao
     alimento anterior, preenchendo apenas campos ainda vazios.
  Pesos são normalizados para "kg" ou "L".
"""
import re
import logging
import unicodedata
from datetime import date, timedelta
from typing import Dict, List, Optional, Tuple

from CONFIG import *
from functions.pydantic_functions import *

# ───────────────────────────── expressões ─────────────────────────────
_UN_PESO = r'kgs?|quilos?|gramas?|gr|g|mg|ml|litros?|lts?|l'
PESO_RE = re.compile(rf'(?<![\w.,])(\d+(?:[.,]\d+)?)\s*({_UN_PESO})\b', re.I)

_CONTAINERS = (r'unidades?|unid|und|un|p[cç]s?|pe[cç]as?|cx|caixas?|pacotes?|pct|latas?|garrafas?|'
               r'sacos?|sacas?|d[uú]zias?|ma[cç]os?|bandejas?|potes?|frascos?|sach[eê]s?|fatias?|'
               r'cabe[cç]as?|dentes?|molhos?')
QTD_ROT_RE = re.compile(r'\b(?:qtd|quant|quantidade)\.?\s*[:\-]?\s*(\d+)\b', re.I)
QTD_UN_RE = re.compile(rf'(?<![\w.,])(\d+)\s*(?:{_CONTAINERS})\b\.?(?:\s+(?:de|do|da)\b)?', re.I)
QTD_X_RE = re.compile(r'(?<![\w.,])(\d+)\s*[x×]\b|\b[x×]\s*(\d+)\b', re.I)
LEAD_NUM_RE = re.compile(r'^\s*(\d{1,3})\s+(?=[^\W\d_])')
TRAIL_NUM_RE = re.compile(r'(?<=[^\W\d_])\s+(\d{1,3})\s*$')
NUMERACAO_RE = re.compile(r'^\s*\d{1,2}\s*[.)\-]\s+')          # "1. ", "2) ", "3 - "

DATA_RE = re.compile(r'(?<!\d)(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4}|\d{2})(?!\d)')
DATA_CURTA_RE = re.compile(r'(?<![\d/])(\d{1,2})[/\-](\d{1,2})(?![\d/])')
MESES = {'jan': 1, 'fev': 2, 'mar': 3, 'abr': 4, 'mai': 5, 'jun': 6,
         'jul': 7, 'ago': 8, 'set': 9, 'out': 10, 'nov': 11, 'dez': 12}
DATA_EXT_RE = re.compile(
    r'(?<!\d)(\d{1,2})\s*(?:de\s+)?(jan\w*|fev\w*|mar\w*|abr\w*|mai\w*|jun\w*|jul\w*|ago\w*|set\w*|out\w*|nov\w*|dez\w*)'
    r'\.?\s*(?:de\s+)?(\d{4}|\d{2})(?!\d)', re.I)
VAL_RE = re.compile(r'(?i)(validade|val\.?|vcto|venc(?:imento)?\.?|vence|consumir\s+at[eé])\s*:?\s*$')
TEM_VAL_RE = re.compile(r'(?i)\b(validade|val|vcto|venc(?:imento)?|vence)\b')

ROT_RE = re.compile(r'(?i)\b(validade|val|vcto|venc(?:imento)?|vence|peso(?:\s+l[ií]quido)?|qtd|quant|quantidade|'
                    r'fab(?:rica[cç][aã]o)?|data|lote|consumir\s+at[eé])\b\.?\s*:?')
PRECO_RE = re.compile(r'(?i)r\$\s*\d+(?:[.,]\d+)?')

RUIDO_RE = re.compile(
    r'(?i)\b(cnpj|cpf|total|subtotal|troco|desconto|cart[aã]o|dinheiro|pix|nfe?|danfe|cupom|fiscal|'
    r'p[aá]gina|obrigad[oa]|www|http|telefone|fone|endere[cç]o|avenida|cep|inscri[cç][aã]o)\b|@|https?:')
CABECALHOS = {
    'lista', 'lista de compras', 'compras', 'ingredientes', 'ingrediente', 'insumos', 'insumo', 'cardapio',
    'nota fiscal', 'descricao', 'item', 'itens', 'qtd', 'quantidade', 'valor', 'preco', 'unitario', 'peso',
    'validade', 'vencimento', 'fornecedor', 'data', 'codigo', 'cod', 'un', 'unid', 'produto', 'produtos',
    'modo de preparo', 'preparo', 'rendimento', 'receita', 'observacao', 'observacoes', 'obs',
}

REFEICAO_RE = re.compile(
    r'^(?P<n>caf[eé](?:\s+da\s+manh[aã])?|almo[cç]o|lanche(?:\s+da\s+(?:tarde|manh[aã]))?|jantar|ceia)'
    r'\s*(?P<sep>[:\-–—])?\s*(?P<resto>.*)$', re.I)
RECEITA_RE = re.compile(r'(?i)^(?:receita|prato|preparo|menu|card[aá]pio)(?:\s+do\s+dia)?\s*[:\-–]\s*(?P<v>.+)$')
FORN_RE = re.compile(r'(?i)^(?:fornecedor|forn\.?|loja|mercado|empresa|distribuidor[a]?|vendedor)\s*[:\-–]\s*(?P<v>.+)$')
MARCA_RE = re.compile(r'(?i)^marca\s*[:\-–]\s*(?P<v>.+)$')

UNIDADES = {  # unidade lida -> (fator, unidade final)
    'kg': (1, 'kg'), 'kgs': (1, 'kg'), 'quilo': (1, 'kg'), 'quilos': (1, 'kg'),
    'g': (0.001, 'kg'), 'gr': (0.001, 'kg'), 'grama': (0.001, 'kg'), 'gramas': (0.001, 'kg'),
    'mg': (0.000001, 'kg'),
    'l': (1, 'L'), 'lt': (1, 'L'), 'lts': (1, 'L'), 'litro': (1, 'L'), 'litros': (1, 'L'),
    'ml': (0.001, 'L'),
}
TABELA_RE = re.compile(
    r'^(?P<item>.+?)\s+(?P<un>kg|gr|g|mg|lt|l|ml|und|unid|un)\.?\s+'
    r'(?P<nums>\d+(?:[.,]\d+)?(?:\s+\d+(?:[.,]\d+)?)+)\s*$', re.I)


# ───────────────────────────── utilidades ─────────────────────────────
def _sa(s: str) -> str:
    """minúsculas e sem acentos (só para comparar)."""
    return ''.join(c for c in unicodedata.normalize('NFKD', s) if not unicodedata.combining(c)).lower().strip()

def _num(s: str) -> float:
    s = s.strip()
    if "," in s:                              # 1.250,50 -> 1250.50 | 0,300 -> 0.300
        s = s.replace(".", "").replace(",", ".")
    return float(s)

def _peso(valor: str, un: str) -> Tuple[float, str]:
    fator, final = UNIDADES[un.lower()]
    return round(_num(valor) * fator, 3), final

def _mk_data(d: int, m: int, a: int) -> Optional[date]:
    if a < 100:
        a += 2000
    try:
        return date(a, m, d)
    except ValueError:                      # ex.: 31/02/2026
        return None

def _cortar(txt: str, span: Tuple[int, int]) -> str:
    return txt[:span[0]] + ' ' + txt[span[1]:]

def _achar_datas(txt: str) -> List[Tuple[Tuple[int, int], date]]:
    achadas = []
    for m in DATA_RE.finditer(txt):
        d = _mk_data(int(m.group(1)), int(m.group(2)), int(m.group(3)))
        if d:
            achadas.append((m.span(), d))
    for m in DATA_EXT_RE.finditer(txt):
        mes = MESES.get(_sa(m.group(2))[:3])
        d = _mk_data(int(m.group(1)), mes, int(m.group(3))) if mes else None
        if d:
            achadas.append((m.span(), d))
    if not achadas and TEM_VAL_RE.search(txt):          # "Val 10/12" (sem ano)
        for m in DATA_CURTA_RE.finditer(txt):
            hoje = date.today()
            d = _mk_data(int(m.group(1)), int(m.group(2)), hoje.year)
            if d and d < hoje - timedelta(days=180):
                d = _mk_data(int(m.group(1)), int(m.group(2)), hoje.year + 1)
            if d:
                achadas.append((m.span(), d))
    return achadas

def _escolher_data(txt: str, achadas) -> date:
    """Prefere a data precedida por rótulo de validade; senão, a mais distante (evita 'fabricação')."""
    for (ini, _), d in achadas:
        if VAL_RE.search(txt[max(0, ini - 16):ini]):
            return d
    return max(d for _, d in achadas)

def _limpar_nome(s: str) -> str:
    s = ROT_RE.sub(' ', s)
    s = PRECO_RE.sub(' ', s)
    s = re.sub(r'[|•·*_=~<>\[\]{}()"“”]', ' ', s)
    s = re.sub(r'\s+', ' ', s).strip(" -–:;.,/\\")
    s = re.sub(r'^(?:de|do|da|dos|das|com|e)\s+', '', s, flags=re.I)
    s = re.sub(r'\s+(?:de|do|da|com|e)$', '', s, flags=re.I)
    s = s.strip(" -–:;.,/\\")
    return s[:1].upper() + s[1:] if s else s

def _nome_valido(n: str) -> bool:
    if not n:
        return False
    letras = sum(c.isalpha() for c in n)
    digitos = sum(c.isdigit() for c in n)
    if letras < 3 or digitos > letras:
        return False
    if len(n) > 70 or len(n.split()) > 8:
        return False
    if _sa(n) in CABECALHOS or RUIDO_RE.search(n):
        return False
    return True


# ───────────────────────────── linha de tabela ─────────────────────────────
def parse_linha_tabela(item: dict) -> Optional[InsumoExtraido]:
    """Linha de tabela: <item> <unidade> <qtde bruta> <qtde líquida> <fator> <custos...>."""
    m = TABELA_RE.match(item["text"].strip())
    if not m:
        return None
    nome = _limpar_nome(m.group("item"))
    if not _nome_valido(nome):
        return None

    un = m.group("un").lower()
    bruta = _num(m.group("nums").split()[0])      # 1º número = Qtde. Bruta
    eh_peso = un in UNIDADES
    peso_valor, peso_un = (round(bruta * UNIDADES[un][0], 3), UNIDADES[un][1]) if eh_peso else (None, None)
    return InsumoExtraido(
        ingrediente=nome,
        peso_valor=peso_valor,
        peso_unidade=peso_un,
        quantidade=None if eh_peso else int(round(bruta)),
        data_vencimento=None,
        confianca=float(item["conf"]),
        revisar=item["conf"] < CONF_MIN,
        texto_original=item["text"],
    )


# ───────────────────────────── linha livre ─────────────────────────────
def parse_linha(item: dict) -> Optional[InsumoExtraido]:
    """Extrai atributos e usa o que sobra como nome. ingrediente=None => linha só com atributos."""
    ins = parse_linha_tabela(item)
    if ins:
        return ins

    txt = re.sub(r'\s+', ' ', item["text"]).strip()
    if not txt or RUIDO_RE.search(txt):
        return None

    resto = NUMERACAO_RE.sub('', txt)

    venc = None
    achadas = _achar_datas(resto)
    if achadas:
        venc = _escolher_data(resto, achadas)
        for span, _ in sorted(achadas, key=lambda a: a[0][0], reverse=True):
            resto = _cortar(resto, span)

    peso_valor, peso_un = None, None
    m = PESO_RE.search(resto)
    if m:
        peso_valor, peso_un = _peso(m.group(1), m.group(2))
        resto = _cortar(resto, m.span())

    qtd = None
    for rgx in (QTD_ROT_RE, QTD_UN_RE, QTD_X_RE):
        m = rgx.search(resto)
        if m:
            qtd = int(next(g for g in m.groups() if g))
            resto = _cortar(resto, m.span())
            break
    if qtd is None:
        m = LEAD_NUM_RE.match(resto)
        if m:                                           # "1 banana amassada"
            qtd = int(m.group(1))
            resto = resto[m.end(1):]
        else:
            m = TRAIL_NUM_RE.search(resto)              # "Ovos 12"
            if m:
                qtd = int(m.group(1))
                resto = resto[:m.start(1)]

    nome = _limpar_nome(resto)
    if not _nome_valido(nome):
        nome = None
    if nome is None and peso_valor is None and qtd is None and venc is None:
        return None

    return InsumoExtraido(
        ingrediente=nome,
        peso_valor=peso_valor,
        peso_unidade=peso_un,
        quantidade=qtd,
        data_vencimento=venc,
        confianca=float(item["conf"]),
        revisar=item["conf"] < CONF_MIN,
        texto_original=txt,
    )


# ───────────────────────────── contexto (refeição / receita / fornecedor / marca) ─────────────────────────────
def _chave_refeicao(nome: str) -> str:
    n = _sa(nome)
    if n.startswith('caf'):
        return 'cafe'
    if n.startswith('almo'):
        return 'almoco'
    if n.startswith('lanche'):
        return 'lanche'
    return 'jantar'

def parse_contexto(txt: str) -> Optional[dict]:
    t = re.sub(r'\s+', ' ', txt).strip()
    for chave, rgx in (('fornecedor', FORN_RE), ('marca', MARCA_RE), ('receita', RECEITA_RE)):
        m = rgx.match(t)
        if m:
            return {chave: m.group('v').strip(" -–:;.,")}
    m = REFEICAO_RE.match(t)
    if m:
        resto = m.group('resto').strip(" :-–—")
        if resto and (not m.group('sep') or PESO_RE.search(resto) or QTD_UN_RE.search(resto) or _achar_datas(resto)):
            return None                                   # "Café 500g", "Lanche natural": é um alimento
        return {'refeicao': _chave_refeicao(m.group('n')), 'receita': resto or None, '_reset_receita': True}
    return None


def _completar(dst: InsumoExtraido, src: InsumoExtraido) -> None:
    """Preenche em dst apenas o que ainda está vazio, usando uma linha só de atributos."""
    if dst.peso_valor is None and src.peso_valor is not None:
        dst.peso_valor, dst.peso_unidade = src.peso_valor, src.peso_unidade
    if dst.quantidade is None and src.quantidade is not None:
        dst.quantidade = src.quantidade
    if dst.data_vencimento is None and src.data_vencimento is not None:
        dst.data_vencimento = src.data_vencimento
    dst.texto_original = f"{dst.texto_original} | {src.texto_original}"


def extrair_insumos(linhas: List[dict], contexto: Optional[dict] = None) -> Tuple[List[InsumoExtraido], dict]:
    """Percorre as linhas de uma página e devolve (insumos, contexto atualizado)."""
    ctx = contexto if contexto is not None else {}
    itens: List[InsumoExtraido] = []
    ultimo: Optional[InsumoExtraido] = None
    marca_pendente: Optional[str] = None

    for item in linhas:
        txt = item["text"]
        c = parse_contexto(txt)
        if c:
            if 'marca' in c:
                if ultimo is not None and not (ultimo.extras or {}).get('Marca'):
                    ultimo.extras = {**(ultimo.extras or {}), 'Marca': c['marca']}
                else:
                    marca_pendente = c['marca']
            elif 'fornecedor' in c:
                ctx['fornecedor'] = c['fornecedor']
            elif 'receita' in c and 'refeicao' not in c:
                ctx['receita'] = c['receita']
            else:
                ctx['refeicao'] = c['refeicao']
                ctx['receita'] = c['receita']
            logging.info(f"  CONTEXTO -> {c}")
            continue

        ins = parse_linha(item)
        if ins is None:
            logging.info(f"  ignorada (ruído): '{txt}'")
            continue

        if ins.ingrediente is None:                      # só atributos: associa ao alimento anterior
            if ultimo is not None:
                _completar(ultimo, ins)
                logging.info(f"  ATRIBUTOS '{txt}' -> {ultimo.ingrediente!r}")
            else:
                logging.info(f"  atributos sem alimento anterior: '{txt}'")
            continue

        ins.fornecedor = ctx.get('fornecedor')
        ins.refeicao = ctx.get('refeicao')
        ins.receita = ctx.get('receita')
        if marca_pendente:
            ins.extras = {'Marca': marca_pendente}
            marca_pendente = None
        itens.append(ins)
        ultimo = ins
        logging.info(
            f"  ALIMENTO {ins.ingrediente!r} | peso={ins.peso_valor}{ins.peso_unidade or ''} | "
            f"qtd={ins.quantidade} | validade={ins.data_vencimento} | forn={ins.fornecedor!r}")

    forns = {i.fornecedor for i in itens if i.fornecedor}
    if not forns and ctx.get('fornecedor'):
        forns = {ctx['fornecedor']}
    if len(forns) == 1:                                   # fornecedor citado uma única vez no documento
        unico = next(iter(forns))
        for i in itens:
            i.fornecedor = i.fornecedor or unico
    return itens, ctx


def aplicar_validade_global(linhas: List[dict], insumos: List[InsumoExtraido],
                            alertas: List[Alerta]) -> None:
    """Se a validade veio numa linha solta ('Validade: 10/12/2026'), aplica aos itens sem data."""
    for l in linhas:
        if re.search(r"(?i)validade|venc", l["text"]):
            achadas = _achar_datas(l["text"])
            d = _escolher_data(l["text"], achadas) if achadas else None
            if d and any(i.data_vencimento is None for i in insumos):
                for i in insumos:
                    if i.data_vencimento is None:
                        i.data_vencimento = d
                        i.revisar = True
                alertas.append(Alerta(
                    codigo="CAMPO_NAO_ENCONTRADO",
                    mensagem="Validade por item não encontrada; usada a data geral do documento. Confira."))
                logging.warning("Validade global aplicada aos itens sem data")
                return
