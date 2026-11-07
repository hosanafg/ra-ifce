from datetime import datetime, timezone
from typing import Optional
 
from sqlalchemy import DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column
 
from app.db.session import Base
  
class User(Base):
    __tablename__ = "users"
 
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(254), unique=True, index=True)  # unique = trava anti-duplicação
    password_hash: Mapped[str] = mapped_column(String(100))
    failed_attempts: Mapped[int] = mapped_column(Integer, default=0)
    locked_until: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )