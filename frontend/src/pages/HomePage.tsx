/* ── Homepage / Dashboard ── */
import { Link, useNavigate } from 'react-router-dom'
import {
  Leaf, Shield, Zap, Lock, Database, RefreshCw,
  LogOut, User, ArrowRight, CheckCircle2
} from 'lucide-react'
import ThemeToggle from '../components/ThemeToggle'
import { useAuth } from '../contexts/AuthContext'
import '../styles/components.css'
import './HomePage.css'

const features = [
  {
    icon: <Shield size={22} />,
    title: 'Login em 2 etapas',
    desc: 'E-mail primeiro, senha depois. Sessão temporária com TTL configurável via cache.',
  },
  {
    icon: <Lock size={22} />,
    title: 'Bloqueio por tentativas',
    desc: 'Conta bloqueada automaticamente após exceder o limite de tentativas incorretas.',
  },
  {
    icon: <Zap size={22} />,
    title: 'FastAPI + SQLite',
    desc: 'Backend leve e performático com SQLAlchemy ORM e validação via Pydantic.',
  },
  {
    icon: <Database size={22} />,
    title: 'Cache de sessão',
    desc: 'Tokens de login armazenados em cache in-memory com expiração automática.',
  },
  {
    icon: <RefreshCw size={22} />,
    title: 'Verificação por código',
    desc: 'Cadastro em duas etapas com código enviado por e-mail e reenvio disponível.',
  },
  {
    icon: <CheckCircle2 size={22} />,
    title: 'Senhas com hash',
    desc: 'Senhas armazenadas com bcrypt. Nunca expostas, nem no banco de dados.',
  },
]

const stats = [
  { num: '2', label: 'Etapas de login' },
  { num: 'bcrypt', label: 'Hash de senha' },
  { num: '0', label: 'Vulnerabilidades' },
  { num: '100%', label: 'Open source' },
]

export default function HomePage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  /* Inicial do avatar */
  const initials = user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : '?'

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* ── Navbar ── */}
      <nav className="navbar" role="navigation" aria-label="Navegação principal">
        <Link to="/" className="navbar-logo">
          <span className="navbar-logo-icon"><Leaf size={18} /></span>
          AuthAPI
        </Link>
        <div className="navbar-actions">
          <ThemeToggle />
          {user ? (
            <>
              <div className="navbar-user">
                <div className="navbar-avatar" aria-hidden="true">{initials}</div>
                <span style={{ maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.email}
                </span>
              </div>
              <button className="btn btn-sm" onClick={handleLogout}
                style={{ background: 'rgba(255,255,255,0.12)', color: 'var(--warm-50)', border: '1px solid rgba(255,255,255,0.2)' }}
                aria-label="Sair da conta">
                <LogOut size={15} /> Sair
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-sm btn-ghost" style={{ color: 'var(--warm-50)' }}>
                Entrar
              </Link>
              <Link to="/cadastro" className="btn btn-sm btn-primary">
                Criar conta
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="home-hero" aria-labelledby="hero-title">
        <div className="home-hero-eyebrow">
          <span className="badge"><Leaf size={12} /> Auth API</span>
        </div>
        <h1 id="hero-title" className="home-hero-title">
          Autenticação segura<br />
          <span>sem complicação</span>
        </h1>
        <p className="home-hero-subtitle">
          API de autenticação em duas etapas com FastAPI, bloqueio de tentativas
          e verificação por e-mail. Pronto para integrar ao seu projeto.
        </p>
        <div className="home-hero-actions">
          {user ? (
            <div className="alert alert-success" style={{ display: 'inline-flex', gap: '0.5rem' }}>
              <CheckCircle2 size={18} />
              Você está autenticado como <strong>{user.email}</strong>
            </div>
          ) : (
            <>
              <Link to="/cadastro" className="btn btn-primary btn-lg">
                Começar agora <ArrowRight size={18} />
              </Link>
              <Link to="/login" className="btn btn-outline btn-lg">
                <User size={18} /> Já tenho conta
              </Link>
            </>
          )}
        </div>
      </section>

      {/* ── Features ── */}
      <section className="home-section" aria-labelledby="features-title">
        <h2 id="features-title" className="home-section-title">O que está incluído</h2>
        <p className="home-section-sub">
          Funcionalidades prontas para uso em projetos acadêmicos e profissionais.
        </p>
        <div className="home-grid" role="list">
          {features.map((f, i) => (
            <article key={i} className="feature-card" role="listitem">
              <div className="feature-icon" aria-hidden="true">{f.icon}</div>
              <h3 className="feature-title">{f.title}</h3>
              <p className="feature-desc">{f.desc}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="stats-strip" aria-label="Estatísticas do projeto">
        <div className="stats-inner">
          {stats.map((s, i) => (
            <div key={i}>
              <div className="stat-num">{s.num}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      {!user && (
        <section className="cta-section" aria-labelledby="cta-title">
          <h2 id="cta-title" className="cta-title">Pronto para começar?</h2>
          <p className="cta-sub">Crie sua conta e explore a API de autenticação.</p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/cadastro" className="btn btn-primary btn-lg">
              Criar conta grátis <ArrowRight size={18} />
            </Link>
            <Link to="/login" className="btn btn-outline btn-lg">
              Entrar
            </Link>
          </div>
        </section>
      )}

      {/* ── Footer ── */}
      <footer className="home-footer" role="contentinfo">
        © {new Date().getFullYear()} AuthAPI · Projeto acadêmico IFCE · Banco de Dados S4
      </footer>
    </div>
  )
}
