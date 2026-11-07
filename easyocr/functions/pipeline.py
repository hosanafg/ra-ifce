import logging
from typing import List, Tuple

from CONFIG import *
from functions.loading import *
from functions.ocr import ocr_imagem  
from functions.parser import parse_linha, aplicar_validade_global
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

    for pagina, linhas in paginas:
        novos = []
        # for item in linhas:
        #     logging.info(f"[p{pagina}] '{item['text']}' conf={item['conf']:.2f}")
        #     ins = parse_linha(item)
        #     if ins:
        #         novos.append(ins)
        #         if ins.revisar:
        #             msg = f"Revisar: '{item['text']}' (conf={item['conf']:.2f})"
        #             logging.warning(msg)
        #             alertas.append(Alerta(codigo="BAIXA_CONFIANCA", mensagem=msg, pagina=pagina))
        for item in linhas:
            logging.info("--------------- OCR -----------------")
            logging.info(f"[p{pagina}] OCR: '{item['text']}' (conf={item['conf']:.2f})")
            ins = parse_linha(item)
            if ins:
                logging.info(
                    f"[p{pagina}] EXTRAÍDO -> ingrediente={ins.ingrediente!r} | "
                    f"peso={ins.peso_valor}{ins.peso_unidade or ''} | qtd={ins.quantidade} | "
                    f"validade={ins.data_vencimento} | revisar={ins.revisar}"
                )
                novos.append(ins)
                if ins.revisar:
                    msg = f"Revisar: '{item['text']}' (conf={item['conf']:.2f})"
                    logging.warning(msg)
                    alertas.append(Alerta(codigo="BAIXA_CONFIANCA", mensagem=msg, pagina=pagina))
            else:
                logging.info(f"[p{pagina}] ignorada (não parece um insumo)")
        aplicar_validade_global(linhas, novos, alertas)
        insumos+=novos

    if not insumos and not any(a.codigo == "LEITURA_VAZIA" for a in alertas):
        alertas.append(Alerta(codigo="CAMPO_NAO_ENCONTRADO",
                              mensagem="Nenhum insumo identificado no documento."))
    return insumos, alertas