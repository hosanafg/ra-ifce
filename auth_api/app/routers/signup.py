from fastapi import APIRouter, BackgroundTasks, Depends
from sqlalchemy.orm import Session
 
from app.core.config import CODE_TTL
from app.db.session import get_db
from app.schemas.auth import EmailIn, SignupStartIn, SignupVerifyIn
from app.services import signup_service
from app.services.email_service import send_code_email
 
router = APIRouter(prefix="/auth/signup", tags=["signup"])
  
@router.post("/validate-email")
def validate_email(body: EmailIn, db: Session = Depends(get_db)):
    return signup_service.validate_email(db, body.email)
  
@router.post("/start", status_code=202)
def start(body: SignupStartIn, tasks: BackgroundTasks, db: Session = Depends(get_db)):
    email, code = signup_service.start_signup(db, body.email, body.password)
    tasks.add_task(send_code_email, email, code)
    return {
        "next_step": "verify_code", 
        "expires_in": CODE_TTL
    }
  
@router.post("/resend", status_code=202)
def resend(body: EmailIn, tasks: BackgroundTasks):
    email, code = signup_service.resend_code(body.email)
    tasks.add_task(send_code_email, email, code)
    return {
        "next_step": "verify_code", 
        "expires_in": CODE_TTL
    }
 
@router.post("/verify", status_code=201)
def verify(body: SignupVerifyIn, db: Session = Depends(get_db)):
    return signup_service.verify_signup(db, body.email, body.code)