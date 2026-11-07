"""Hash de senha (bcrypt = salt por usuário + pepper via HMAC) e hash de código."""
import base64
import hashlib
import hmac
 
import bcrypt

from app.core.config import PEPPER
 
def _prehash(password: str) -> bytes:
    """Pepper via HMAC-SHA256. Também evita o limite de 72 bytes do bcrypt."""
    digest = hmac.new(PEPPER.encode(), password.encode(), hashlib.sha256).digest()
    return base64.b64encode(digest)
 
def hash_password(password: str) -> str:
    """bcrypt gera um salt aleatório por senha e o embute no próprio hash."""
    return bcrypt.hashpw(_prehash(password), bcrypt.gensalt(rounds=12)).decode()
 
def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(_prehash(password), password_hash.encode())
  
def hash_code(email: str, code: str) -> str:
    return hmac.new(PEPPER.encode(), f"{email}:{code}".encode(), hashlib.sha256).hexdigest()