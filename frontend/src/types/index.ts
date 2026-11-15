export interface Fornecedor {
  id: number
  nome: string
}

export interface Alimento {
  id: number
  nome: string
  fornecedor_id?: number
  peso_valor?: number
  peso_unidade?: string
  quantidade?: number
  data_vencimento?: string
  revisar?: boolean
  created_at: string
}

export interface CardapioItem {
  id: number
  data: string
  tipo_refeicao: string
  descricao: string
}

export interface Stats {
  vencimento_proximo: Alimento[]
  total_desperdicio_kg: number
  desperdicio_por_dia: { data: string; kg: number }[]
}

export interface OcrInsumo {
  ingrediente?: string
  peso_valor?: number
  peso_unidade?: string
  quantidade?: number
  data_vencimento?: string
  revisar: boolean
  confianca: number
}

export interface OcrResponse {
  insumos: OcrInsumo[]
  alertas: string[]
}
