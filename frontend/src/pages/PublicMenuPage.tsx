import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ChefHat,
  ClipboardCheck,
  Package,
  Star,
  UtensilsCrossed,
  X,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import ThemeToggle from '../components/ThemeToggle'
import { avaliarPratoApi, cardapioHojeApi } from '../services/api'
import type { ItemCardapioResponse } from '../types'
import './PublicMenuPage.css'

export default function PublicMenuPage() {
  const { user } = useAuth()
  const [itens, setItens] = useState<ItemCardapioResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')

  const [avaliando, setAvaliando] = useState<ItemCardapioResponse | null>(null)
  const [nomeAvaliador, setNomeAvaliador] = useState('')
  const [nota, setNota] = useState(5)
  const [enviando, setEnviando] = useState(false)
  const [aviso, setAviso] = useState('')
  const [erroModal, setErroModal] = useState('')

  useEffect(() => {
    cardapioHojeApi()
      .then(setItens)
      .catch(e => setErro(e instanceof Error ? e.message : 'Erro ao carregar cardápio de hoje'))
      .finally(() => setLoading(false))
  }, [])

  async function handleAvaliar(e: React.FormEvent) {
    e.preventDefault()
    if (!avaliando) return
    setEnviando(true)
    setErroModal('')
    try {
      const res = await avaliarPratoApi({
        itemCardapioId: avaliando.id,
        nomeAvaliador: nomeAvaliador.trim(),
        nota,
      })
      setAviso(res.mensagem || 'Avaliação registrada. Obrigado!')
      setAvaliando(null)
      setNomeAvaliador('')
      setNota(5)
      setTimeout(() => setAviso(''), 4000)
    } catch (err) {
      setErroModal(err instanceof Error ? err.message : 'Não foi possível enviar a avaliação')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-page)' }}>
      <header className="navbar">
        <Link to="/" className="navbar-logo">
          <span className="navbar-logo-icon">
            <ChefHat size={19} />
          </span>
          <span>Cozinha &amp; Estoque</span>
        </Link>

        <div className="navbar-actions">
          <ThemeToggle />
          {user ? (
            <Link to="/painel" className="btn btn-primary btn-sm">
              Acessar Painel
            </Link>
          ) : (
            <>
              <Link to="/login" className="btn btn-outline btn-sm" style={{ color: '#f7f7f4', borderColor: 'rgba(255,255,255,0.4)' }}>
                Entrar
              </Link>
              <Link to="/registrar" className="btn btn-primary btn-sm">
                Criar Conta
              </Link>
            </>
          )}
        </div>
      </header>

      <section className="home-hero">
        <div className="home-hero-eyebrow">
          <span className="badge">
            <CalendarDays size={13} /> Cardápio Público do Dia
          </span>
        </div>
        <h1 className="home-hero-title">
          Refeições de <span>Hoje</span> na Cozinha
        </h1>
        <p className="home-hero-subtitle">
          Confira os pratos programados para hoje e deixe sua avaliação de 1 a 5 estrelas para ajudar nossa equipe de nutrição.
        </p>
        <div className="home-hero-actions">
          <a href="#cardapio-hoje" className="btn btn-primary btn-lg">
            <UtensilsCrossed size={18} /> Ver Pratos de Hoje
          </a>
          <Link to={user ? '/painel' : '/login'} className="btn btn-outline btn-lg">
            {user ? 'Ir para o Painel' : 'Área da Equipe'}
          </Link>
        </div>
      </section>

      <section id="cardapio-hoje" className="home-section">
        <h2 className="home-section-title">Cardápio de Hoje</h2>
        <p className="home-section-sub">
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
        </p>

        {erro && (
          <div className="alert alert-error" style={{ marginBottom: '1.5rem' }}>
            <AlertCircle size={18} className="alert-icon" />
            <span>{erro}</span>
          </div>
        )}

        {loading ? (
          <div className="card empty-state">Carregando cardápio de hoje...</div>
        ) : itens.length === 0 ? (
          <div className="card empty-state">
            Nenhum prato cadastrado no cardápio para hoje.
          </div>
        ) : (
          <div className="home-grid">
            {itens.map(item => (
              <div key={item.id} className="feature-card">
                <div>
                  <div className="feature-icon">
                    <UtensilsCrossed size={22} />
                  </div>
                  <h3 className="feature-title">{item.prato}</h3>
                  <p className="feature-desc">
                    Produção prevista: <strong>{item.pesoKg} kg</strong>
                  </p>
                </div>

                <button
                  type="button"
                  className="btn btn-outline btn-sm btn-full"
                  onClick={() => {
                    setAvaliando(item)
                    setErroModal('')
                  }}
                >
                  <Star size={15} /> Avaliar este prato
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="home-section" style={{ paddingTop: '1rem' }}>
        <h2 className="home-section-title">Fluxo da Cozinha</h2>
        <p className="home-section-sub">Controle integrado do estoque ao prato servido</p>

        <div className="home-grid">
          <div className="feature-card">
            <div>
              <div className="feature-icon">
                <Package size={22} />
              </div>
              <h3 className="feature-title">Estoquista (PEPS)</h3>
              <p className="feature-desc">
                Cadastro de alimentos, notas de entrada com lote e validade, e baixa automática pelos lotes que vencem primeiro.
              </p>
            </div>
          </div>

          <div className="feature-card">
            <div>
              <div className="feature-icon">
                <UtensilsCrossed size={22} />
              </div>
              <h3 className="feature-title">Nutricionista</h3>
              <p className="feature-desc">
                Fichas técnicas por kg, verificação automática de disponibilidade em estoque e planejamento de cardápios semanais.
              </p>
            </div>
          </div>

          <div className="feature-card">
            <div>
              <div className="feature-icon">
                <ClipboardCheck size={22} />
              </div>
              <h3 className="feature-title">Notas de Retirada</h3>
              <p className="feature-desc">
                Consolidação automática dos insumos do cardápio para conferência e confirmação de saída do estoque.
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer className="home-footer">
        Cozinha &amp; Estoque — Gestão de Insumos, Pratos e Cardápios
      </footer>

      {avaliando && (
        <div className="modal-backdrop" onClick={() => setAvaliando(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Avaliar: {avaliando.prato}</h3>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAvaliando(null)}>
                <X size={18} />
              </button>
            </div>

            {erroModal && (
              <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
                <AlertCircle size={17} className="alert-icon" />
                <span>{erroModal}</span>
              </div>
            )}

            <form onSubmit={handleAvaliar} className="form-stack">
              <div className="field">
                <label className="field-label" htmlFor="nomeAvaliador">Seu nome</label>
                <input
                  id="nomeAvaliador"
                  className="field-input"
                  value={nomeAvaliador}
                  onChange={e => setNomeAvaliador(e.target.value)}
                  placeholder="Ex.: Maria Silva"
                  required
                  maxLength={100}
                />
              </div>

              <div className="field">
                <span className="field-label">Nota (1 a 5 estrelas)</span>
                <div className="star-row">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button
                      key={n}
                      type="button"
                      className={`star-btn ${nota === n ? 'selected' : ''}`}
                      onClick={() => setNota(n)}
                    >
                      <Star size={16} fill={n <= nota ? 'currentColor' : 'none'} />
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <div className="row-actions" style={{ justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setAvaliando(null)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={enviando}>
                  {enviando ? <span className="spinner" /> : 'Enviar Avaliação'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {aviso && (
        <div className="toast">
          <CheckCircle2 size={18} />
          <span>{aviso}</span>
        </div>
      )}
    </div>
  )
}
