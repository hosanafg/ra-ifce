from fastapi import APIRouter, BackgroundTasks, Depends
from sqlalchemy.orm import Session

from app.core.config import RESET_TOKEN_TTL
from app.db.session import get_db
from app.schemas.reset import ResetConfirmIn, ResetRequestIn
from app.services import reset_service
from app.services.email_service import send_reset_email

router = APIRouter(prefix="/auth/reset", tags=["reset"])


@router.post("/request", status_code=202)
def request_reset(body: ResetRequestIn, tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Solicita o link de redefinição de senha.

    Sempre retorna 202 (mesmo que o e-mail não exista) para não enumerar contas.
    """
    token = reset_service.request_reset(db, body.email)
    if token:
        tasks.add_task(send_reset_email, body.email, token)
    return {
        "detail": "Se este e-mail estiver cadastrado, você receberá as instruções em breve.",
        "expires_in": RESET_TOKEN_TTL,
    }


@router.post("/confirm", status_code=200)
def confirm_reset(body: ResetConfirmIn, db: Session = Depends(get_db)):
    """Redefine a senha usando o token recebido por e-mail."""
    reset_service.confirm_reset(db, body.token, body.new_password)
    return {"detail": "Senha redefinida com sucesso."}
