/* ── Página de Login ── */
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, AlertCircle, LogIn } from 'lucide-react'
import AuthLayout from '../components/AuthLayout'
import { loginEmail, loginPassword } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import '../styles/components.css'
import '../components/AuthLayout.css'

type Step = 'email' | 'password'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loginToken, setLoginToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null)

  /* ── Etapa 1: e-mail ── */
  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await loginEmail(email.trim())
      setLoginToken(res.login_token)
      setStep('password')
    } catch (err: any) {
      const detail = err?.detail
      setError(typeof detail === 'string' ? detail : 'E-mail não encontrado.')
    } finally {
      setLoading(false)
    }
  }

  /* ── Etapa 2: senha ── */
  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!password) return
    setLoading(true)
    setError(null)
    setAttemptsLeft(null)
    try {
      const res = await loginPassword(loginToken, password)
      if (res.authenticated) {
        login({ email: res.email })
        navigate('/calendario')
      }
    } catch (err: any) {
      const detail = err?.detail
      if (detail?.redirect_to === 'email') {
        setStep('email')
        setLoginToken('')
        setPassword('')
        setError(detail?.message ?? 'Sessão expirada. Tente novamente.')
      } else {
        const msg = detail?.message ?? detail ?? 'Senha incorreta.'
        setError(typeof msg === 'string' ? msg : 'Erro ao verificar senha.')
        if (detail?.attempts_remaining != null) {
          setAttemptsLeft(detail.attempts_remaining)
        }
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      {/* Indicador de etapas */}
      <div className="auth-step-indicator" role="progressbar" aria-valuenow={step === 'email' ? 1 : 2} aria-valuemin={1} aria-valuemax={2}>
        <div className={`auth-step-dot ${step === 'email' ? 'active' : 'done'}`} />
        <div className={`auth-step-dot ${step === 'password' ? 'active' : ''}`} />
      </div>

      <div className="auth-card">
        <div className="auth-card-header">
          <div className="auth-card-icon">
            {step === 'email' ? <Mail size={26} /> : <Lock size={26} />}
          </div>
          <h1 className="auth-title">
            {step === 'email' ? 'Entrar na conta' : 'Digite sua senha'}
          </h1>
          <p className="auth-subtitle">
            {step === 'email'
              ? 'Informe seu e-mail para continuar.'
              : <>Autenticando como <strong>{email}</strong></>}
          </p>
        </div>

        {error && (
          <div className="alert alert-error" role="alert" style={{ marginBottom: '1rem' }}>
            <AlertCircle size={18} className="alert-icon" />
            <span>{error}</span>
          </div>
        )}

        {attemptsLeft !== null && attemptsLeft > 0 && (
          <div className="auth-attempts-warning" style={{ marginBottom: '0.75rem' }}>
            <AlertCircle size={14} />
            {attemptsLeft === 1
              ? '⚠ Última tentativa antes do bloqueio.'
              : `${attemptsLeft} tentativas restantes.`}
          </div>
        )}

        {step === 'email' ? (
          <form className="auth-form" onSubmit={handleEmailSubmit} noValidate>
            <div className="field">
              <label className="field-label" htmlFor="email">E-mail</label>
              <div className="field-input-wrap">
                <span className="field-input-icon"><Mail size={18} /></span>
                <input
                  id="email"
                  type="email"
                  className={`field-input has-icon-left${error ? ' error-state' : ''}`}
                  placeholder="voce@exemplo.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoComplete="email"
                  autoFocus
                  required
                  aria-describedby={error ? 'email-error' : undefined}
                />
              </div>
            </div>

            <div className="auth-actions">
              <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
                {loading ? <span className="spinner" /> : <LogIn size={18} />}
                {loading ? 'Verificando…' : 'Continuar'}
              </button>
            </div>
          </form>
        ) : (
          <form className="auth-form" onSubmit={handlePasswordSubmit} noValidate>
            <div className="field">
              <label className="field-label" htmlFor="password">Senha</label>
              <div className="field-input-wrap">
                <span className="field-input-icon"><Lock size={18} /></span>
                <input
                  id="password"
                  type={showPass ? 'text' : 'password'}
                  className={`field-input has-icon-left has-icon-right${error ? ' error-state' : ''}`}
                  placeholder="Sua senha"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                  autoFocus
                  required
                />
                <button
                  type="button"
                  className="field-input-icon-right"
                  onClick={() => setShowPass(v => !v)}
                  aria-label={showPass ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="auth-actions">
              <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
                {loading ? <span className="spinner" /> : <LogIn size={18} />}
                {loading ? 'Entrando…' : 'Entrar'}
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-full"
                onClick={() => { setStep('email'); setError(null); setPassword('') }}
              >
                ← Usar outro e-mail
              </button>
            </div>
          </form>
        )}

        <div className="auth-footer">
          <Link to="/recuperar-senha">Esqueci minha senha</Link>
          <span style={{ margin: '0 0.5rem', color: 'var(--border-default)' }}>·</span>
          Não tem conta? <Link to="/cadastro">Criar conta</Link>
        </div>
      </div>
    </AuthLayout>
  )
}
