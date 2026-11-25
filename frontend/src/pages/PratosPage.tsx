import React, { useEffect, useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Plus,
  Search,
  Trash2,
  UtensilsCrossed,
  X,
} from 'lucide-react'
import AppLayout from '../components/AppLayout'
import { useAuth } from '../contexts/AuthContext'
import {
  criarPratoApi,
  disponibilidadePratoApi,
  listarAlimentosApi,
  listarPratosApi,
  pratosDisponiveisApi,
} from '../services/api'
import type { AlimentoResponse, DisponibilidadeResponse, PratoResponse } from '../types'

interface IngredienteForm {
  alimentoId: string
  quantidadePorKg: string
}

export default function PratosPage() {
  const { user } = useAuth()
  const isNutri = user?.papel === 'NUTRICIONISTA' || user?.papel === 'ADMIN'

  const [pratos, setPratos] = useState<PratoResponse[]>([])
  const [alimentos, setAlimentos] = useState<AlimentoResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [toast, setToast] = useState('')
  const [busca, setBusca] = useState('')

  // Filtro de disponibilidade
  const [pesoSimulacao, setPesoSimulacao] = useState('10')
  const [somenteDisponiveis, setSomenteDisponiveis] = useState(false)
  const [disponiveisIds, setDisponiveisIds] = useState<Set<number> | null>(null)
  const [detalheDisp, setDetalheDisp] = useState<Record<number, DisponibilidadeResponse>>({})

  // Modal Novo Prato
  const [modalNovo, setModalNovo] = useState(false)
  const [nome, setNome] = useState('')
  const [modoPreparo, setModoPreparo] = useState('')
  const [tempoPreparoMinutos, setTempoPreparoMinutos] = useState('')
  const [rendimentoPorcoes, setRendimentoPorcoes] = useState('')
  const [ingredientes, setIngredientes] = useState<IngredienteForm[]>([
    { alimentoId: '', quantidadePorKg: '' },
  ])
  const [salvando, setSalvando] = useState(false)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3500)
  }

  async function carregar() {
    setLoading(true)
    setErro('')
    try {
      const [p, a] = await Promise.all([listarPratosApi(), listarAlimentosApi()])
      setPratos(p)
      setAlimentos(a)
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao carregar pratos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregar()
  }, [])

  async function handleSimularDisponiveis() {
    if (!isNutri) return
    setErro('')
    try {
      const peso = Number(pesoSimulacao) || 1
      const list = await pratosDisponiveisApi(peso)
      setDisponiveisIds(new Set(list.map(p => p.id)))
      setSomenteDisponiveis(true)
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao verificar pratos disponíveis')
    }
  }

  async function handleChecarPrato(pratoId: number) {
    try {
      const peso = Number(pesoSimulacao) || 1
      const res = await disponibilidadePratoApi(pratoId, peso)
      setDetalheDisp(prev => ({ ...prev, [pratoId]: res }))
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao verificar disponibilidade')
    }
  }

  async function handleCriarPrato(e: React.FormEvent) {
    e.preventDefault()
    setSalvando(true)
    setErro('')
    try {
      await criarPratoApi({
        nome: nome.trim(),
        fichaTecnica: ingredientes.map(i => ({
          alimentoId: Number(i.alimentoId),
          quantidadePorKg: Number(i.quantidadePorKg),
        })),
        receita: {
          modoPreparo: modoPreparo.trim(),
          tempoPreparoMinutos: tempoPreparoMinutos ? Number(tempoPreparoMinutos) : null,
          rendimentoPorcoes: rendimentoPorcoes ? Number(rendimentoPorcoes) : null,
        },
      })
      setModalNovo(false)
      setNome('')
      setModoPreparo('')
      setTempoPreparoMinutos('')
      setRendimentoPorcoes('')
      setIngredientes([{ alimentoId: '', quantidadePorKg: '' }])
      await carregar()
      showToast('Prato criado com sucesso!')
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao criar prato')
    } finally {
      setSalvando(false)
    }
  }

  const filtrados = pratos.filter(p => {
    const matchBusca = p.nome.toLowerCase().includes(busca.toLowerCase())
    const matchDisp = !somenteDisponiveis || !disponiveisIds || disponiveisIds.has(p.id)
    return matchBusca && matchDisp
  })

  return (
    <AppLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Pratos &amp; Fichas Técnicas</h1>
          <p className="page-subtitle">
            Receitas, proporções por kg e simulação de disponibilidade em estoque
          </p>
        </div>
        {isNutri && (
          <button type="button" className="btn btn-primary" onClick={() => setModalNovo(true)}>
            <Plus size={17} /> Novo Prato
          </button>
        )}
      </div>

      {erro && (
        <div className="alert alert-error" style={{ marginBottom: '1.25rem' }}>
          <AlertCircle size={17} className="alert-icon" />
          <span>{erro}</span>
        </div>
      )}

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="row-actions" style={{ justifyContent: 'space-between' }}>
          <div className="field" style={{ flex: '1 1 240px', maxWidth: '340px' }}>
            <div className="field-input-wrap">
              <span className="field-input-icon"><Search size={16} /></span>
              <input
                className="field-input has-icon-left"
                placeholder="Buscar prato..."
                value={busca}
                onChange={e => setBusca(e.target.value)}
              />
            </div>
          </div>

          {isNutri && (
            <div className="row-actions">
              <label className="field-label" htmlFor="peso-sim">Simular peso (kg):</label>
              <input
                id="peso-sim"
                type="number"
                min="0.1"
                step="0.5"
                className="field-input"
                style={{ width: '100px' }}
                value={pesoSimulacao}
                onChange={e => setPesoSimulacao(e.target.value)}
              />
              <button type="button" className="btn btn-outline btn-sm" onClick={handleSimularDisponiveis}>
                Filtrar possíveis
              </button>
              {somenteDisponiveis && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setSomenteDisponiveis(false)}
                >
                  Mostrar todos
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="card empty-state">Carregando pratos...</div>
      ) : filtrados.length === 0 ? (
        <div className="card empty-state">Nenhum prato encontrado.</div>
      ) : (
        <div className="form-stack">
          {filtrados.map(prato => {
            const disp = detalheDisp[prato.id]
            return (
              <div key={prato.id} className="card">
                <div className="row-actions" style={{ justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <div>
                    <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <UtensilsCrossed size={19} color="var(--accent)" />
                      {prato.nome}
                    </h2>
                    <div className="row-actions" style={{ marginTop: '0.35rem', color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>
                      {prato.receita.tempoPreparoMinutos && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Clock size={14} /> {prato.receita.tempoPreparoMinutos} min
                        </span>
                      )}
                      {prato.receita.rendimentoPorcoes && (
                        <span>· {prato.receita.rendimentoPorcoes} porções</span>
                      )}
                    </div>
                  </div>

                  {isNutri && (
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => handleChecarPrato(prato.id)}
                    >
                      Checar estoque ({pesoSimulacao || 1} kg)
                    </button>
                  )}
                </div>

                {disp && (
                  <div className={`alert ${disp.possivel ? 'alert-success' : 'alert-warning'}`} style={{ marginBottom: '0.85rem' }}>
                    {disp.possivel ? (
                      <span>Estoque suficiente para produzir {pesoSimulacao || 1} kg deste prato.</span>
                    ) : (
                      <span>Faltam insumos: {disp.faltas.join(', ')}</span>
                    )}
                  </div>
                )}

                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginBottom: '0.85rem' }}>
                  <strong>Modo de preparo:</strong> {prato.receita.modoPreparo}
                </p>

                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Ingrediente</th>
                        <th>Qtd. por 1 kg de prato</th>
                      </tr>
                    </thead>
                    <tbody>
                      {prato.fichaTecnica.map(ing => (
                        <tr key={ing.alimentoId}>
                          <td>{ing.alimento}</td>
                          <td>{ing.quantidadePorKg} {ing.unidade}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {modalNovo && (
        <div className="modal-backdrop" onClick={() => setModalNovo(false)}>
          <div className="modal-card" style={{ maxWidth: '640px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Novo Prato</h3>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setModalNovo(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCriarPrato} className="form-stack">
              <div className="field">
                <label className="field-label">Nome do prato</label>
                <input
                  className="field-input"
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  placeholder="Ex.: Arroz branco"
                  required
                  maxLength={150}
                />
              </div>

              <div className="form-grid-2">
                <div className="field">
                  <label className="field-label">Tempo de preparo (min)</label>
                  <input
                    type="number"
                    min="1"
                    className="field-input"
                    value={tempoPreparoMinutos}
                    onChange={e => setTempoPreparoMinutos(e.target.value)}
                    placeholder="30"
                  />
                </div>
                <div className="field">
                  <label className="field-label">Rendimento (porções)</label>
                  <input
                    type="number"
                    min="1"
                    className="field-input"
                    value={rendimentoPorcoes}
                    onChange={e => setRendimentoPorcoes(e.target.value)}
                    placeholder="10"
                  />
                </div>
              </div>

              <div className="field">
                <label className="field-label">Modo de preparo</label>
                <textarea
                  className="field-input"
                  rows={3}
                  value={modoPreparo}
                  onChange={e => setModoPreparo(e.target.value)}
                  placeholder="Descreva o passo a passo da receita..."
                  required
                />
              </div>

              <div>
                <div className="row-actions" style={{ justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span className="field-label">Ficha Técnica (por 1 kg do prato)</span>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() =>
                      setIngredientes(prev => [...prev, { alimentoId: '', quantidadePorKg: '' }])
                    }
                  >
                    <Plus size={14} /> Ingrediente
                  </button>
                </div>

                <div className="form-stack" style={{ gap: '0.6rem' }}>
                  {ingredientes.map((ing, idx) => (
                    <div key={idx} className="row-actions">
                      <select
                        className="field-input"
                        style={{ flex: 2 }}
                        value={ing.alimentoId}
                        onChange={e =>
                          setIngredientes(prev =>
                            prev.map((p, i) => (i === idx ? { ...p, alimentoId: e.target.value } : p))
                          )
                        }
                        required
                      >
                        <option value="">Selecione o alimento...</option>
                        {alimentos.map(a => (
                          <option key={a.id} value={a.id}>
                            {a.nome} ({a.unidade})
                          </option>
                        ))}
                      </select>

                      <input
                        type="number"
                        step="0.001"
                        min="0.001"
                        className="field-input"
                        style={{ flex: 1 }}
                        placeholder="Qtd/kg"
                        value={ing.quantidadePorKg}
                        onChange={e =>
                          setIngredientes(prev =>
                            prev.map((p, i) =>
                              i === idx ? { ...p, quantidadePorKg: e.target.value } : p
                            )
                          )
                        }
                        required
                      />

                      {ingredientes.length > 1 && (
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => setIngredientes(prev => prev.filter((_, i) => i !== idx))}
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
                  {salvando ? <span className="spinner" /> : 'Salvar Prato'}
                </button>
              </div>
            </form>
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
