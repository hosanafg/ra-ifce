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
