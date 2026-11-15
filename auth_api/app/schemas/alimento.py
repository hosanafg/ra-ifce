from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel

# ── Fornecedor ────────────────────────────────────────────────────────────────

class FornecedorIn(BaseModel):
    nome: str

class FornecedorOut(BaseModel):
    id: int
    nome: str
    class Config:
        orm_mode = True


# ── Alimento ──────────────────────────────────────────────────────────────────

class AlimentoIn(BaseModel):
    nome: str
    fornecedor_id: Optional[int] = None
    peso_valor: Optional[float] = None
    peso_unidade: Optional[str] = None
    quantidade: Optional[int] = None
    data_vencimento: Optional[date] = None
    revisar: Optional[bool] = False

class AlimentoOut(AlimentoIn):
    id: int
    created_at: datetime

    class Config:
        orm_mode = True

# ── Cardápio ──────────────────────────────────────────────────────────────────

class CardapioItemIn(BaseModel):
    data: date
    tipo_refeicao: str  # "cafe", "almoco", "jantar", "lanche"
    descricao: str

class CardapioItemUpdate(BaseModel):
    """Schema para atualização parcial — apenas descricao obrigatória."""
    descricao: str
    data: Optional[date] = None
    tipo_refeicao: Optional[str] = None


class CardapioItemOut(CardapioItemIn):
    id: int
    class Config:
        orm_mode = True

# ── Log de Desperdício ────────────────────────────────────────────────────────

class LogDesperdicioIn(BaseModel):
    alimento_id: Optional[int] = None
    descricao: str
    quantidade_kg: float
    data: date

class LogDesperdicioOut(LogDesperdicioIn):
    id: int
    class Config:
        orm_mode=True

# ── Stats ─────────────────────────────────────────────────────────────────────

class DesperdicioPorDia(BaseModel):
    data: date
    kg: float

class StatsOut(BaseModel):
    vencimento_proximo: List[AlimentoOut]
    total_desperdicio_kg: float
    desperdicio_por_dia: List[DesperdicioPorDia]
