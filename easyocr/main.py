import asyncio
import logging
import traceback
import uuid
from datetime import datetime
from typing import Optional

from fastapi import FastAPI, File, UploadFile, HTTPException, Header, Depends
from fastapi.concurrency import run_in_threadpool

from functions.logs import configurar_logs      
configurar_logs()
                            
import CONFIG
from functions.loading import ErroLeitura
from functions.pipeline import processar_documento
from functions.pydantic_functions import ResponseExtracao

tempo_de_inicializacao = datetime.now()
app = FastAPI(title="API de Extração OCR")
semaforo = asyncio.Semaphore(CONFIG.MAX_OCR_SIMULTANEOS)

def verificar_token(x_api_token: Optional[str] = Header(default=None)):
    if CONFIG.API_TOKEN and x_api_token != CONFIG.API_TOKEN:
        raise HTTPException(status_code=401,
                            detail={"codigo": "NAO_AUTORIZADO", "mensagem": "Token inválido."})

@app.get("/health")
def health():
    return {"status": "ok", "no_ar_ha": str(datetime.now() - tempo_de_inicializacao)}

@app.post("/document_extraction/", response_model=ResponseExtracao,
          dependencies=[Depends(verificar_token)])
async def document_extraction(
    arquivo: UploadFile = File(...),
    x_correlation_id: Optional[str] = Header(default=None),
):
    cid = x_correlation_id or uuid.uuid4().hex[:8]
    logging.info(f"[{cid}] ---- DOCUMENT-EXTRACTION | arquivo={arquivo.filename}")
    inicio = datetime.now()

    try:
        dados = await arquivo.read()
        if len(dados) > CONFIG.MAX_FILE_SIZE * 1024 * 1024:
            raise ErroLeitura("ARQUIVO_MUITO_GRANDE",
                              f"Arquivo acima de {CONFIG.MAX_UPLOAD_MB} MB.", status=413)

        async with semaforo:                       # limita OCRs simultâneos
            insumos, alertas = await run_in_threadpool(
                processar_documento, dados, arquivo.filename or "documento")

    except ErroLeitura as e:
        logging.error(f"[{cid}] {e.codigo}: {e.mensagem}")
        raise HTTPException(status_code=e.status,
                            detail={"codigo": e.codigo, "mensagem": e.mensagem})
    except HTTPException:
        raise
    except Exception:
        logging.error(f"[{cid}] ERRO_INTERNO:\n{traceback.format_exc()}")
        raise HTTPException(status_code=500,
                            detail={"codigo": "ERRO_INTERNO", "mensagem": "Erro ao processar o documento."})

    tempo = (datetime.now() - inicio).total_seconds()
    logging.info(f"[{cid}] Finalizado: {len(insumos)} insumos, {len(alertas)} alertas, {tempo:.2f}s")
    return ResponseExtracao(tempo_de_processamento=tempo, insumos=insumos, alertas=alertas)