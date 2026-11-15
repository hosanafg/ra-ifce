"""Ponto de entrada. Rodar a partir da pasta auth_api:  uvicorn app.main:app --reload"""
import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.exceptions import AuthError
from app.db import models  # noqa: F401  (registra os modelos antes do create_all)
from app.db.session import Base, engine
from app.routers import login, signup, reset, alimentos, ocr

logging.basicConfig(level=logging.INFO)
Base.metadata.create_all(engine)
app = FastAPI(title="Auth API")

# ── CORS ──────────────────────────────────────────────────────────────────────
# Em produção, substitua "*" pela(s) origin(s) exata(s) do frontend.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(AuthError)
async def auth_error_handler(_: Request, exc: AuthError):
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})

app.include_router(login.router)
app.include_router(signup.router)
app.include_router(reset.router)
app.include_router(alimentos.router)
app.include_router(ocr.router)