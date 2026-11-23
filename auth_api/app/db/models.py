from datetime import datetime, timezone, date
from typing import Optional
 
from sqlalchemy import DateTime, Integer, String, Float, Boolean, Date, ForeignKey, JSON
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


class Fornecedor(Base):
    __tablename__ = "fornecedores"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    nome: Mapped[str] = mapped_column(String(200), unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class Receita(Base):
    __tablename__ = "receitas"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    nome: Mapped[str] = mapped_column(String(200))
    refeicao: Mapped[str] = mapped_column(String(50))  # "cafe", "almoco", "lanche", "jantar"
    data: Mapped[Optional[date]] = mapped_column(Date, nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class Alimento(Base):
    __tablename__ = "alimentos"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    nome: Mapped[str] = mapped_column(String(200))
    fornecedor_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("fornecedores.id"), nullable=True)
    receita_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("receitas.id"), nullable=True)
    peso_valor: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    peso_unidade: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    quantidade: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    data_vencimento: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    revisar: Mapped[bool] = mapped_column(Boolean, default=False)
    extras: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)  # campos personalizados (ex.: Marca)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class CardapioItem(Base):
    __tablename__ = "cardapio_items"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    data: Mapped[date] = mapped_column(Date, index=True)
    tipo_refeicao: Mapped[str] = mapped_column(String(50))  # "cafe", "almoco", "jantar", "lanche"
    descricao: Mapped[str] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class LogDesperdicio(Base):
    __tablename__ = "log_desperdicio"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    alimento_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("alimentos.id"), nullable=True)
    descricao: Mapped[str] = mapped_column(String(300))
    quantidade_kg: Mapped[float] = mapped_column(Float, default=0.0)
    data: Mapped[date] = mapped_column(Date, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))