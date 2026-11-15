"""Router: OCR — valida e processa upload de documentos."""
import os
import sys
import time
import easyocr

from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import JSONResponse

# ── Importa easyocr via sys.path ──────────────────────────────────────────────
_easyocr_dir = os.path.abspath(
    os.path.join(os.path.dirname(__file__), '..', '..', '..', 'easyocr')
)
if _easyocr_dir not in sys.path:
    sys.path.insert(0, _easyocr_dir)

from functions.pipeline import processar_documento  # noqa: E402
from functions.loading import ErroLeitura           # noqa: E402
from functions.pydantic_functions import ResponseExtracao  # noqa: E402

router = APIRouter(prefix="/ocr", tags=["ocr"])

MAX_SIZE = 5 * 1024 * 1024  # 5 MB

# Magic bytes para formatos aceitos
_MAGIC_SIGNATURES = [
    b"%PDF",           # PDF
    b"\x89PNG",        # PNG
    b"\xff\xd8\xff",   # JPEG
    b"BM",             # BMP
    b"II*\x00",        # TIFF little-endian
    b"MM\x00*",        # TIFF big-endian
    b"RIFF",           # WebP / RIFF
]


def _formato_valido(dados: bytes) -> bool:
    for sig in _MAGIC_SIGNATURES:
        if dados[:len(sig)] == sig:
            return True
    return False


@router.post("/upload")
async def ocr_upload(file: UploadFile = File(...)):
    dados = await file.read()

    # Validação de tamanho
    if len(dados) > MAX_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"Arquivo muito grande. Máximo permitido: 5 MB (recebido: {len(dados) / 1024 / 1024:.2f} MB).",
        )

    # Validação de formato
    if not _formato_valido(dados):
        raise HTTPException(
            status_code=422,
            detail=(
                "Formato de arquivo não suportado. "
                "Envie um PDF ou imagem (JPEG, PNG, BMP, TIFF, WebP)."
            ),
        )

    try:
        t0 = time.perf_counter()
        insumos, alertas = processar_documento(dados, file.filename or "upload")
        elapsed = time.perf_counter() - t0
        return ResponseExtracao(
            tempo_de_processamento=elapsed,
            insumos=insumos,
            alertas=alertas,
        )
    except ErroLeitura as e:
        raise HTTPException(status_code=e.status, detail=e.mensagem)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro interno ao processar documento: {e}")
