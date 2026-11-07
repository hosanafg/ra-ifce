"""Envio de e-mail. Em dev (sem SMTP_HOST) o código só aparece no log."""
import logging
import smtplib
from email.message import EmailMessage
from app.core import config
 
log = logging.getLogger("auth")
  
def send_code_email(to: str, code: str) -> None:
    if not config.SMTP_HOST:
        log.info("[DEV] Código de verificação para %s: %s", to, code)
        return
    msg = EmailMessage()
    msg["Subject"] = "Seu código de verificação"
    msg["From"] = config.SMTP_FROM
    msg["To"] = to
    msg.set_content(
        f"Seu código de verificação é: {code}\nEle expira em {config.CODE_TTL // 60} minutos."
    )
    with smtplib.SMTP(config.SMTP_HOST, config.SMTP_PORT) as s:
        s.starttls()
        s.login(config.SMTP_USER, config.SMTP_PASSWORD)
        s.send_message(msg)