export interface Fornecedor {
  id: number
  nome: string
}

export interface Alimento {
  id: number
  nome: string
  fornecedor_id?: number
  receita_id?: number
  peso_valor?: number
  peso_unidade?: string
  quantidade?: number
  data_vencimento?: string
  revisar?: boolean
  extras?: Record<string, string> | null
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
  ingrediente?: string | null
  peso_valor?: number | null
  peso_unidade?: string | null
  quantidade?: number | null
  data_vencimento?: string | null
  revisar: boolean
  confianca: number
  fornecedor?: string | null
  refeicao?: string | null
  receita?: string | null
  extras?: Record<string, string> | null
  texto_original?: string
}

export interface OcrAlerta {
  codigo: string
  mensagem: string
  pagina?: number | null
}

export interface OcrResponse {
  tempo_de_processamento: number
  insumos: OcrInsumo[]
  alertas: OcrAlerta[]
}

export interface Receita {
  id: number
  nome: string
  refeicao: string
  data?: string | null
}

