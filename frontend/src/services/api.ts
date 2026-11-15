import type { Alimento, CardapioItem, Fornecedor, OcrResponse, Stats } from '../types'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  const data = await res.json()
  if (!res.ok) throw { status: res.status, detail: data.detail ?? data }
  return data as T
}

/* ── Login em dois passos ── */
export const loginEmail = (email: string) =>
  request<{ next_step: string; login_token: string }>('/auth/login/email', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })

export const loginPassword = (login_token: string, password: string) =>
  request<{ authenticated: boolean; email: string }>('/auth/login/password', {
    method: 'POST',
    body: JSON.stringify({ login_token, password }),
  })

/* ── Cadastro ── */
export const signupValidateEmail = (email: string) =>
  request('/auth/signup/validate-email', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })

export const signupStart = (email: string, password: string) =>
  request<{ next_step: string; expires_in: number }>('/auth/signup/start', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })

export const signupVerify = (email: string, code: string) =>
  request('/auth/signup/verify', {
    method: 'POST',
    body: JSON.stringify({ email, code }),
  })

export const signupResend = (email: string) =>
  request('/auth/signup/resend', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })

/* ── Recuperação de senha ── */
export const resetRequest = (email: string) =>
  request<{ detail: string; expires_in: number }>('/auth/reset/request', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })

export const resetConfirm = (token: string, new_password: string) =>
  request<{ detail: string }>('/auth/reset/confirm', {
    method: 'POST',
    body: JSON.stringify({ token, new_password }),
  })

/* ── Cardápio ── */
export const getCardapio = (inicio: string, fim: string) =>
  request<CardapioItem[]>(`/cardapio?data_inicio=${inicio}&data_fim=${fim}`)

export const createCardapioItem = (body: { data: string; tipo_refeicao: string; descricao: string }) =>
  request<CardapioItem>('/cardapio', { method: 'POST', body: JSON.stringify(body) })

export const updateCardapioItem = (id: number, body: { descricao: string }) =>
  request<CardapioItem>(`/cardapio/${id}`, { method: 'PUT', body: JSON.stringify(body) })

export const deleteCardapioItem = (id: number) =>
  request<void>(`/cardapio/${id}`, { method: 'DELETE' })

/* ── Alimentos ── */
export const getAlimentos = () => request<Alimento[]>('/alimentos')

export const createAlimento = (body: {
  nome: string
  fornecedor_id?: number
  peso_valor?: number
  peso_unidade?: string
  quantidade?: number
  data_vencimento?: string
  revisar?: boolean
}) => request<Alimento>('/alimentos', { method: 'POST', body: JSON.stringify(body) })

export const getFornecedores = () => request<Fornecedor[]>('/fornecedores')

export const createFornecedor = (body: { nome: string }) =>
  request<Fornecedor>('/fornecedores', { method: 'POST', body: JSON.stringify(body) })

/* ── Stats ── */
export const getStats = () => request<Stats>('/stats')

export const createDesperdicio = (body: {
  alimento_id?: number
  descricao: string
  quantidade_kg: number
  data: string
}) => request<void>('/desperdicio', { method: 'POST', body: JSON.stringify(body) })

/* ── OCR ── */
export const uploadOCR = (file: File): Promise<OcrResponse> => {
  const form = new FormData()
  form.append('file', file)
  return fetch(`${BASE_URL}/ocr/upload`, { method: 'POST', body: form })
    .then(async res => {
      const d = await res.json()
      if (!res.ok) throw d
      return d as OcrResponse
    })
}

