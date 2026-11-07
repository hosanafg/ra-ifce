"""Regras do login em duas etapas."""
import secrets
from datetime import datetime, timedelta, timezone
 
from sqlalchemy import select
from sqlalchemy.orm import Session
 
from app.cache.cache import cache
from app.core import config
from app.core.exceptions import AuthError
from app.core.security import verify_password
from app.db.models import User
from app.validators.email import normalize_email
 
def _is_locked(user: User) -> bool:
    return bool(
        user.locked_until
        and user.locked_until.replace(tzinfo=timezone.utc) > datetime.now(timezone.utc)
    )
  
def start_login(db: Session, raw_email: str) -> dict:
    """Etapa 1: confere se o e-mail está cadastrado e abre uma sessão curta."""
    email = normalize_email(raw_email)
    user = db.scalar(select(User).where(User.email == email))

    if not user:
        raise AuthError(404, "E-mail não cadastrado.")
    
    if _is_locked(user):
        raise AuthError(
            423, f"Conta temporariamente bloqueada. Tente novamente em {config.LOCK_MINUTES} minutos."
        )
 
    token = secrets.token_urlsafe(32)

    cache.set(f"login:{token}", {"email": email}, config.LOGIN_SESSION_TTL)
    return {
        "next_step": "password", 
        "login_token": token
    }
 
def check_password(db: Session, login_token: str, password: str) -> dict:
    """Etapa 2: confere a senha e controla tentativas/bloqueio."""
    key = f"login:{login_token}"
    session = cache.get(key)

    if not session:
        raise AuthError(401, {
                                "message": "Sessão expirada. Digite o e-mail novamente.", 
                                "redirect_to": "email"
                                }
        )
 
    user = db.scalar(select(User).where(User.email == session["email"]))
    
    if not user:
        raise AuthError(404,{
                            "message": "E-mail não cadastrado.", 
                            "redirect_to": "email"
                            }
        )
    
    if _is_locked(user):
        cache.delete(key)
        raise AuthError(423, {
                            "message": "Conta temporariamente bloqueada.", 
                            "redirect_to": "email"
                            }
        )
 
    if verify_password(password, user.password_hash):
        user.failed_attempts = 0
        user.locked_until = None
        db.commit()
        cache.delete(key)
       
        return {
            "status": 200, 
            "authenticated": True, 
            "email": user.email
            }
 
    user.failed_attempts += 1
    remaining = config.MAX_LOGIN_ATTEMPTS - user.failed_attempts
    
    if remaining <= 0:
        user.failed_attempts = 0
        user.locked_until = datetime.now(timezone.utc) + timedelta(minutes=config.LOCK_MINUTES)
        
        db.commit()
        cache.delete(key)
        raise AuthError (401, {
                                "message": "Número máximo de tentativas excedido.", 
                                "attempts_remaining": 0, 
                                "redirect_to": "email"
                                },
        )
    
    db.commit()
    raise AuthError (401, {
                            "message": "Senha incorreta.", 
                            "attempts_remaining": remaining
                          }
    )