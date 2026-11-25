import React from 'react'
import { Link } from 'react-router-dom'
import { ChefHat } from 'lucide-react'
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
            <ChefHat size={20} />
          </span>
          <span>Cozinha &amp; Estoque</span>
        </Link>
        <div className="row-actions">
          <Link to="/" className="btn btn-ghost btn-sm">
            Cardápio de Hoje
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="auth-layout-main">
        <div className="auth-box">{children}</div>
      </main>

      <footer className="auth-layout-footer">
        Sistema de Gestão de Estoque, Fichas Técnicas e Cardápio
      </footer>
    </div>
  )
}
