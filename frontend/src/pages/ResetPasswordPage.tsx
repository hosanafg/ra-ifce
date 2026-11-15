/* ── Página de redefinição de senha (/nova-senha?token=…) ── */
import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react'
import AuthLayout from '../components/AuthLayout'
import { resetConfirm } from '../services/api'
import '../styles/components.css'
import '../components/AuthLayout.css'

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

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') ?? ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const strength = passwordStrength(password)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!password || !confirm) return
    if (password !== confirm) {
      setError('As senhas não coincidem.')
      return
    }
    if (password.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      await resetConfirm(token, password)
      setDone(true)
      setTimeout(() => navigate('/login'), 3000)
    } catch (err: any) {
      const d = err?.detail
      setError(typeof d === 'string' ? d : 'Link inválido ou expirado. Solicite um novo.')
    } finally {
      setLoading(false)
    }
  }

  /* Token ausente na URL */
  if (!token) {
    return (
      <AuthLayout>
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <div className="auth-card-icon" style={{ margin: '0 auto 1rem' }}>
            <AlertCircle size={26} />
          </div>
          <h1 className="auth-title">Link inválido</h1>
          <p className="auth-subtitle" style={{ marginBottom: '1.5rem' }}>
            Este link de recuperação não é válido ou já foi utilizado.
          </p>
          <Link to="/recuperar-senha" className="btn btn-primary btn-full">
            Solicitar novo link
          </Link>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <div className="auth-card">
        <div className="auth-card-header">
          <div className="auth-card-icon">
            {done ? <CheckCircle2 size={26} /> : <Lock size={26} />}
          </div>
          <h1 className="auth-title">
            {done ? 'Senha redefinida!' : 'Nova senha'}
          </h1>
          <p className="auth-subtitle">
            {done
              ? 'Sua senha foi atualizada. Redirecionando para o login…'
              : 'Escolha uma nova senha segura para sua conta.'}
          </p>
        </div>

        {error && (
          <div className="alert alert-error" role="alert" style={{ marginBottom: '1rem' }}>
            <AlertCircle size={18} className="alert-icon" />
            <span>{error}</span>
          </div>
        )}

        {done ? (
          <div className="alert alert-success">
            <CheckCircle2 size={18} className="alert-icon" />
            Redirecionando para o login em 3 segundos…
          </div>
        ) : (
          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <div className="field">
              <label className="field-label" htmlFor="new-password">Nova senha</label>
              <div className="field-input-wrap">
                <span className="field-input-icon"><Lock size={18} /></span>
                <input
                  id="new-password"
                  type={showPass ? 'text' : 'password'}
                  className="field-input has-icon-left has-icon-right"
                  placeholder="Mínimo 8 caracteres"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="new-password"
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
              {password && (
                <div style={{ marginTop: '0.4rem' }}>
                  <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                    {[1, 2, 3, 4].map(i => (
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

            <div className="field">
              <label className="field-label" htmlFor="confirm-password">Confirmar senha</label>
              <div className="field-input-wrap">
                <span className="field-input-icon"><Lock size={18} /></span>
                <input
                  id="confirm-password"
                  type={showPass ? 'text' : 'password'}
                  className={`field-input has-icon-left${confirm && confirm !== password ? ' error-state' : ''}`}
                  placeholder="Repita a nova senha"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  required
                />
              </div>
              {confirm && confirm !== password && (
                <span className="field-hint" style={{ color: 'var(--error)' }}>
                  As senhas não coincidem.
                </span>
              )}
            </div>

            <div className="auth-actions">
              <button
                type="submit"
                className="btn btn-primary btn-full btn-lg"
                disabled={loading || (!!confirm && confirm !== password)}
              >
                {loading
                  ? <><span className="spinner" /> Salvando…</>
                  : <><CheckCircle2 size={18} /> Redefinir senha</>
                }
              </button>
            </div>
          </form>
        )}

        {!done && (
          <div className="auth-footer">
            <Link to="/recuperar-senha">
              <ArrowLeft size={14} style={{ verticalAlign: 'middle' }} /> Solicitar novo link
            </Link>
          </div>
        )}
      </div>
    </AuthLayout>
  )
}
