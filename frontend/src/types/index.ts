export type Papel = 'ADMIN' | 'ESTOQUISTA' | 'NUTRICIONISTA'
export type StatusNota = 'RASCUNHO' | 'RETIRADA'

export interface UsuarioResponse {
  id: number
  login: string
  nome: string
  papel: Papel
  ativo: boolean
}

export interface TokenResponse {
  token: string
  tipo: string
  expiraEmMinutos: number
  usuario: UsuarioResponse
}

export interface RegistroRequest {
  login: string
  senha: string
  nome: string
  papel: Papel
}

export interface LoginRequest {
  login: string
  senha: string
}

export interface AlterarUsuarioRequest {
  nome?: string
  papel?: Papel
  ativo?: boolean
  novaSenha?: string
}

export interface AlimentoRequest {
  nome: string
  unidade?: string
}

export interface AlimentoResponse {
  id: number
  nome: string
  unidade: string
}

export interface ItemEntradaRequest {
  alimentoId?: number | null
  novoAlimento?: AlimentoRequest | null
  quantidade: number
  lote: string
  validade: string
}

export interface EntradaRequest {
  dataEntrada?: string
  itens: ItemEntradaRequest[]
}

export interface InsumoResponse {
  id: number
  alimentoId: number
  alimento: string
  unidade: string
  quantidade: number
  lote: string
  validade: string
  dataEntrada: string
}

export interface EntradaResponse {
  notaId: number
  dataEntrada: string
  insumos: InsumoResponse[]
}

export interface EstoqueResumo {
  alimentoId: number
  alimento: string
  unidade: string
  quantidadeDisponivel: number
}

export interface IngredienteRequest {
  alimentoId: number
  quantidadePorKg: number
}

export interface ReceitaDto {
  modoPreparo: string
  tempoPreparoMinutos?: number | null
  rendimentoPorcoes?: number | null
}

export interface PratoRequest {
  nome: string
  fichaTecnica: IngredienteRequest[]
  receita: ReceitaDto
}

export interface IngredienteResponse {
  alimentoId: number
  alimento: string
  unidade: string
  quantidadePorKg: number
}

export interface PratoResponse {
  id: number
  nome: string
  fichaTecnica: IngredienteResponse[]
  receita: ReceitaDto
}

export interface DisponibilidadeResponse {
  possivel: boolean
  faltas: string[]
}

export interface ItemCardapioRequest {
  pratoId: number
  dia: string
  pesoKg: number
}

export interface CardapioRequest {
  semanaInicio: string
  itens: ItemCardapioRequest[]
}

export interface ItemCardapioResponse {
  id: number
  pratoId: number
  prato: string
  dia: string
  pesoKg: number
}

export interface CardapioResponse {
  id: number
  semanaInicio: string
  criadoPor: string
  itens: ItemCardapioResponse[]
}

export interface ItemRetiradaResponse {
  id: number
  alimentoId: number
  alimento: string
  unidade: string
  quantidade: number
}

export interface NotaRetiradaResponse {
  id: number
  cardapioId: number
  status: StatusNota
  criadaEm: string
  retiradaEm: string | null
  itens: ItemRetiradaResponse[]
}

export interface AvaliacaoRequest {
  itemCardapioId: number
  nomeAvaliador: string
  nota: number
}

export interface ResumoAvaliacao {
  itemCardapioId: number
  prato: string
  dia: string
  media: number
  totalAvaliacoes: number
}
