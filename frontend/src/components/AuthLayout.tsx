import { Link } from 'react-router-dom'
import { Leaf } from 'lucide-react'
import ThemeToggle from './ThemeToggle'
import './AuthLayout.css'

interface AuthLayoutProps {
  children: React.ReactNode
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="auth-layout">
      <header className="auth-layout-header">
        <Link to="/" className="auth-logo">
          <span className="auth-logo-icon">
            <Leaf size={18} />
          </span>
          AuthAPI
        </Link>
        <ThemeToggle />
      </header>

      <main className="auth-layout-main">
        <div className="auth-box">{children}</div>
      </main>

      <footer className="auth-layout-footer">
        © {new Date().getFullYear()} AuthAPI · Todos os direitos reservados
      </footer>
    </div>
  )
}
