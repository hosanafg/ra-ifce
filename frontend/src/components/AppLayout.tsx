import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  CalendarDays,
  ChefHat,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Package,
  ShieldAlert,
  Users,
  UtensilsCrossed,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import ThemeToggle from './ThemeToggle'
import './AppLayout.css'

interface AppLayoutProps {
  children: React.ReactNode
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { user, logout, isImpersonating, restoreAdmin } = useAuth()
  const navigate = useNavigate()

  if (!user) return null

  const isAdmin = user.papel === 'ADMIN'
  const isEstoquista = user.papel === 'ESTOQUISTA' || isAdmin

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className="app-shell">
      <nav className="app-nav">
        <div className="app-nav-left">
          <NavLink to="/painel" className="app-nav-brand">
            <span className="app-nav-brand-icon">
              <ChefHat size={19} />
            </span>
            <span>Cozinha &amp; Estoque</span>
          </NavLink>

          <div className="app-nav-links">
            <NavLink to="/painel" end className={({ isActive }) => `app-nav-link ${isActive ? 'active' : ''}`}>
              <LayoutDashboard size={16} />
              Visão Geral
            </NavLink>
            <NavLink to="/estoque" className={({ isActive }) => `app-nav-link ${isActive ? 'active' : ''}`}>
              <Package size={16} />
              Estoque
            </NavLink>
            <NavLink to="/pratos" className={({ isActive }) => `app-nav-link ${isActive ? 'active' : ''}`}>
              <UtensilsCrossed size={16} />
              Pratos
            </NavLink>
            <NavLink to="/cardapios" className={({ isActive }) => `app-nav-link ${isActive ? 'active' : ''}`}>
              <CalendarDays size={16} />
              Cardápios
            </NavLink>
            {isEstoquista && (
              <NavLink to="/retiradas" className={({ isActive }) => `app-nav-link ${isActive ? 'active' : ''}`}>
                <ClipboardList size={16} />
                Retiradas
              </NavLink>
            )}
            {isAdmin && (
              <NavLink to="/admin/usuarios" className={({ isActive }) => `app-nav-link ${isActive ? 'active' : ''}`}>
                <Users size={16} />
                Usuários
              </NavLink>
            )}
          </div>
        </div>

        <div className="app-nav-right">
          <div className="app-user-pill">
            <span>{user.nome}</span>
            <span className="app-user-role">{user.papel}</span>
          </div>
          <ThemeToggle />
          <button type="button" onClick={handleLogout} className="app-nav-logout">
            <LogOut size={15} />
            Sair
          </button>
        </div>
      </nav>

      {isImpersonating && (
        <div className="app-impersonate-bar">
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldAlert size={16} />
            Modo Suporte ativo: você está acessando como <strong>{user.nome}</strong> ({user.papel}).
          </span>
          <button type="button" onClick={restoreAdmin} className="btn btn-outline btn-sm">
            Voltar para conta Admin
          </button>
        </div>
      )}

      <main className="app-main">{children}</main>
    </div>
  )
}
