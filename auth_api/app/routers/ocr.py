"""Router: OCR — valida o documento ANTES de executar o OCR e devolve os insumos extraídos.

Campos que o OCR não identificar voltam como null (o frontend os deixa em branco).
"""
import json
import logging
import os
import sys
import threading
import time

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool

log = logging.getLogger("ocr")

router = APIRouter(prefix="/ocr", tags=["ocr"])

MAX_SIZE = 5 * 1024 * 1024  # 5 MB
CHUNK = 1024 * 1024

# extensão -> tipo de conteúdo esperado pela assinatura (magic bytes)
_EXT_TIPO = {
    ".pdf": "pdf",
    ".jpg": "jpeg", ".jpeg": "jpeg",
    ".png": "png",
    ".bmp": "bmp",
    ".tif": "tiff", ".tiff": "tiff",
    ".webp": "webp",
}
_MIME_TIPO = {
    "application/pdf": "pdf",
    "image/jpeg": "jpeg", "image/jpg": "jpeg",
    "image/png": "png",
    "image/bmp": "bmp",
    "image/tiff": "tiff",
    "image/webp": "webp",
}


def _tipo_pela_assinatura(d: bytes) -> str | None:
    if d.startswith(b"%PDF"):
        return "pdf"
    if d.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"
    if d.startswith(b"\xff\xd8\xff"):
        return "jpeg"
    if d.startswith(b"BM"):
        return "bmp"
    if d.startswith(b"II*\x00") or d.startswith(b"MM\x00*"):
        return "tiff"
    if d[:4] == b"RIFF" and d[8:12] == b"WEBP":
        return "webp"
    return None


def validar_documento(dados: bytes, filename: str, content_type: str | None) -> str:
    """Valida tamanho e formato. Retorna o tipo detectado ou levanta HTTPException."""
    if not dados:
        raise HTTPException(422, "Arquivo vazio.")
    if len(dados) > MAX_SIZE:
        raise HTTPException(
            413, f"Arquivo muito grande. Máximo permitido: 5 MB (recebido: {len(dados) / 1024 / 1024:.2f} MB)."
        )

    msg_formato = "Formato não suportado. Envie uma foto (JPG, PNG, BMP, TIFF, WebP) ou um PDF de até 5 MB."

    ext = os.path.splitext(filename or "")[1].lower()
    if ext not in _EXT_TIPO:
        raise HTTPException(422, msg_formato)

    tipo = _tipo_pela_assinatura(dados)
    if tipo is None:
        raise HTTPException(422, msg_formato)

    # extensão/assinatura divergentes => arquivo renomeado ou corrompido
    if _EXT_TIPO[ext] != tipo:
        raise HTTPException(422, f"O conteúdo do arquivo ({tipo.upper()}) não corresponde à extensão '{ext}'.")

    mime = (content_type or "").split(";")[0].strip().lower()
    if mime and mime not in ("application/octet-stream",) and _MIME_TIPO.get(mime) not in (None, tipo):
        raise HTTPException(422, "O tipo de conteúdo informado não corresponde ao arquivo enviado.")
    if mime and mime not in _MIME_TIPO and mime != "application/octet-stream":
        raise HTTPException(422, msg_formato)

    return tipo


# ── EasyOCR: carregado só quando um documento válido chega ────────────────────
_lock = threading.Lock()
_processar = None
_ErroLeitura = None


def _carregar_easyocr():
    global _processar, _ErroLeitura
    with _lock:
        if _processar is None:
            easyocr_dir = os.path.abspath(
                os.path.join(os.path.dirname(__file__), "..", "..", "..", "easyocr")
            )
            if easyocr_dir not in sys.path:
                sys.path.insert(0, easyocr_dir)
            os.makedirs(os.path.join(easyocr_dir, "logs"), exist_ok=True)
            from functions.loading import ErroLeitura
            from functions.pipeline import processar_documento
            _processar, _ErroLeitura = processar_documento, ErroLeitura
    return _processar, _ErroLeitura


def _executar(dados: bytes, nome: str):
    processar, erro_leitura = _carregar_easyocr()
    try:
        return processar(dados, nome)
    except erro_leitura as e:
        raise HTTPException(e.status, e.mensagem)


@router.post("/upload")
async def ocr_upload(file: UploadFile = File(...)):
    # lê no máximo 5 MB + 1 byte (não carrega arquivos gigantes na memória)
    dados = await file.read(MAX_SIZE + 1)

    validar_documento(dados, file.filename or "", file.content_type)   # <- antes do OCR

    t0 = time.perf_counter()
    try:
        insumos, alertas = await run_in_threadpool(_executar, dados, file.filename or "upload")
    except HTTPException:
        raise
    except Exception:
        log.exception("Falha ao executar OCR")
        raise HTTPException(500, "Erro interno ao processar o documento.")

    def _json(m) -> dict:
        # Pydantic v2: model_dump | v1: json() -> dict (serializa date corretamente)
        if hasattr(m, "model_dump"):
            return m.model_dump(mode="json")
        return json.loads(m.json())

    return {
        "tempo_de_processamento": round(time.perf_counter() - t0, 2),
        "insumos": [_json(i) for i in insumos],
        "alertas": [_json(a) for a in alertas],
    }
