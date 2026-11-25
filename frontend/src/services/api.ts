import type {
  AlimentoRequest,
  AlimentoResponse,
  AlterarUsuarioRequest,
  AvaliacaoRequest,
  CardapioRequest,
  CardapioResponse,
  DisponibilidadeResponse,
  EntradaRequest,
  EntradaResponse,
  EstoqueResumo,
  InsumoResponse,
  ItemCardapioResponse,
  LoginRequest,
  NotaRetiradaResponse,
  PratoRequest,
  PratoResponse,
  RegistroRequest,
  ResumoAvaliacao,
  TokenResponse,
  UsuarioResponse,
} from '../types'

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') || ''

export const TOKEN_KEY = 'cozinha_token'
export const USER_KEY = 'cozinha_user'
export const ADMIN_BACKUP_TOKEN_KEY = 'cozinha_admin_backup_token'
export const ADMIN_BACKUP_USER_KEY = 'cozinha_admin_backup_user'

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem(TOKEN_KEY)
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  })

  if (!res.ok) {
    let msg = `Erro ${res.status}`
    try {
      const data = await res.json()
      if (typeof data?.erro === 'string') msg = data.erro
      else if (typeof data?.mensagem === 'string') msg = data.mensagem
      else if (typeof data?.message === 'string') msg = data.message
      else if (typeof data?.detail === 'string') msg = data.detail
      else if (Array.isArray(data?.erros)) msg = data.erros.join('; ')
    } catch {
      /* ignore parse error */
    }
    throw new Error(msg)
  }

  if (res.status === 204) {
    return undefined as T
  }
  return res.json() as Promise<T>
}

// ---- Auth ----
export const loginApi = (body: LoginRequest) =>
  request<TokenResponse>('/api/auth/login', { method: 'POST', body: JSON.stringify(body) })

export const registrarApi = (body: RegistroRequest) =>
  request<UsuarioResponse>('/api/auth/registrar', { method: 'POST', body: JSON.stringify(body) })

export const euApi = () => request<UsuarioResponse>('/api/auth/eu')

// ---- Público ----
export const cardapioHojeApi = () => request<ItemCardapioResponse[]>('/api/publico/cardapio-hoje')

export const avaliarPratoApi = (body: AvaliacaoRequest) =>
  request<{ mensagem: string }>('/api/publico/avaliacoes', {
    method: 'POST',
    body: JSON.stringify(body),
  })

// ---- Admin Usuários ----
export const listarUsuariosApi = () => request<UsuarioResponse[]>('/api/admin/usuarios')

export const criarUsuarioApi = (body: RegistroRequest) =>
  request<UsuarioResponse>('/api/admin/usuarios', { method: 'POST', body: JSON.stringify(body) })

export const atualizarUsuarioApi = (id: number, body: AlterarUsuarioRequest) =>
  request<UsuarioResponse>(`/api/admin/usuarios/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })

export const desativarUsuarioApi = (id: number) =>
  request<void>(`/api/admin/usuarios/${id}`, { method: 'DELETE' })

export const tokenSuporteApi = (id: number) =>
  request<TokenResponse>(`/api/admin/usuarios/${id}/token-suporte`, { method: 'POST' })

// ---- Alimentos & Estoque ----
export const listarAlimentosApi = () => request<AlimentoResponse[]>('/api/alimentos')

export const criarAlimentoApi = (body: AlimentoRequest) =>
  request<AlimentoResponse>('/api/alimentos', { method: 'POST', body: JSON.stringify(body) })

export const registrarEntradaApi = (body: EntradaRequest) =>
  request<EntradaResponse>('/api/estoque/entradas', { method: 'POST', body: JSON.stringify(body) })

export const resumoEstoqueApi = () => request<EstoqueResumo[]>('/api/estoque/resumo')

export const listarInsumosApi = () => request<InsumoResponse[]>('/api/estoque/insumos')

// ---- Pratos ----
export const listarPratosApi = () => request<PratoResponse[]>('/api/pratos')

export const criarPratoApi = (body: PratoRequest) =>
  request<PratoResponse>('/api/pratos', { method: 'POST', body: JSON.stringify(body) })

export const pratosDisponiveisApi = (pesoKg = 1) =>
  request<PratoResponse[]>(`/api/pratos/disponiveis?pesoKg=${pesoKg}`)

export const disponibilidadePratoApi = (id: number, pesoKg = 1) =>
  request<DisponibilidadeResponse>(`/api/pratos/${id}/disponibilidade?pesoKg=${pesoKg}`)

// ---- Cardápios ----
export const listarCardapiosApi = () => request<CardapioResponse[]>('/api/cardapios')

export const criarCardapioApi = (body: CardapioRequest) =>
  request<CardapioResponse>('/api/cardapios', { method: 'POST', body: JSON.stringify(body) })

export const avaliacoesCardapioApi = (id: number) =>
  request<ResumoAvaliacao[]>(`/api/cardapios/${id}/avaliacoes`)

// ---- Retiradas ----
export const gerarRetiradaApi = (cardapioId: number) =>
  request<NotaRetiradaResponse>(`/api/retiradas/cardapio/${cardapioId}`, { method: 'POST' })

export const buscarRetiradaApi = (id: number) =>
  request<NotaRetiradaResponse>(`/api/retiradas/${id}`)

export const editarItemRetiradaApi = (id: number, itemId: number, quantidade: number) =>
  request<NotaRetiradaResponse>(`/api/retiradas/${id}/itens/${itemId}`, {
    method: 'PUT',
    body: JSON.stringify({ quantidade }),
  })

export const confirmarRetiradaApi = (id: number) =>
  request<NotaRetiradaResponse>(`/api/retiradas/${id}/confirmar`, { method: 'POST' })
