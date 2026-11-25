import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Plus,
  Star,
  Trash2,
  X,
} from 'lucide-react'
import AppLayout from '../components/AppLayout'
import { useAuth } from '../contexts/AuthContext'
import {
  avaliacoesCardapioApi,
  criarCardapioApi,
  gerarRetiradaApi,
  listarCardapiosApi,
  listarPratosApi,
} from '../services/api'
import type { CardapioResponse, PratoResponse, ResumoAvaliacao } from '../types'

interface ItemCardapioForm {
  pratoId: string
  dia: string
  pesoKg: string
}

export default function CardapiosPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const isNutri = user?.papel === 'NUTRICIONISTA' || user?.papel === 'ADMIN'
  const isEstoquista = user?.papel === 'ESTOQUISTA' || user?.papel === 'ADMIN'

  const [cardapios, setCardapios] = useState<CardapioResponse[]>([])
  const [pratos, setPratos] = useState<PratoResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [toast, setToast] = useState('')

  // Modal Novo Cardápio
  const [modalNovo, setModalNovo] = useState(false)
  const [semanaInicio, setSemanaInicio] = useState(() => new Date().toISOString().slice(0, 10))
  const [itens, setItens] = useState<ItemCardapioForm[]>([
    { pratoId: '', dia: new Date().toISOString().slice(0, 10), pesoKg: '10' },
  ])
  const [salvando, setSalvando] = useState(false)
  const [erroModal, setErroModal] = useState('')

  // Modal Avaliações
  const [avaliacoes, setAvaliacoes] = useState<{ cardapioId: number; lista: ResumoAvaliacao[] } | null>(
    null
  )

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3500)
  }

  async function carregar() {
    setLoading(true)
    setErro('')
    try {
      const [c, p] = await Promise.all([listarCardapiosApi(), listarPratosApi()])
      setCardapios(c)
      setPratos(p)
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao carregar cardápios')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregar()
  }, [])

  async function handleCriarCardapio(e: React.FormEvent) {
    e.preventDefault()
    setSalvando(true)
    setErroModal('')
    try {
      await criarCardapioApi({
        semanaInicio,
        itens: itens.map(i => ({
          pratoId: Number(i.pratoId),
          dia: i.dia,
          pesoKg: Number(i.pesoKg),
        })),
      })
      setModalNovo(false)
      setItens([{ pratoId: '', dia: semanaInicio, pesoKg: '10' }])
      await carregar()
      showToast('Cardápio semanal criado com sucesso!')
    } catch (err) {
      setErroModal(err instanceof Error ? err.message : 'Erro ao criar cardápio')
    } finally {
      setSalvando(false)
    }
  }

  async function handleVerAvaliacoes(cardapioId: number) {
    setErro('')
    try {
      const lista = await avaliacoesCardapioApi(cardapioId)
      setAvaliacoes({ cardapioId, lista })
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao carregar avaliações')
    }
  }

  async function handleGerarRetirada(cardapioId: number) {
    setErro('')
    try {
      const nota = await gerarRetiradaApi(cardapioId)
      const histRaw = localStorage.getItem('cozinha_retiradas_ids')
      const hist: number[] = histRaw ? (JSON.parse(histRaw) as number[]) : []
      if (!hist.includes(nota.id)) {
        localStorage.setItem('cozinha_retiradas_ids', JSON.stringify([nota.id, ...hist]))
      }
      navigate(`/retiradas?id=${nota.id}`)
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao gerar nota de retirada')
    }
  }

  return (
    <AppLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Cardápios Semanais</h1>
          <p className="page-subtitle">
            Planejamento semanal validado contra o estoque atual e acompanhamento de notas
          </p>
        </div>
        {isNutri && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setErroModal('')
              setModalNovo(true)
            }}
          >
            <Plus size={17} /> Novo Cardápio
          </button>
        )}
      </div>

      {erro && (
        <div className="alert alert-error" style={{ marginBottom: '1.25rem' }}>
          <AlertCircle size={17} className="alert-icon" />
          <span>{erro}</span>
        </div>
      )}

      {loading ? (
        <div className="card empty-state">Carregando cardápios...</div>
      ) : cardapios.length === 0 ? (
        <div className="card empty-state">Nenhum cardápio cadastrado ainda.</div>
      ) : (
        <div className="form-stack">
          {cardapios.map(c => (
            <div key={c.id} className="card">
              <div className="row-actions" style={{ justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div>
                  <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CalendarDays size={19} color="var(--accent)" />
                    Cardápio #{c.id} — Semana de {c.semanaInicio}
                  </h2>
                  <p className="page-subtitle">Criado por: {c.criadoPor}</p>
                </div>

                <div className="row-actions">
                  {isNutri && (
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => handleVerAvaliacoes(c.id)}
                    >
                      <Star size={15} /> Avaliações
                    </button>
                  )}
                  {isEstoquista && (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => handleGerarRetirada(c.id)}
                    >
                      <ClipboardList size={15} /> Gerar Nota de Retirada
                    </button>
                  )}
                </div>
              </div>

              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Prato</th>
                      <th>Peso Programado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {c.itens.map(item => (
                      <tr key={item.id}>
                        <td>{item.dia}</td>
                        <td><strong>{item.prato}</strong></td>
                        <td>{item.pesoKg} kg</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalNovo && (
        <div className="modal-backdrop" onClick={() => setModalNovo(false)}>
          <div className="modal-card" style={{ maxWidth: '640px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Novo Cardápio Semanal</h3>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setModalNovo(false)}>
                <X size={18} />
              </button>
            </div>

            {erroModal && (
              <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
                <AlertCircle size={17} className="alert-icon" />
                <span>{erroModal}</span>
              </div>
            )}

            <form onSubmit={handleCriarCardapio} className="form-stack">
              <div className="field" style={{ maxWidth: '240px' }}>
                <label className="field-label">Início da semana</label>
                <input
                  type="date"
                  className="field-input"
                  value={semanaInicio}
                  onChange={e => setSemanaInicio(e.target.value)}
                  required
                />
              </div>

              <div>
                <div className="row-actions" style={{ justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span className="field-label">Pratos da semana</span>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() =>
                      setItens(prev => [...prev, { pratoId: '', dia: semanaInicio, pesoKg: '10' }])
                    }
                  >
                    <Plus size={14} /> Adicionar dia/prato
                  </button>
                </div>

                <div className="form-stack" style={{ gap: '0.65rem' }}>
                  {itens.map((item, idx) => (
                    <div key={idx} className="row-actions">
                      <select
                        className="field-input"
                        style={{ flex: 2 }}
                        value={item.pratoId}
                        onChange={e =>
                          setItens(prev =>
                            prev.map((p, i) => (i === idx ? { ...p, pratoId: e.target.value } : p))
                          )
                        }
                        required
                      >
                        <option value="">Selecione o prato...</option>
                        {pratos.map(pr => (
                          <option key={pr.id} value={pr.id}>
                            {pr.nome}
                          </option>
                        ))}
                      </select>

                      <input
                        type="date"
                        className="field-input"
                        style={{ flex: 1.2 }}
                        value={item.dia}
                        onChange={e =>
                          setItens(prev =>
                            prev.map((p, i) => (i === idx ? { ...p, dia: e.target.value } : p))
                          )
                        }
                        required
                      />

                      <input
                        type="number"
                        step="0.5"
                        min="0.5"
                        className="field-input"
                        style={{ flex: 0.9 }}
                        placeholder="kg"
                        value={item.pesoKg}
                        onChange={e =>
                          setItens(prev =>
                            prev.map((p, i) => (i === idx ? { ...p, pesoKg: e.target.value } : p))
                          )
                        }
                        required
                      />

                      {itens.length > 1 && (
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => setItens(prev => prev.filter((_, i) => i !== idx))}
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="row-actions" style={{ justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setModalNovo(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={salvando}>
                  {salvando ? <span className="spinner" /> : 'Salvar Cardápio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {avaliacoes && (
        <div className="modal-backdrop" onClick={() => setAvaliacoes(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Avaliações — Cardápio #{avaliacoes.cardapioId}</h3>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAvaliacoes(null)}>
                <X size={18} />
              </button>
            </div>

            {avaliacoes.lista.length === 0 ? (
              <div className="empty-state">Nenhuma avaliação registrada para este cardápio.</div>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Dia</th>
                      <th>Prato</th>
                      <th>Média</th>
                      <th>Avaliações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {avaliacoes.lista.map(av => (
                      <tr key={av.itemCardapioId}>
                        <td>{av.dia}</td>
                        <td><strong>{av.prato}</strong></td>
                        <td>
                          <span className="badge">
                            <Star size={12} fill="currentColor" /> {av.media.toFixed(1)}
                          </span>
                        </td>
                        <td>{av.totalAvaliacoes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {toast && (
        <div className="toast">
          <CheckCircle2 size={18} />
          <span>{toast}</span>
        </div>
      )}
    </AppLayout>
  )
}
