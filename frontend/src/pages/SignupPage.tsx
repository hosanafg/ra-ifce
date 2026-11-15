/* ── Página de Cadastro ── */
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, Hash, AlertCircle, CheckCircle2, UserPlus, RefreshCw } from 'lucide-react'
import AuthLayout from '../components/AuthLayout'
import { signupStart, signupVerify, signupResend } from '../services/api'
import '../styles/components.css'
import '../components/AuthLayout.css'

type Step = 'form' | 'verify'

function passwordStrength(pw: string): { level: number; label: string; color: string } {
  if (!pw) return { level: 0, label: '', color: 'transparent' }
  let score = 0
  if (pw.length >= 8) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  const map: Record<number, { label: string; color: string }> = {
    0: { label: 'Muito fraca', color: '#c0392b' },
    1: { label: 'Fraca', color: '#e67e22' },
    2: { label: 'Média', color: '#f1c40f' },
    3: { label: 'Forte', color: 'var(--moss-500)' },
    4: { label: 'Muito forte', color: 'var(--moss-600)' },
  }
  return { level: score, ...map[score] }
}

export default function SignupPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('form')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const strength = passwordStrength(password)

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !password) return
    setLoading(true); setError(null)
    try {
      await signupStart(email.trim(), password)
      setStep('verify')
    } catch (err: any) {
      const d = err?.detail
      setError(typeof d === 'string' ? d : d?.message ?? 'Não foi possível criar a conta.')
    } finally { setLoading(false) }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    if (!code.trim()) return
    setLoading(true); setError(null)
    try {
      await signupVerify(email.trim(), code.trim())
      navigate('/login?cadastro=ok')
    } catch (err: any) {
      const d = err?.detail
      setError(typeof d === 'string' ? d : d?.message ?? 'Código inválido ou expirado.')
    } finally { setLoading(false) }
  }

  async function handleResend() {
    setLoading(true); setError(null); setSuccess(null)
    try {
      await signupResend(email.trim())
      setSuccess('Novo código enviado para ' + email)
    } catch {
      setError('Não foi possível reenviar o código.')
    } finally { setLoading(false) }
  }

  return (
    <AuthLayout>
      <div className="auth-step-indicator" role="progressbar" aria-valuenow={step === 'form' ? 1 : 2} aria-valuemin={1} aria-valuemax={2}>
        <div className={`auth-step-dot ${step === 'form' ? 'active' : 'done'}`} />
        <div className={`auth-step-dot ${step === 'verify' ? 'active' : ''}`} />
      </div>

      <div className="auth-card">
        <div className="auth-card-header">
          <div className="auth-card-icon">
            {step === 'verify' ? <Hash size={26} /> : <UserPlus size={26} />}
          </div>
          <h1 className="auth-title">
            {step === 'verify' ? 'Verificar e-mail' : 'Criar conta'}
          </h1>
          <p className="auth-subtitle">
            {step === 'verify'
              ? <>Enviamos um código para <strong>{email}</strong>. Insira-o abaixo.</>
              : 'Preencha os dados para criar sua conta.'}
          </p>
        </div>

        {error && (
          <div className="alert alert-error" role="alert" style={{ marginBottom: '1rem' }}>
            <AlertCircle size={18} className="alert-icon" /><span>{error}</span>
          </div>
        )}
        {success && (
          <div className="alert alert-success" role="status" style={{ marginBottom: '1rem' }}>
            <CheckCircle2 size={18} className="alert-icon" /><span>{success}</span>
          </div>
        )}

        {step === 'form' ? (
          <form className="auth-form" onSubmit={handleSignup} noValidate>
            <div className="field">
              <label className="field-label" htmlFor="signup-email">E-mail</label>
              <div className="field-input-wrap">
                <span className="field-input-icon"><Mail size={18} /></span>
                <input id="signup-email" type="email" className="field-input has-icon-left"
                  placeholder="voce@exemplo.com" value={email}
                  onChange={e => setEmail(e.target.value)} autoComplete="email" autoFocus required />
              </div>
            </div>

            <div className="field">
              <label className="field-label" htmlFor="signup-password">Senha</label>
              <div className="field-input-wrap">
                <span className="field-input-icon"><Lock size={18} /></span>
                <input id="signup-password" type={showPass ? 'text' : 'password'}
                  className="field-input has-icon-left has-icon-right"
                  placeholder="Mínimo 8 caracteres" value={password}
                  onChange={e => setPassword(e.target.value)} autoComplete="new-password" required />
                <button type="button" className="field-input-icon-right"
                  onClick={() => setShowPass(v => !v)}
                  aria-label={showPass ? 'Ocultar senha' : 'Mostrar senha'}>
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {password && (
                <div style={{ marginTop: '0.4rem' }}>
                  <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                    {[1,2,3,4].map(i => (
                      <div key={i} style={{
                        flex: 1, height: '4px', borderRadius: '2px',
                        backgroundColor: i <= strength.level ? strength.color : 'var(--border-default)',
                        transition: 'background-color .3s'
                      }} />
                    ))}
                  </div>
                  <span className="field-hint" style={{ color: strength.color }}>{strength.label}</span>
                </div>
              )}
            </div>

            <div className="auth-actions">
              <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
                {loading ? <><span className="spinner" /> Criando…</> : <><UserPlus size={18} /> Criar conta</>}
              </button>
            </div>
          </form>
        ) : (
          <form className="auth-form" onSubmit={handleVerify} noValidate>
            <div className="field">
              <label className="field-label" htmlFor="verify-code">Código de verificação</label>
              <div className="field-input-wrap">
                <span className="field-input-icon"><Hash size={18} /></span>
                <input id="verify-code" type="text" className="field-input has-icon-left"
                  placeholder="000000" value={code} onChange={e => setCode(e.target.value)}
                  autoFocus required maxLength={8} inputMode="numeric"
                  style={{ letterSpacing: '0.3em', fontWeight: 700, fontSize: '1.2rem', textAlign: 'center' }} />
              </div>
              <span className="field-hint">O código expira em 10 minutos.</span>
            </div>
            <div className="auth-actions">
              <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
                {loading ? <><span className="spinner" /> Verificando…</> : <><CheckCircle2 size={18} /> Verificar código</>}
              </button>
              <button type="button" className="btn btn-ghost btn-full" onClick={handleResend} disabled={loading}>
                <RefreshCw size={16} /> Reenviar código
              </button>
            </div>
          </form>
        )}

        <div className="auth-footer">
          Já tem conta? <Link to="/login">Entrar</Link>
        </div>
      </div>
    </AuthLayout>
  )
}
