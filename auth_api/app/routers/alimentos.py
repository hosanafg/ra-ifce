"""Router: alimentos, fornecedores, cardápio, desperdício e stats."""
from datetime import date, datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.models import Alimento, CardapioItem, Fornecedor, LogDesperdicio, Receita
from app.db.session import get_db
from app.schemas.alimento import (
    AlimentoIn, AlimentoOut,
    CardapioItemIn, CardapioItemOut, CardapioItemUpdate,
    DesperdicioPorDia,
    FornecedorIn, FornecedorOut,
    LogDesperdicioIn, LogDesperdicioOut,
    ReceitaIn, ReceitaOut,
    StatsOut,
)

router = APIRouter(tags=["alimentos"])

# Unidade de peso armazenada: apenas "kg" ou "L" (converte g/mg/ml se necessário)
_UNIDADES = {
    "kg": (1, "kg"), "g": (0.001, "kg"), "gr": (0.001, "kg"), "mg": (0.000001, "kg"),
    "l": (1, "L"), "lt": (1, "L"), "ml": (0.001, "L"),
}


def _normalizar_peso(dados: dict) -> dict:
    un = (dados.get("peso_unidade") or "").strip().lower()
    if un:
        if un not in _UNIDADES:
            raise HTTPException(status_code=422, detail="Unidade inválida. Use kg ou L.")
        fator, final = _UNIDADES[un]
        if dados.get("peso_valor") is not None:
            dados["peso_valor"] = round(dados["peso_valor"] * fator, 3)
        dados["peso_unidade"] = final
    return dados


# ── Receitas ──────────────────────────────────────────────────────────────────

@router.get("/receitas", response_model=List[ReceitaOut])
def listar_receitas(db: Session = Depends(get_db)):
    return db.query(Receita).order_by(Receita.id.desc()).all()


@router.post("/receitas", response_model=ReceitaOut, status_code=201)
def criar_receita(body: ReceitaIn, db: Session = Depends(get_db)):
    if body.refeicao not in ("cafe", "almoco", "lanche", "jantar"):
        raise HTTPException(status_code=422, detail="Refeição inválida.")
    obj = Receita(nome=body.nome.strip(), refeicao=body.refeicao, data=body.data)
    db.add(obj)
    if body.data:   # a receita aparece no calendário do dia
        db.add(CardapioItem(data=body.data, tipo_refeicao=body.refeicao, descricao=obj.nome))
    db.commit()
    db.refresh(obj)
    return obj


# ── Fornecedores ──────────────────────────────────────────────────────────────

@router.get("/fornecedores", response_model=List[FornecedorOut])
def listar_fornecedores(db: Session = Depends(get_db)):
    return db.query(Fornecedor).all()


@router.post("/fornecedores", response_model=FornecedorOut, status_code=201)
def criar_fornecedor(body: FornecedorIn, db: Session = Depends(get_db)):
    existente = db.query(Fornecedor).filter(Fornecedor.nome == body.nome).first()
    if existente:
        raise HTTPException(status_code=409, detail="Fornecedor com esse nome já existe.")
    obj = Fornecedor(nome=body.nome)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


# ── Alimentos ─────────────────────────────────────────────────────────────────

@router.get("/alimentos", response_model=List[AlimentoOut])
def listar_alimentos(db: Session = Depends(get_db)):
    return db.query(Alimento).all()


@router.post("/alimentos", response_model=AlimentoOut, status_code=201)
def criar_alimento(body: AlimentoIn, db: Session = Depends(get_db)):
    obj = Alimento(**_normalizar_peso(body.dict()))
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.put("/alimentos/{alimento_id}", response_model=AlimentoOut)
def atualizar_alimento(alimento_id: int, body: AlimentoIn, db: Session = Depends(get_db)):
    obj = db.query(Alimento).filter(Alimento.id == alimento_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Alimento não encontrado.")
    for field, value in _normalizar_peso(body.dict(exclude_unset=True)).items():
        setattr(obj, field, value)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/alimentos/{alimento_id}", status_code=204)
def remover_alimento(alimento_id: int, db: Session = Depends(get_db)):
    obj = db.query(Alimento).filter(Alimento.id == alimento_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Alimento não encontrado.")
    db.delete(obj)
    db.commit()


# ── Cardápio ──────────────────────────────────────────────────────────────────

@router.get("/cardapio", response_model=List[CardapioItemOut])
def listar_cardapio(
    data_inicio: Optional[date] = None,
    data_fim: Optional[date] = None,
    db: Session = Depends(get_db),
):
    q = db.query(CardapioItem)
    if data_inicio:
        q = q.filter(CardapioItem.data >= data_inicio)
    if data_fim:
        q = q.filter(CardapioItem.data <= data_fim)
    return q.order_by(CardapioItem.data).all()


@router.post("/cardapio", response_model=CardapioItemOut, status_code=201)
def criar_cardapio_item(body: CardapioItemIn, db: Session = Depends(get_db)):
    obj = CardapioItem(**body.dict())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.put("/cardapio/{item_id}", response_model=CardapioItemOut)
def atualizar_cardapio_item(item_id: int, body: CardapioItemUpdate, db: Session = Depends(get_db)):
    obj = db.query(CardapioItem).filter(CardapioItem.id == item_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Item de cardápio não encontrado.")
    for field, value in body.dict(exclude_unset=True).items():
        if value is not None:
            setattr(obj, field, value)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/cardapio/{item_id}", status_code=204)
def remover_cardapio_item(item_id: int, db: Session = Depends(get_db)):
    obj = db.query(CardapioItem).filter(CardapioItem.id == item_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Item de cardápio não encontrado.")
    db.delete(obj)
    db.commit()


# ── Log de Desperdício ────────────────────────────────────────────────────────

@router.post("/desperdicio", response_model=LogDesperdicioOut, status_code=201)
def logar_desperdicio(body: LogDesperdicioIn, db: Session = Depends(get_db)):
    obj = LogDesperdicio(**body.dict())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


# ── Stats ─────────────────────────────────────────────────────────────────────

@router.get("/stats", response_model=StatsOut)
def stats(db: Session = Depends(get_db)):
    hoje = date.today()
    limite_vencimento = date.fromordinal(hoje.toordinal() + 7)
    limite_desperdicio = date.fromordinal(hoje.toordinal() - 30)

    # Alimentos vencendo nos próximos 7 dias
    vencimento_proximo = (
        db.query(Alimento)
        .filter(Alimento.data_vencimento != None)
        .filter(Alimento.data_vencimento >= hoje)
        .filter(Alimento.data_vencimento <= limite_vencimento)
        .all()
    )

    # Total de desperdício nos últimos 30 dias
    total_row = (
        db.query(func.sum(LogDesperdicio.quantidade_kg))
        .filter(LogDesperdicio.data >= limite_desperdicio)
        .scalar()
    )
    total_desperdicio_kg = float(total_row or 0.0)

    # Desperdício agrupado por dia
    rows = (
        db.query(LogDesperdicio.data, func.sum(LogDesperdicio.quantidade_kg))
        .filter(LogDesperdicio.data >= limite_desperdicio)
        .group_by(LogDesperdicio.data)
        .order_by(LogDesperdicio.data)
        .all()
    )
    desperdicio_por_dia = [DesperdicioPorDia(data=r[0], kg=float(r[1])) for r in rows]

    return StatsOut(
        vencimento_proximo=vencimento_proximo,
        total_desperdicio_kg=total_desperdicio_kg,
        desperdicio_por_dia=desperdicio_por_dia,
    )


