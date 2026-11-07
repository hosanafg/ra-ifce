"""Uso: python testes_locais/testar_validacoes.py"""
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ))

import cv2
import numpy as np
import CONFIG
CONFIG.configurar_logs()

from functions.loading import ErroLeitura
from functions.pipeline import processar_documento


def esperar_erro(descricao, dados, nome, codigo_esperado):
    try:
        processar_documento(dados, nome)
        print(f"FALHA  | {descricao}: não lançou erro")
    except ErroLeitura as e:
        ok = e.codigo == codigo_esperado
        print(f"{'OK    ' if ok else 'FALHA '} | {descricao}: {e.codigo}")


def esperar_alerta(descricao, dados, nome, codigo_esperado):
    _, alertas = processar_documento(dados, nome)
    ok = any(a.codigo == codigo_esperado for a in alertas)
    print(f"{'OK    ' if ok else 'FALHA '} | {descricao}: {[a.codigo for a in alertas]}")


branca = cv2.imencode(".png", np.full((600, 600, 3), 255, np.uint8))[1].tobytes()
png_truncado = cv2.imencode(".png", np.random.randint(0, 255, (300, 300, 3), np.uint8))[1].tobytes()[:200]

esperar_erro("arquivo de 0 bytes", b"", "vazio.pdf", "LEITURA_VAZIA")
esperar_erro("PDF corrompido", b"%PDF-1.4 isto nao e um pdf valido", "ruim.pdf", "ARQUIVO_CORROMPIDO")
esperar_erro("PNG truncado", png_truncado, "quebrada.png", "ARQUIVO_CORROMPIDO")
esperar_erro("binário desconhecido", bytes(range(200, 256)) * 3, "lixo.bin", "FORMATO_NAO_SUPORTADO")
esperar_alerta("imagem toda branca", branca, "branca.png", "LEITURA_VAZIA")