from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel

# LEITURA_VAZIA | ARQUIVO_CORROMPIDO | FORMATO_NAO_SUPORTADO | BAIXA_CONFIANCA | CAMPO_NAO_ENCONTRADO
class Alerta(BaseModel):
    mensagem: str
    codigo: str            
    pagina: Optional[int] = None

class InsumoExtraido(BaseModel):
    ingrediente: Optional[str] = None
    peso_valor: Optional[float] = None
    peso_unidade: Optional[str] = None      # g, kg, ml, l...
    quantidade: Optional[int] = None
    data_vencimento: Optional[date] = None
    confianca: float = 0.0
    revisar: bool = False                  
    texto_original: str = ""

class ResponseExtracao(BaseModel):
    tempo_de_processamento: float
    insumos: List[InsumoExtraido]
    alertas: List[Alerta]