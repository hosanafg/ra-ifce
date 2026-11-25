import React, { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  AlertCircle,
  CheckCircle2,
  ClipboardCheck,
  Search,
} from 'lucide-react'
import AppLayout from '../components/AppLayout'
import {
  buscarRetiradaApi,
  confirmarRetiradaApi,
  editarItemRetiradaApi,
  gerarRetiradaApi,
  listarCardapiosApi,
} from '../services/api'
import type { CardapioResponse, NotaRetiradaResponse } from '../types'

export default function RetiradasPage() {
  const [params, setParams] = useSearchParams()
  const initialId = params.get('id') || ''

  const [cardapios, setCardapios] = useState<CardapioResponse[]>([])
  const [cardapioSelecionado, setCardapioSelecionado] = useState('')
  const [notaIdBusca, setNotaIdBusca] = useState(initialId)
  const [nota, setNota] = useState<NotaRetiradaResponse | null>(null)
  const [quantidades, setQuantidades] = useState<Record<number, string>>({})
  const [historicoIds, setHistoricoIds] = useState<number[]>(() => {
    try {
      const raw = localStorage.getItem('cozinha_retiradas_ids')
      return raw ? (JSON.parse(raw) as number[]) : []
    } catch {
      return []
    }
  })

  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [toast, setToast] = useState('')

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3500)
  }

  function registrarHistorico(id: number) {
    setHistoricoIds(prev => {
      const next = prev.includes(id) ? prev : [id, ...prev]
      localStorage.setItem('cozinha_retiradas_ids', JSON.stringify(next))
      return next
    })
  }

  async function carregarNota(id: number) {
    setLoading(true)
    setErro('')
    try {
      const res = await buscarRetiradaApi(id)
      setNota(res)
      const qMap: Record<number, string> = {}
      res.itens.forEach(i => {
        qMap[i.id] = String(i.quantidade)
      })
      setQuantidades(qMap)
      registrarHistorico(res.id)
      setParams({ id: String(res.id) })
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Nota de retirada não encontrada')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    listarCardapiosApi().then(setCardapios).catch(() => {})
    if (initialId) {
      carregarNota(Number(initialId))
    }
  }, [])

  async function handleGerar(e: React.FormEvent) {
    e.preventDefault()
    if (!cardapioSelecionado) return
    setLoading(true)
    setErro('')
    try {
      const res = await gerarRetiradaApi(Number(cardapioSelecionado))
      setNota(res)
      const qMap: Record<number, string> = {}
      res.itens.forEach(i => {
        qMap[i.id] = String(i.quantidade)
      })
      setQuantidades(qMap)
      setNotaIdBusca(String(res.id))
      registrarHistorico(res.id)
      setParams({ id: String(res.id) })
      showToast(`Nota de retirada #${res.id} gerada!`)
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao gerar nota de retirada')
    } finally {
      setLoading(false)
    }
  }

  async function handleSalvarItem(itemId: number) {
    if (!nota) return
    setErro('')
    try {
      const qtd = Number(quantidades[itemId])
      const res = await editarItemRetiradaApi(nota.id, itemId, qtd)
      setNota(res)
      showToast('Quantidade atualizada!')
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao atualizar item')
    }
  }

  async function handleConfirmar() {
    if (!nota) return
    if (!confirm(`Confirmar baixa PEPS no estoque para a Nota #${nota.id}?`)) return
    setLoading(true)
    setErro('')
    try {
      const res = await confirmarRetiradaApi(nota.id)
      setNota(res)
      showToast(`Retirada #${res.id} confirmada e baixada do estoque!`)
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao confirmar retirada')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Notas de Retirada</h1>
          <p className="page-subtitle">
            Consolidação de ingredientes do cardápio e baixa PEPS no estoque
          </p>
        </div>
      </div>

      {erro && (
        <div className="alert alert-error" style={{ marginBottom: '1.25rem' }}>
          <AlertCircle size={17} className="alert-icon" />
          <span>{erro}</span>
        </div>
      )}

      <div className="form-grid-2" style={{ marginBottom: '1.5rem' }}>
        <div className="card">
          <h2 className="section-title">Gerar de um Cardápio</h2>
          <form onSubmit={handleGerar} className="row-actions">
            <select
              className="field-input"
              style={{ flex: 1 }}
              value={cardapioSelecionado}
              onChange={e => setCardapioSelecionado(e.target.value)}
              required
            >
              <option value="">Selecione o cardápio...</option>
              {cardapios.map(c => (
                <option key={c.id} value={c.id}>
                  Cardápio #{c.id} — Semana {c.semanaInicio}
                </option>
              ))}
            </select>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              Gerar Nota
            </button>
          </form>
        </div>

        <div className="card">
          <h2 className="section-title">Consultar Nota por ID</h2>
          <form
            onSubmit={e => {
              e.preventDefault()
              if (notaIdBusca) carregarNota(Number(notaIdBusca))
            }}
            className="row-actions"
          >
            <input
              type="number"
              min="1"
              className="field-input"
              style={{ flex: 1 }}
              placeholder="Ex.: 1"
              value={notaIdBusca}
              onChange={e => setNotaIdBusca(e.target.value)}
              required
            />
            <button type="submit" className="btn btn-outline" disabled={loading}>
              <Search size={16} /> Buscar
            </button>
          </form>

          {historicoIds.length > 0 && (
            <div className="row-actions" style={{ marginTop: '0.75rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Recentes:</span>
              {historicoIds.slice(0, 6).map(id => (
                <button
                  key={id}
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    setNotaIdBusca(String(id))
                    carregarNota(id)
                  }}
                >
                  #{id}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {nota && (
        <div className="card">
          <div className="row-actions" style={{ justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div>
              <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                Nota de Retirada #{nota.id}
                <span className={`badge ${nota.status === 'RETIRADA' ? '' : 'badge-warning'}`}>
                  {nota.status}
                </span>
              </h2>
              <p className="page-subtitle">
                Cardápio #{nota.cardapioId} · Criada em {new Date(nota.criadaEm).toLocaleString('pt-BR')}
                {nota.retiradaEm && ` · Retirada em ${new Date(nota.retiradaEm).toLocaleString('pt-BR')}`}
              </p>
            </div>

            {nota.status === 'RASCUNHO' && (
              <button type="button" className="btn btn-primary" onClick={handleConfirmar} disabled={loading}>
                <ClipboardCheck size={17} /> Confirmar Retirada (Baixa PEPS)
              </button>
            )}
          </div>

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Alimento</th>
                  <th>Unidade</th>
                  <th>Quantidade</th>
                  {nota.status === 'RASCUNHO' && <th>Ajustar</th>}
                </tr>
              </thead>
              <tbody>
                {nota.itens.map(item => (
                  <tr key={item.id}>
                    <td><strong>{item.alimento}</strong></td>
                    <td>{item.unidade}</td>
                    <td>
                      {nota.status === 'RASCUNHO' ? (
                        <input
                          type="number"
                          step="0.001"
                          min="0"
                          className="field-input"
                          style={{ width: '130px' }}
                          value={quantidades[item.id] ?? item.quantidade}
                          onChange={e =>
                            setQuantidades(prev => ({ ...prev, [item.id]: e.target.value }))
                          }
                        />
                      ) : (
                        item.quantidade
                      )}
                    </td>
                    {nota.status === 'RASCUNHO' && (
                      <td>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() => handleSalvarItem(item.id)}
                        >
                          Salvar qtd
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
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
