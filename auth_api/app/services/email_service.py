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


def send_reset_email(to: str, token: str, frontend_url: str = "http://localhost:5173") -> None:
    """Envia o link de redefinição de senha."""
    link = f"{frontend_url}/nova-senha?token={token}"
    if not config.SMTP_HOST:
        log.info("[DEV] Link de recuperação para %s: %s", to, link)
        return
    msg = EmailMessage()
    msg["Subject"] = "Redefinição de senha"
    msg["From"] = config.SMTP_FROM
    msg["To"] = to
    msg.set_content(
        f"Clique no link abaixo para redefinir sua senha:\n\n{link}\n\n"
        f"O link expira em {config.RESET_TOKEN_TTL // 60} minutos.\n"
        "Se você não solicitou isso, ignore este e-mail."
    )
    with smtplib.SMTP(config.SMTP_HOST, config.SMTP_PORT) as s:
        s.starttls()
        s.login(config.SMTP_USER, config.SMTP_PASSWORD)
        s.send_message(msg)