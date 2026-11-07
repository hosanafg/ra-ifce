from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
 
from app.db.session import get_db
from app.schemas.auth import EmailIn, LoginPasswordIn
from app.services import login_service
 
router = APIRouter(prefix="/auth/login", tags=["login"])
 
@router.post("/email")
def login_email(body: EmailIn, db: Session = Depends(get_db)):
    return login_service.start_login(db, body.email)
  
@router.post("/password")
def login_password(body: LoginPasswordIn, db: Session = Depends(get_db)):
    return login_service.check_password(db, body.login_token, body.password)