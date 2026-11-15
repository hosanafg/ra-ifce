import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import ThemeToggle from '../components/ThemeToggle'
import { getCardapio, createCardapioItem } from '../services/api'
import type { CardapioItem } from '../types'
import './CalendarPage.css'

type ViewMode = 'mes' | 'semana' | 'dia'

const TIPO_CORES: Record<string, string> = {
  cafe: 'chip-cafe',
  almoco: 'chip-almoco',
  jantar: 'chip-jantar',
  lanche: 'chip-lanche',
}

const TIPO_LABELS: Record<string, string> = {
  cafe: 'Café da manhã',
  almoco: 'Almoço',
  jantar: 'Jantar',
  lanche: 'Lanche',
}

function fmt(d: Date) {
  return d.toISOString().slice(0, 10)
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

function startOfWeek(d: Date) {
  const clone = new Date(d)
  const day = clone.getDay() // 0=dom
  const diff = day === 0 ? -6 : 1 - day
  clone.setDate(clone.getDate() + diff)
  clone.setHours(0, 0, 0, 0)
  return clone
}

function addDays(d: Date, n: number) {
  const clone = new Date(d)
  clone.setDate(clone.getDate() + n)
  return clone
}

export default function CalendarPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { theme } = useTheme()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [view, setView] = useState<ViewMode>('mes')
  const [current, setCurrent] = useState(new Date(today))
  const [items, setItems] = useState<CardapioItem[]>([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [modalData, setModalData] = useState({ data: fmt(today), tipo_refeicao: 'almoco', descricao: '' })
  const [saving, setSaving] = useState(false)

  const rangeFor = useCallback((v: ViewMode, d: Date): [string, string] => {
    if (v === 'mes') {
      const s = startOfMonth(d)
      const e = new Date(d.getFullYear(), d.getMonth() + 1, 0)
      return [fmt(s), fmt(e)]
    }
    if (v === 'semana') {
      const s = startOfWeek(d)
      return [fmt(s), fmt(addDays(s, 6))]
    }
    return [fmt(d), fmt(d)]
  }, [])

  const fetchData = useCallback(async () => {
    const [s, e] = rangeFor(view, current)
    setLoading(true)
    try {
      const data = await getCardapio(s, e)
      setItems(data)
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [view, current, rangeFor])

  useEffect(() => { fetchData() }, [fetchData])

  function navigate_period(dir: -1 | 1) {
    setCurrent(prev => {
      const c = new Date(prev)
      if (view === 'mes') c.setMonth(c.getMonth() + dir)
      else if (view === 'semana') c.setDate(c.getDate() + dir * 7)
      else c.setDate(c.getDate() + dir)
      return c
    })
  }

  function goToday() { setCurrent(new Date(today)) }

  function itemsForDay(day: Date) {
    const key = fmt(day)
    return items.filter(i => i.data === key)
  }

  /* ─── Month view ─── */
  function renderMonth() {
    const first = startOfMonth(current)
    const startGrid = startOfWeek(first)
    const cells: Date[] = []
    for (let i = 0; i < 42; i++) cells.push(addDays(startGrid, i))

    const DOW = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
    return (
      <div className="cal-grid">
        {DOW.map(d => <div key={d} className="cal-dow">{d}</div>)}
        {cells.map((day, i) => {
          const isToday = fmt(day) === fmt(today)
          const isCurrentMonth = day.getMonth() === current.getMonth()
          const dayItems = itemsForDay(day)
          return (
            <div
              key={i}
              className={`cal-cell${isToday ? ' cal-today' : ''}${!isCurrentMonth ? ' cal-other-month' : ''}`}
              onClick={() => { setCurrent(day); setView('dia') }}
            >
              <span className="cal-day-num">{day.getDate()}</span>
              <div className="cal-chips">
                {dayItems.map(it => (
                  <span key={it.id} className={`cal-chip ${TIPO_CORES[it.tipo_refeicao] || 'chip-lanche'}`}>
                    {TIPO_LABELS[it.tipo_refeicao] || it.tipo_refeicao}
                  </span>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  /* ─── Week view ─── */
  function renderWeek() {
    const start = startOfWeek(current)
    const days: Date[] = Array.from({ length: 7 }, (_, i) => addDays(start, i))
    return (
      <div className="cal-week">
        {days.map((day, i) => {
          const isToday = fmt(day) === fmt(today)
          const dayItems = itemsForDay(day)
          return (
            <div key={i} className={`cal-week-col${isToday ? ' cal-today' : ''}`}>
              <div className="cal-week-header" onClick={() => { setCurrent(day); setView('dia') }}>
                <span className="cal-week-dow">{['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'][i]}</span>
                <span className="cal-week-num">{day.getDate()}</span>
              </div>
              <div className="cal-week-items">
                {dayItems.map(it => (
                  <div key={it.id} className={`cal-week-item ${TIPO_CORES[it.tipo_refeicao] || 'chip-lanche'}`}>
                    <strong>{TIPO_LABELS[it.tipo_refeicao] || it.tipo_refeicao}</strong>
                    <span>{it.descricao}</span>
                  </div>
                ))}
                {dayItems.length === 0 && <span className="cal-empty">—</span>}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  /* ─── Day view ─── */
  const REFEICOES = ['cafe', 'almoco', 'lanche', 'jantar']
  function renderDay() {
    const dayItems = itemsForDay(current)
    return (
      <div className="cal-day-view">
        <h2 className="cal-day-title">
          {current.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </h2>
        <div className="cal-day-cards">
          {REFEICOES.map(tipo => {
            const its = dayItems.filter(i => i.tipo_refeicao === tipo)
            return (
              <div key={tipo} className={`cal-day-card refeicao-${tipo}`}>
                <div className="cal-day-card-header">
                  <span className={`cal-chip ${TIPO_CORES[tipo]}`}>{TIPO_LABELS[tipo]}</span>
                  <button
                    className="btn btn-sm btn-outline"
                    onClick={() => navigate(`/dashboard?data=${fmt(current)}`)}
                  >
                    ✏ Editar
                  </button>
                </div>
                {its.length === 0
                  ? <p className="cal-day-empty">Nenhum item cadastrado</p>
                  : its.map(it => <p key={it.id} className="cal-day-desc">{it.descricao}</p>)
                }
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  /* ─── Modal ─── */
  async function handleAddRefeicao(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await createCardapioItem(modalData)
      setShowModal(false)
      setModalData({ data: fmt(today), tipo_refeicao: 'almoco', descricao: '' })
      fetchData()
    } catch {
      /* silently fail */
    } finally {
      setSaving(false)
    }
  }

  function periodLabel() {
    if (view === 'mes') return current.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    if (view === 'semana') {
      const s = startOfWeek(current)
      const e = addDays(s, 6)
      return `${s.getDate()} – ${e.getDate()} de ${e.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`
    }
    return current.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
  }

  return (
    <div className="cal-page" data-theme={theme}>
      {/* Navbar */}
      <nav className="cal-nav">
        <span className="cal-nav-logo">🌿 Cardápio</span>
        <div className="cal-nav-right">
          <ThemeToggle />
          <span className="cal-nav-user">{user?.email}</span>
          <button className="btn btn-sm btn-ghost" onClick={logout}>Sair</button>
        </div>
      </nav>

      <div className="cal-container">
        {/* Toolbar */}
        <div className="cal-toolbar">
          <div className="cal-view-toggle">
            {(['mes','semana','dia'] as ViewMode[]).map(v => (
              <button key={v} className={`btn btn-sm${view === v ? ' btn-primary' : ' btn-ghost'}`} onClick={() => setView(v)}>
                {v === 'mes' ? 'Mês' : v === 'semana' ? 'Semana' : 'Dia'}
              </button>
            ))}
          </div>
          <div className="cal-nav-period">
            <button className="btn btn-sm btn-outline" onClick={() => navigate_period(-1)}>← Anterior</button>
            <span className="cal-period-label">{periodLabel()}</span>
            <button className="btn btn-sm btn-outline" onClick={goToday}>Hoje</button>
            <button className="btn btn-sm btn-outline" onClick={() => navigate_period(1)}>Próximo →</button>
          </div>
          <button className="btn btn-sm btn-primary" onClick={() => setShowModal(true)}>+ Adicionar refeição</button>
        </div>

        {loading && <div className="cal-loading">Carregando…</div>}
        {!loading && view === 'mes' && renderMonth()}
        {!loading && view === 'semana' && renderWeek()}
        {!loading && view === 'dia' && renderDay()}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="cal-modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="cal-modal" onClick={e => e.stopPropagation()}>
            <h3>Adicionar refeição</h3>
            <form onSubmit={handleAddRefeicao} className="cal-modal-form">
              <div className="field">
                <label className="field-label">Data</label>
                <input type="date" className="field-input" value={modalData.data}
                  onChange={e => setModalData(p => ({ ...p, data: e.target.value }))} required />
              </div>
              <div className="field">
                <label className="field-label">Tipo de refeição</label>
                <select className="field-input" value={modalData.tipo_refeicao}
                  onChange={e => setModalData(p => ({ ...p, tipo_refeicao: e.target.value }))}>
                  <option value="cafe">Café da manhã</option>
                  <option value="almoco">Almoço</option>
                  <option value="lanche">Lanche</option>
                  <option value="jantar">Jantar</option>
                </select>
              </div>
              <div className="field">
                <label className="field-label">Descrição</label>
                <textarea className="field-input" rows={3} value={modalData.descricao}
                  onChange={e => setModalData(p => ({ ...p, descricao: e.target.value }))} required />
              </div>
              <div className="cal-modal-actions">
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <span className="spinner" /> : null} Salvar
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
