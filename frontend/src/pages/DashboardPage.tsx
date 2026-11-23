import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import ThemeToggle from '../components/ThemeToggle'
import {
  getCardapio,
  updateCardapioItem,
  deleteCardapioItem,
  getStats,
  createDesperdicio,
  getAlimentos,
  getFornecedores,
  getReceitas,
} from '../services/api'
import type { Alimento, CardapioItem, Fornecedor, Receita, Stats } from '../types'
import './DashboardPage.css'

const TIPO_LABELS: Record<string, string> = {
  cafe: 'Café da manhã',
  almoco: 'Almoço',
  lanche: 'Lanche',
  jantar: 'Jantar',
}
const REFEICOES_ORDEM = ['cafe', 'almoco', 'lanche', 'jantar']

function fmt(d: Date) {
  return d.toISOString().slice(0, 10)
}

export default function DashboardPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { theme } = useTheme()

  const dateParam = params.get('data') || fmt(new Date())
  const selectedDate = new Date(dateParam + 'T00:00:00')

  const [items, setItems] = useState<CardapioItem[]>([])
  const [alimentos, setAlimentos] = useState<Alimento[]>([])
  const [receitas, setReceitas] = useState<Receita[]>([])
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [editing, setEditing] = useState<Record<number, string>>({})
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [loadingItems, setLoadingItems] = useState(false)

  // Waste modal
  const [wasteModal, setWasteModal] = useState(false)
  const [wasteForm, setWasteForm] = useState({ descricao: '', quantidade_kg: '', data: fmt(new Date()) })
  const [savingWaste, setSavingWaste] = useState(false)

  useEffect(() => {
    setLoadingItems(true)
    Promise.all([
      getCardapio(dateParam, dateParam).catch(() => []),
      getAlimentos().catch(() => []),
      getReceitas().catch(() => []),
      getFornecedores().catch(() => []),
    ])
      .then(([c, a, r, f]) => {
        setItems(c)
        setAlimentos(a)
        setReceitas(r)
        setFornecedores(f)
      })
      .finally(() => setLoadingItems(false))
    getStats().then(setStats).catch(() => {})
  }, [dateParam])

  async function handleSave(id: number) {
    const descricao = editing[id]
    if (descricao === undefined) return
    await updateCardapioItem(id, { descricao })
    setItems(prev => prev.map(i => i.id === id ? { ...i, descricao } : i))
    setEditing(prev => { const n = { ...prev }; delete n[id]; return n })
  }

  async function handleDelete(id: number) {
    if (!confirm('Excluir este item?')) return
    await deleteCardapioItem(id)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  async function handleWaste(e: React.FormEvent) {
    e.preventDefault()
    setSavingWaste(true)
    try {
      await createDesperdicio({
        descricao: wasteForm.descricao,
        quantidade_kg: parseFloat(wasteForm.quantidade_kg),
        data: wasteForm.data,
      })
      setWasteModal(false)
      setWasteForm({ descricao: '', quantidade_kg: '', data: fmt(new Date()) })
      getStats().then(setStats).catch(() => {})
    } catch {
      /* noop */
    } finally {
      setSavingWaste(false)
    }
  }

  /* SVG bar chart */
  function BarChart() {
    if (!stats || stats.desperdicio_por_dia.length === 0)
      return <p className="dash-muted">Sem dados</p>
    const last7 = stats.desperdicio_por_dia.slice(-7)
    const max = Math.max(...last7.map(d => d.kg), 0.01)
    const W = 220, H = 70, barW = 24, gap = 6
    const total = last7.length
    const startX = (W - total * (barW + gap) + gap) / 2
    return (
      <svg width={W} height={H + 20} style={{ display: 'block' }}>
        {last7.map((d, i) => {
          const h = Math.max(4, (d.kg / max) * H)
          const x = startX + i * (barW + gap)
          const y = H - h
          return (
            <g key={i}>
              <rect x={x} y={y} width={barW} height={h} rx={3} fill="var(--accent)" opacity={0.8} />
              <text x={x + barW / 2} y={H + 14} textAnchor="middle" fontSize="9" fill="var(--text-muted)">
                {d.data.slice(5)}
              </text>
            </g>
          )
        })}
      </svg>
    )
  }

  const vencProximo = stats?.vencimento_proximo ?? []
  const totalDesperdicio = stats?.total_desperdicio_kg ?? 0

  const dateLabel = selectedDate.toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <div className="dash-page" data-theme={theme}>
      {/* Navbar */}
      <nav className="dash-nav">
        <div className="dash-nav-left">
          <button className="btn btn-sm btn-ghost dash-nav-back" onClick={() => navigate('/calendario')}>
            ← Calendário
          </button>
          <span className="dash-nav-logo">🌿 Dashboard</span>
        </div>
        <div className="dash-nav-right">
          <ThemeToggle />
          <span className="dash-nav-user">{user?.email}</span>
          <button className="btn btn-sm btn-ghost" onClick={logout}>Sair</button>
        </div>
      </nav>

      <div className="dash-layout">
        {/* Main */}
        <main className="dash-main">
          {/* Day header */}
          <h1 className="dash-day-title" style={{ textTransform: 'capitalize' }}>{dateLabel}</h1>

          {/* Cardápio e Estrutura Hierárquica */}
          <section className="dash-section">
            <h2 className="dash-section-title">Cardápio do dia</h2>
            {loadingItems && <p className="dash-muted">Carregando…</p>}
            {!loadingItems && items.length === 0 && receitas.filter(r => !r.data || r.data === dateParam).length === 0 && (
              <p className="dash-muted">Nenhum item ou receita cadastrado para este dia.</p>
            )}

            <div className="dash-items">
              {REFEICOES_ORDEM.map(tipo => {
                const itemsRef = items.filter(i => i.tipo_refeicao === tipo)
                const receitasRef = receitas.filter(r => r.refeicao === tipo && (!r.data || r.data === dateParam))
                if (itemsRef.length === 0 && receitasRef.length === 0) return null

                return (
                  <div key={tipo} className="dash-item-card">
                    <div className="dash-item-header">
                      <span className="dash-item-tipo"><strong>Refeição:</strong> {TIPO_LABELS[tipo]}</span>
                    </div>

                    {/* Receitas e Alimentos associados */}
                    {receitasRef.map(rec => {
                      const alims = alimentos.filter(a => a.receita_id === rec.id)
                      return (
                        <div key={`rec-${rec.id}`} className="dash-hierarchy-receita">
                          <div className="dash-hierarchy-receita-title">• {rec.nome}</div>
                          {alims.length > 0 && (
                            <ul className="dash-hierarchy-alimentos">
                              {alims.map(a => {
                                const forn = fornecedores.find(f => f.id === a.fornecedor_id)?.nome
                                const detalhes = [
                                  forn ? `Fornecedor: ${forn}` : null,
                                  a.peso_valor != null ? `Peso: ${a.peso_valor} ${a.peso_unidade || 'kg'}` : null,
                                  a.quantidade != null ? `Qtd: ${a.quantidade}` : null,
                                  a.data_vencimento ? `Vencimento: ${a.data_vencimento.split('-').reverse().join('/')}` : null,
                                  ...Object.entries(a.extras || {}).map(([k, v]) => `${k}: ${v}`),
                                ].filter(Boolean)
                                return (
                                  <li key={a.id} className="dash-hierarchy-alimento">
                                    <strong>{a.nome}</strong>
                                    {detalhes.length > 0 && (
                                      <div className="dash-hierarchy-detalhes">{detalhes.join(' · ')}</div>
                                    )}
                                  </li>
                                )
                              })}
                            </ul>
                          )}
                        </div>
                      )
                    })}

                    {/* Itens avulsos do cardápio */}
                    {itemsRef.map(item => (
                      <div key={item.id} style={{ marginTop: '0.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                          <span className="dash-muted">Descrição do cardápio</span>
                          <button className="btn btn-sm btn-ghost dash-item-del" onClick={() => handleDelete(item.id)}>🗑</button>
                        </div>
                        <textarea
                          className="field-input dash-item-textarea"
                          rows={2}
                          value={editing[item.id] !== undefined ? editing[item.id] : item.descricao}
                          onChange={e => setEditing(prev => ({ ...prev, [item.id]: e.target.value }))}
                        />
                        {editing[item.id] !== undefined && (
                          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem' }}>
                            <button className="btn btn-sm btn-primary" onClick={() => handleSave(item.id)}>Salvar</button>
                            <button className="btn btn-sm btn-ghost"
                              onClick={() => setEditing(prev => { const n = { ...prev }; delete n[item.id]; return n })}>
                              Cancelar
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          </section>

          {/* Tabela de Alimentos no Banco de Dados */}
          <section className="dash-section">
            <h2 className="dash-section-title">Alimentos Cadastrados</h2>
            {alimentos.length === 0 ? (
              <p className="dash-muted">Nenhum alimento cadastrado.</p>
            ) : (
              <div className="dash-table-wrap">
                <table className="dash-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Alimento</th>
                      <th>Fornecedor</th>
                      <th>Peso</th>
                      <th>Unidade</th>
                      <th>Quantidade</th>
                      <th>Data de Vencimento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alimentos.map(a => {
                      const forn = fornecedores.find(f => f.id === a.fornecedor_id)?.nome ?? '—'
                      return (
                        <tr key={a.id}>
                          <td>{a.id}</td>
                          <td>
                            <strong>{a.nome}</strong>
                            {a.extras && Object.keys(a.extras).length > 0 && (
                              <div className="dash-table-extras">
                                {Object.entries(a.extras).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                              </div>
                            )}
                          </td>
                          <td>{forn}</td>
                          <td>{a.peso_valor ?? '—'}</td>
                          <td>{a.peso_unidade ?? '—'}</td>
                          <td>{a.quantidade ?? '—'}</td>
                          <td>{a.data_vencimento ? a.data_vencimento.split('-').reverse().join('/') : '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Stats */}
          <section className="dash-section">
            <h2 className="dash-section-title">Estatísticas</h2>
            <div className="dash-stats-grid">
              {/* Vencimento próximo */}
              <div className="dash-stat-card dash-stat-warning">
                <div className="dash-stat-icon">🟡</div>
                <div className="dash-stat-label">Vencimento Próximo</div>
                <div className="dash-stat-value">{vencProximo.length}</div>
                {vencProximo.length > 0 && (
                  <ul className="dash-stat-list">
                    {vencProximo.slice(0, 5).map(a => (
                      <li key={a.id}>{a.nome}</li>
                    ))}
                    {vencProximo.length > 5 && <li>…+{vencProximo.length - 5}</li>}
                  </ul>
                )}
              </div>
              {/* Desperdício total */}
              <div className="dash-stat-card dash-stat-danger">
                <div className="dash-stat-icon">🔴</div>
                <div className="dash-stat-label">Desperdício (30 dias)</div>
                <div className="dash-stat-value">{totalDesperdicio.toFixed(2)} kg</div>
              </div>
              {/* Mini gráfico */}
              <div className="dash-stat-card dash-stat-chart">
                <div className="dash-stat-icon">📊</div>
                <div className="dash-stat-label">Desperdício por dia</div>
                <BarChart />
              </div>
            </div>
          </section>
        </main>

        {/* Sidebar toggle button */}
        <button
          className="dash-sidebar-toggle"
          onClick={() => setSidebarOpen(o => !o)}
          aria-label={sidebarOpen ? 'Fechar painel' : 'Abrir painel'}
        >
          {sidebarOpen ? '›' : '‹'}
        </button>

        {/* Sidebar */}
        <aside className={`dash-sidebar${sidebarOpen ? ' open' : ''}`}>
          <h3 className="dash-sidebar-title">Ações rápidas</h3>
          <div className="dash-sidebar-actions">
            <button className="btn btn-outline btn-full" onClick={() => navigate('/adicionar-alimento')}>
              + Novo Alimento
            </button>
            <button className="btn btn-outline btn-full" onClick={() => navigate('/adicionar-alimento?tipo=receita')}>
              + Nova Receita
            </button>
            <button className="btn btn-outline btn-full" onClick={() => setWasteModal(true)}>
              📋 Registrar Desperdício
            </button>
          </div>
        </aside>
      </div>

      {/* Waste modal */}
      {wasteModal && (
        <div className="dash-modal-backdrop" onClick={() => setWasteModal(false)}>
          <div className="dash-modal" onClick={e => e.stopPropagation()}>
            <h3>Registrar Desperdício</h3>
            <form onSubmit={handleWaste} className="dash-modal-form">
              <div className="field">
                <label className="field-label">Descrição</label>
                <input type="text" className="field-input" value={wasteForm.descricao}
                  onChange={e => setWasteForm(p => ({ ...p, descricao: e.target.value }))} required />
              </div>
              <div className="field">
                <label className="field-label">Quantidade (kg)</label>
                <input type="number" step="0.01" min="0" className="field-input" value={wasteForm.quantidade_kg}
                  onChange={e => setWasteForm(p => ({ ...p, quantidade_kg: e.target.value }))} required />
              </div>
              <div className="field">
                <label className="field-label">Data</label>
                <input type="date" className="field-input" value={wasteForm.data}
                  onChange={e => setWasteForm(p => ({ ...p, data: e.target.value }))} required />
              </div>
              <div className="dash-modal-actions">
                <button type="submit" className="btn btn-primary" disabled={savingWaste}>
                  {savingWaste ? <span className="spinner" /> : null} Salvar
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setWasteModal(false)}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
