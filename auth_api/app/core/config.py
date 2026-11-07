"""Configurações centralizadas (lidas de variáveis de ambiente)."""
import os
 
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./app.db")
PEPPER = os.getenv("PEPPER", "dev-pepper-troque-em-producao")  # segredo fora do banco
REDIS_URL = os.getenv("REDIS_URL")  # vazio => cache em memória
 
# Login
MAX_LOGIN_ATTEMPTS = 5      # tentativas de senha antes de voltar ao e-mail
LOCK_MINUTES = 15           # bloqueio da conta após esgotar as tentativas
LOGIN_SESSION_TTL = 300     # s, entre a etapa do e-mail e a da senha
 
# Criação de conta
CODE_TTL = 600              # s, validade do código de verificação
MAX_CODE_ATTEMPTS = 5

SMTP_HOST = os.getenv("SMTP_HOST")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM = os.getenv("SMTP_FROM", "no-reply@example.com")