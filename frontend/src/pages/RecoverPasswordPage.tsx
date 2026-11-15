/* ── Página de Recuperação de Senha (chama a API real) ── */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, KeyRound, CheckCircle2, AlertCircle, ArrowLeft, Info } from 'lucide-react'
import AuthLayout from '../components/AuthLayout'
import { resetRequest } from '../services/api'
import '../styles/components.css'
import '../components/AuthLayout.css'

type Step = 'email' | 'sent'

export default function RecoverPasswordPage() {
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError(null)
    try {
      await resetRequest(email.trim())
      setStep('sent')
    } catch (err: any) {
      const d = err?.detail
      setError(typeof d === 'string' ? d : 'Não foi possível processar a solicitação.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <div
        className="auth-step-indicator"
        role="progressbar"
        aria-valuenow={step === 'email' ? 1 : 2}
        aria-valuemin={1}
        aria-valuemax={2}
      >
        <div className={`auth-step-dot ${step === 'email' ? 'active' : 'done'}`} />
        <div className={`auth-step-dot ${step === 'sent' ? 'active' : ''}`} />
      </div>

      <div className="auth-card">
        <div className="auth-card-header">
          <div className="auth-card-icon">
            {step === 'sent' ? <CheckCircle2 size={26} /> : <KeyRound size={26} />}
          </div>
          <h1 className="auth-title">
            {step === 'sent' ? 'Verifique seu e-mail' : 'Recuperar senha'}
          </h1>
          <p className="auth-subtitle">
            {step === 'sent' ? (
              <>
                Se <strong>{email}</strong> estiver cadastrado, você receberá
                um link de redefinição em breve. O link expira em{' '}
                <strong>30 minutos</strong>.
              </>
            ) : (
              'Informe seu e-mail e enviaremos um link para redefinir sua senha.'
            )}
          </p>
        </div>

        {error && (
          <div className="alert alert-error" role="alert" style={{ marginBottom: '1rem' }}>
            <AlertCircle size={18} className="alert-icon" />
            <span>{error}</span>
          </div>
        )}

        {step === 'email' ? (
          <>
            {/* Aviso de ambiente de desenvolvimento */}
            <div className="alert" role="note" style={{
              marginBottom: '1.25rem',
              background: 'var(--accent-light)',
              color: 'var(--accent)',
              border: '1px solid color-mix(in srgb, var(--accent) 25%, transparent)'
            }}>
              <Info size={16} className="alert-icon" />
              <span>
                Sem SMTP configurado, o link aparece no <strong>log do servidor</strong>{' '}
                (linha <code>INFO [DEV] Link de recuperação…</code>).
              </span>
            </div>

            <form className="auth-form" onSubmit={handleSubmit} noValidate>
              <div className="field">
                <label className="field-label" htmlFor="recover-email">
                  E-mail cadastrado
                </label>
                <div className="field-input-wrap">
                  <span className="field-input-icon"><Mail size={18} /></span>
                  <input
                    id="recover-email"
                    type="email"
                    className={`field-input has-icon-left${error ? ' error-state' : ''}`}
                    placeholder="voce@exemplo.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    autoComplete="email"
                    autoFocus
                    required
                  />
                </div>
              </div>

              <div className="auth-actions">
                <button
                  type="submit"
                  className="btn btn-primary btn-full btn-lg"
                  disabled={loading}
                >
                  {loading
                    ? <><span className="spinner" /> Enviando…</>
                    : <><Mail size={18} /> Enviar link de recuperação</>
                  }
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="auth-actions" style={{ marginTop: '0.5rem' }}>
            <div className="alert alert-success">
              <CheckCircle2 size={18} className="alert-icon" />
              <span>Solicitação registrada. Verifique sua caixa de entrada e o spam.</span>
            </div>
            <button
              className="btn btn-outline btn-full"
              onClick={() => { setStep('email'); setEmail(''); setError(null) }}
            >
              Usar outro e-mail
            </button>
          </div>
        )}

        <div className="auth-footer">
          <Link to="/login">
            <ArrowLeft size={14} style={{ verticalAlign: 'middle' }} /> Voltar ao login
          </Link>
        </div>
      </div>
    </AuthLayout>
  )
}
