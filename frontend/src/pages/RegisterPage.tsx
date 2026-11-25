import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertCircle, CheckCircle2, Eye, EyeOff, Lock, User, UserPlus } from 'lucide-react'
import AuthLayout from '../components/AuthLayout'
import { registrarApi } from '../services/api'
import type { Papel } from '../types'

export default function RegisterPage() {
  const navigate = useNavigate()

  const [nome, setNome] = useState('')
  const [login, setLogin] = useState('')
  const [senha, setSenha] = useState('')
  const [papel, setPapel] = useState<Papel>('ESTOQUISTA')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setSucesso('')
    setLoading(true)
    try {
      await registrarApi({
        nome: nome.trim(),
        login: login.trim(),
        senha,
        papel,
      })
      setSucesso('Conta criada com sucesso! Redirecionando para o login...')
      setTimeout(() => navigate('/login'), 1400)
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao criar conta')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <div className="auth-card">
        <div className="auth-card-header">
          <div className="auth-card-icon">
            <UserPlus size={24} />
          </div>
          <h1 className="auth-title">Criar Conta</h1>
          <p className="auth-subtitle">Cadastro para Estoquista ou Nutricionista</p>
        </div>

        {erro && (
          <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
            <AlertCircle size={17} className="alert-icon" />
            <span>{erro}</span>
          </div>
        )}

        {sucesso && (
          <div className="alert alert-success" style={{ marginBottom: '1rem' }}>
            <CheckCircle2 size={17} className="alert-icon" />
            <span>{sucesso}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="field">
            <label className="field-label" htmlFor="nome">Nome completo</label>
            <input
              id="nome"
              type="text"
              className="field-input"
              value={nome}
              onChange={e => setNome(e.target.value)}
              placeholder="Ex.: João Pereira"
              required
              maxLength={100}
            />
          </div>

          <div className="field">
            <label className="field-label" htmlFor="reg-login">Login</label>
            <div className="field-input-wrap">
              <span className="field-input-icon"><User size={17} /></span>
              <input
                id="reg-login"
                type="text"
                className="field-input has-icon-left"
                value={login}
                onChange={e => setLogin(e.target.value)}
                placeholder="Mínimo 3 caracteres"
                required
                minLength={3}
                maxLength={50}
              />
            </div>
          </div>

          <div className="field">
            <label className="field-label" htmlFor="reg-senha">Senha</label>
            <div className="field-input-wrap">
              <span className="field-input-icon"><Lock size={17} /></span>
              <input
                id="reg-senha"
                type={mostrarSenha ? 'text' : 'password'}
                className="field-input has-icon-left has-icon-right"
                value={senha}
                onChange={e => setSenha(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                required
                minLength={6}
                maxLength={100}
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

          <div className="field">
            <label className="field-label" htmlFor="papel">Perfil</label>
            <select
              id="papel"
              className="field-input"
              value={papel}
              onChange={e => setPapel(e.target.value as Papel)}
            >
              <option value="ESTOQUISTA">Estoquista</option>
              <option value="NUTRICIONISTA">Nutricionista</option>
            </select>
          </div>

          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? <span className="spinner" /> : 'Cadastrar'}
          </button>
        </form>

        <div className="auth-footer">
          Já tem conta? <Link to="/login">Entrar</Link>
        </div>
      </div>
    </AuthLayout>
  )
}
