"""Normalização e validação de e-mail."""
import re
from app.core.exceptions import AuthError

EMAIL_RE = re.compile(
    r"^[a-z0-9]+(?:[._-][a-z0-9]+)*@(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$"
)
 
def normalize_email(email: str) -> str:
    return email.strip().lower()
 
def assert_valid_email(email: str) -> None:
    if len(email) > 254 or not EMAIL_RE.match(email):
        raise AuthError(422, "E-mail inválido.")