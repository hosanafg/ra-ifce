import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertCircle, Eye, EyeOff, Lock, LogIn, User } from 'lucide-react'
import AuthLayout from '../components/AuthLayout'
import { useAuth } from '../contexts/AuthContext'
import { loginApi } from '../services/api'

export default function LoginPage() {
  const { setSession } = useAuth()
  const navigate = useNavigate()

  const [login, setLogin] = useState('')
  const [senha, setSenha] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setLoading(true)
    try {
      const res = await loginApi({ login: login.trim(), senha })
      setSession(res)
      navigate('/painel')
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Usuário ou senha inválidos')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <div className="auth-card">
        <div className="auth-card-header">
          <div className="auth-card-icon">
            <LogIn size={24} />
          </div>
          <h1 className="auth-title">Entrar no Sistema</h1>
          <p className="auth-subtitle">Acesse o painel da cozinha com seu login e senha</p>
        </div>

        {erro && (
          <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
            <AlertCircle size={17} className="alert-icon" />
            <span>{erro}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="field">
            <label className="field-label" htmlFor="login">Login</label>
            <div className="field-input-wrap">
              <span className="field-input-icon"><User size={17} /></span>
              <input
                id="login"
                type="text"
                className="field-input has-icon-left"
                value={login}
                onChange={e => setLogin(e.target.value)}
                placeholder="ex.: admin"
                required
                autoComplete="username"
              />
            </div>
          </div>

          <div className="field">
            <label className="field-label" htmlFor="senha">Senha</label>
            <div className="field-input-wrap">
              <span className="field-input-icon"><Lock size={17} /></span>
              <input
                id="senha"
                type={mostrarSenha ? 'text' : 'password'}
                className="field-input has-icon-left has-icon-right"
                value={senha}
                onChange={e => setSenha(e.target.value)}
                placeholder="Sua senha"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className="field-input-icon-right"
                onClick={() => setMostrarSenha(s => !s)}
                aria-label="Mostrar ou ocultar senha"
              >
                {mostrarSenha ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? <span className="spinner" /> : 'Entrar'}
          </button>
        </form>

        <div className="auth-footer">
          Não tem conta? <Link to="/registrar">Criar conta</Link>
        </div>
      </div>
    </AuthLayout>
  )
}
