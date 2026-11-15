"""Serviço de recuperação de senha.

Fluxo:
  1. POST /auth/reset/request  → gera token, envia e-mail
  2. POST /auth/reset/confirm  → valida token e grava nova senha
"""
import secrets
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.cache.cache import cache
from app.core import config
from app.core.exceptions import AuthError
from app.core.security import hash_password
from app.db.models import User
from app.validators.email import normalize_email


def request_reset(db: Session, raw_email: str) -> str:
    """Etapa 1 — verifica se o e-mail existe e gera um token de reset.

    Retorna o token (para o router repassar ao email_service).
    Nunca revela se o e-mail está ou não cadastrado (evita enumeração).
    """
    email = normalize_email(raw_email)
    user = db.scalar(select(User).where(User.email == email))

    # Mesmo que o e-mail não exista, retornamos 202 para não enumerar contas.
    # O token só é criado quando o usuário realmente existe.
    if not user:
        return ""   # router envia e-mail fake / não envia nada

    token = secrets.token_urlsafe(48)
    cache.set(f"reset:{token}", {"email": email}, config.RESET_TOKEN_TTL)
    return token


def confirm_reset(db: Session, token: str, new_password: str) -> None:
    """Etapa 2 — valida o token e redefine a senha."""
    key = f"reset:{token}"
    session = cache.get(key)

    if not session:
        raise AuthError(400, "Link de recuperação inválido ou expirado.")

    email = session["email"]
    user = db.scalar(select(User).where(User.email == email))

    if not user:
        raise AuthError(404, "Usuário não encontrado.")

    user.password_hash = hash_password(new_password)
    user.failed_attempts = 0
    user.locked_until = None
    db.commit()
    cache.delete(key)
