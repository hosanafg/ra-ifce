import re
import logging
from datetime import date
from typing import List, Optional

from CONFIG import *
from functions.pydantic_functions import *

PESO_RE = re.compile(r'(\d+(?:[.,]\d+)?)\s*(kg|gr|g|mg|ml|lt|l)\b', re.I)
QTD_RE = re.compile(
    r'(?:qtd\.?|quant\.?|quantidade)?\s*[:\-]?\s*(\d+)\s*'
     r'(?:un|und|unid(?:ades?)?|p[cç]s?|cx|caixas?)\b|\b(\d+)\s*x\b', re.I)
DATA_RE = re.compile(r'\b(\d{2})[/\-.](\d{2})[/\-.](\d{4}|\d{2})\b')
ROTULOS_RE = re.compile(r'(?i)\b(validade|venc(?:imento)?|val|peso|qtd|quantidade)\b\.?:?')

UNIDADES_PESO = {"kg", "g", "mg", "l", "ml"}
ALIAS_UNIDADE = {"gr": "g", "lt": "l"}

TABELA_RE = re.compile(
    r'^(?P<item>.+?)\s+(?P<un>kg|gr|g|mg|lt|l|ml|und|unid|un)\.?\s+'
    r'(?P<nums>\d+(?:[.,]\d+)?(?:\s+\d+(?:[.,]\d+)?)+)\s*$', re.I)


def _num(s: str) -> float:
    s = s.strip()
    if "," in s:                              # 1.250,50 -> 1250.50 | 0,300 -> 0.300
        s = s.replace(".", "").replace(",", ".")
    return float(s)


def parse_linha_tabela(item: dict) -> Optional[InsumoExtraido]:
    """Linha de tabela: <item> <unidade> <qtde bruta> <qtde líquida> <fator> <custos...>."""
    m = TABELA_RE.match(item["text"].strip())
    if not m:
        return None
    nome = re.sub(r"\s+", " ", m.group("item")).strip(" -:;.,|")
    if not nome:
        return None

    un = m.group("un").lower()
    un = ALIAS_UNIDADE.get(un, un)
    bruta = _num(m.group("nums").split()[0])      # 1º número = Qtde. Bruta

    eh_peso = un in UNIDADES_PESO
    return InsumoExtraido(
        ingrediente=nome,
        peso_valor=bruta if eh_peso else None,
        peso_unidade=un if eh_peso else None,
        quantidade=None if eh_peso else int(round(bruta)),
        data_vencimento=None,
        confianca=float(item["conf"]),
        revisar=item["conf"] < CONF_MIN,
        texto_original=item["text"],
    )

def _parse_data(m) -> Optional[date]:
    d, mes, ano = int(m.group(1)), int(m.group(2)), int(m.group(3))
    if ano < 100:
        ano += 2000
    try:
        return date(ano, mes, d)
    except ValueError:                      # ex.: 31/02/2026 
        return None

def parse_linha(item: dict) -> Optional[InsumoExtraido]:
    ins = parse_linha_tabela(item)
    if ins:
        return ins

    txt = item["text"]
    m_peso, m_qtd, m_data = PESO_RE.search(txt), QTD_RE.search(txt), DATA_RE.search(txt)
    if not (m_peso or m_qtd or m_data):
        return None                         # cabeçalho/ruído: não é insumo

    resto = txt

    resto = txt
    for m in (m_peso, m_qtd, m_data):
        if m:
            resto = resto.replace(m.group(0), " ")
    resto = ROTULOS_RE.sub(" ", resto)
    ingrediente = re.sub(r"\s+", " ", resto).strip(" -:;.,")

    peso_valor = float(m_peso.group(1).replace(",", ".")) if m_peso else None
    qtd = int(m_qtd.group(1) or m_qtd.group(2)) if m_qtd else None
    venc = _parse_data(m_data) if m_data else None

    faltando = any(v in (None, "") for v in (ingrediente, peso_valor, qtd, venc))
    return InsumoExtraido(
        ingrediente=ingrediente or None,
        peso_valor=peso_valor,
        peso_unidade=m_peso.group(2).lower() if m_peso else None,
        quantidade=qtd,
        data_vencimento=venc,
        confianca=float(item["conf"]),
        revisar=item["conf"] < CONF_MIN or faltando,
        texto_original=txt,
    )

def aplicar_validade_global(linhas: List[dict], insumos: List[InsumoExtraido],
                            alertas: List[Alerta]) -> None:
    """Se a validade veio numa linha solta ('Validade: 10/12/2026'), aplica aos itens sem data."""
    for l in linhas:
        if re.search(r"(?i)validade|venc", l["text"]):
            m = DATA_RE.search(l["text"])
            d = _parse_data(m) if m else None
            if d:
                for i in insumos:
                    if i.data_vencimento is None:
                        i.data_vencimento = d
                        i.revisar = True
                alertas.append(Alerta(
                    codigo="CAMPO_NAO_ENCONTRADO",
                    mensagem="Validade por item não encontrada; usada a data geral do documento. Confira."))
                logging.warning("Validade global aplicada aos itens sem data")
                return