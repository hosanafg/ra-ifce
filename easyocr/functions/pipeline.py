import logging
from typing import List, Tuple

from CONFIG import *
from functions.loading import *
from functions.ocr import ocr_imagem  
from functions.parser import extrair_insumos, aplicar_validade_global
from functions.pydantic_functions import InsumoExtraido, Alerta

def ler_linhas(dados: bytes, nome: str) -> Tuple[List[Tuple[int, list]], List[Alerta]]:
    """Etapa 1: arquivo -> linhas de texto por página. Pode lançar ErroLeitura."""
    logging.info(f"[PIPELINE] Iniciando leitura de OCR do arquivo {nome}")
    alertas: List[Alerta] = []
    fontes = carregar_documento(dados, nome)

    if len(fontes) > MAX_PAGINAS:
        raise ErroLeitura("ARQUIVO_MUITO_GRANDE",
                          f"O documento tem {len(fontes)} páginas (máximo {MAX_PAGINAS}).", status=413)

    paginas=[]
    for tipo, conteudo, pagina in fontes:
        if tipo == "imagem":
            if not imagem_valida(conteudo):
                msg = f"[PIPELINE] Página {pagina} vazia ou sem conteúdo legível."
                logging.warning(msg)
                alertas.append(Alerta(codigo="LEITURA_VAZIA", mensagem=msg, pagina=pagina))
                continue
            linhas = ocr_imagem(conteudo)
        else:
            linhas = conteudo

        if not linhas:
            msg = f"[PIPELINE] Nenhum texto reconhecido na página {pagina}."
            logging.warning(msg)
            alertas.append(Alerta(codigo="LEITURA_VAZIA", mensagem=msg, pagina=pagina))
            continue
        paginas.append((pagina, linhas))
    
    return paginas, alertas

def processar_documento(dados: bytes, nome: str) -> Tuple[List[InsumoExtraido], List[Alerta]]:
    """Etapa 1 + 2: arquivo -> insumos extraídos + alertas."""
    paginas, alertas = ler_linhas(dados, nome)
    insumos: List[InsumoExtraido] = []
    contexto: dict = {}                      # refeição/receita/fornecedor atravessam as páginas

    for pagina, linhas in paginas:
        logging.info("--------------- OCR p%s -----------------", pagina)
        for item in linhas:
            logging.info(f"[p{pagina}] OCR: '{item['text']}' (conf={item['conf']:.2f})")

        novos, contexto = extrair_insumos(linhas, contexto)
        for ins in novos:
            if ins.revisar:
                msg = f"Revisar: '{ins.texto_original}' (conf={ins.confianca:.2f})"
                logging.warning(msg)
                alertas.append(Alerta(codigo="BAIXA_CONFIANCA", mensagem=msg, pagina=pagina))
        aplicar_validade_global(linhas, novos, alertas)
        insumos += novos

    if not insumos and not any(a.codigo == "LEITURA_VAZIA" for a in alertas):
        alertas.append(Alerta(codigo="CAMPO_NAO_ENCONTRADO",
                              mensagem="Nenhum alimento identificado no documento."))
    return insumos, alertas
