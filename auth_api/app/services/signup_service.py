"""Regras da criação de conta (cadastro pendente no cache + código por e-mail)."""
import hmac
import secrets
 
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
 
from app.cache.cache import cache
from app.core import config
from app.core.exceptions import AuthError
from app.core.security import hash_code, hash_password
from app.db.models import User
from app.validators.email import assert_valid_email, normalize_email
 
def _new_code() -> str:
    return f"{secrets.randbelow(10**6):06d}"
  
def _email_exists(db: Session, email: str) -> bool:
    return db.scalar(select(User.id).where(User.email == email)) is not None
 
def validate_email(db: Session, raw_email: str) -> dict:
    email = normalize_email(raw_email)
    assert_valid_email(email)

    if _email_exists(db, email):
        raise AuthError(409, "Este e-mail já está cadastrado.")
    
    return {
        "valid": True
    }
  
def start_signup(db: Session, raw_email: str, password: str) -> tuple[str, str]:
    """Guarda o cadastro como PENDENTE no cache. Retorna (email, código) para envio."""
    email = normalize_email(raw_email)
    assert_valid_email(email)
    if not password:
        raise AuthError(422, "Senha obrigatória.")
    
    if _email_exists(db, email):
        raise AuthError(409, "Este e-mail já está cadastrado.")
 
    code = _new_code()
    # Chave = e-mail: repetir a chamada (retry/queda de conexão) sobrescreve o
    # pendente em vez de criar outro registro.
    cache.set(
        f"signup:{email}",
        {
            "password_hash": hash_password(password), 
            "code_hash": hash_code(email, code), 
            "attempts": 0
        },
        
        config.CODE_TTL,
    )
    
    return email, code
  
def resend_code(raw_email: str) -> tuple[str, str]:
    email = normalize_email(raw_email)
    pending = cache.get(f"signup:{email}")
    
    if not pending:
        raise AuthError(410, "Cadastro expirado. Reinicie a criação de conta.")
    
    code = _new_code()
    pending.update(code_hash=hash_code(email, code), attempts=0)
    
    cache.set(f"signup:{email}", pending, config.CODE_TTL)
    return email, code
 
def verify_signup(db: Session, raw_email: str, code: str) -> dict:
    """Valida o código e grava o usuário no banco (idempotente)."""
    email = normalize_email(raw_email)
    key = f"signup:{email}"
 
    pending = cache.get(key)
    if not pending:
        # Retry após queda de conexão: a conta já pode ter sido criada.
        if cache.get(f"signup_done:{email}"):

            return {
                "status": "created", 
                "email": email, 
                "already_created": True
            }
        
        raise AuthError(410, "Código expirado. Reinicie a criação de conta.")
 
    if pending["attempts"] >= config.MAX_CODE_ATTEMPTS:
        cache.delete(key)
        raise AuthError(429, "Muitas tentativas. Reinicie a criação de conta.")
 
    if not hmac.compare_digest(pending["code_hash"], hash_code(email, code.strip())):
        pending["attempts"] += 1
        cache.set(key, pending, config.CODE_TTL)
        raise AuthError(400, "Código inválido.")
 
    already = False
    try:
        db.add(User(email=email, password_hash=pending["password_hash"]))
        db.commit()

    except IntegrityError:
        db.rollback()
        already = True  # outra tentativa já gravou: trata como sucesso

    cache.set(f"signup_done:{email}", {"ok": True}, config.CODE_TTL)
    cache.delete(key)
    return {
        "status": "created", 
        "email": email, 
        "already_created": already
    }