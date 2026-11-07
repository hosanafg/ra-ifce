"""Ponto de entrada. Rodar a partir da pasta auth_api:  uvicorn app.main:app --reload"""
import logging
 
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
 
from app.core.exceptions import AuthError
from app.db import models  # noqa: F401  (registra os modelos antes do create_all)
from app.db.session import Base, engine
from app.routers import login, signup
 
logging.basicConfig(level=logging.INFO)
Base.metadata.create_all(engine)
app = FastAPI(title="Auth API")
  
@app.exception_handler(AuthError)
async def auth_error_handler(_: Request, exc: AuthError):
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})
  
app.include_router(login.router)
app.include_router(signup.router)