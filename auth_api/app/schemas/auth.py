"""Modelos Pydantic de entrada."""
from pydantic import BaseModel
  
class EmailIn(BaseModel):
    email: str
  
class LoginPasswordIn(BaseModel):
    login_token: str
    password: str
  
class SignupStartIn(BaseModel):
    email: str
    password: str
  
class SignupVerifyIn(BaseModel):
    email: str
    code: str