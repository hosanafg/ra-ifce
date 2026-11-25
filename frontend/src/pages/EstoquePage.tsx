import React, { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  AlertCircle,
  CheckCircle2,
  Package,
  Plus,
  Search,
  Trash2,
} from 'lucide-react'
import AppLayout from '../components/AppLayout'
import { useAuth } from '../contexts/AuthContext'
import {
  criarAlimentoApi,
  listarAlimentosApi,
  listarInsumosApi,
  registrarEntradaApi,
  resumoEstoqueApi,
} from '../services/api'
import type { AlimentoResponse, EstoqueResumo, InsumoResponse } from '../types'

interface ItemForm {
  modo: 'existente' | 'novo'
  alimentoId: string
  novoNome: string
  novaUnidade: string
  quantidade: string
  lote: string
  validade: string
}

const emptyItem = (): ItemForm => ({
  modo: 'existente',
  alimentoId: '',
  novoNome: '',
  novaUnidade: 'kg',
  quantidade: '',
  lote: '',
  validade: '',
})

export default function EstoquePage() {
  const { user } = useAuth()
  const [params, setParams] = useSearchParams()
  const isEstoquista = user?.papel === 'ESTOQUISTA' || user?.papel === 'ADMIN'

  const tabParam = params.get('tab') || 'resumo'
  const [tab, setTab] = useState(tabParam)

  const [resumo, setResumo] = useState<EstoqueResumo[]>([])
  const [insumos, setInsumos] = useState<InsumoResponse[]>([])
  const [alimentos, setAlimentos] = useState<AlimentoResponse[]>([])
  const [busca, setBusca] = useState('')
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [toast, setToast] = useState('')

  // Novo alimento
  const [nomeAlimento, setNomeAlimento] = useState('')
  const [unidadeAlimento, setUnidadeAlimento] = useState('kg')
  const [salvandoAlimento, setSalvandoAlimento] = useState(false)

  // Nova entrada
  const [dataEntrada, setDataEntrada] = useState(() => new Date().toISOString().slice(0, 10))
  const [itensEntrada, setItensEntrada] = useState<ItemForm[]>([emptyItem()])
  const [salvandoEntrada, setSalvandoEntrada] = useState(false)

  useEffect(() => {
    setTab(tabParam)
  }, [tabParam])

  function changeTab(next: string) {
    setTab(next)
    setParams({ tab: next })
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3500)
  }

  async function carregarTudo() {
    setLoading(true)
    setErro('')
    try {
      const promises: Promise<unknown>[] = [
        resumoEstoqueApi().then(setResumo),
        listarAlimentosApi().then(setAlimentos),
      ]
      if (isEstoquista) {
        promises.push(listarInsumosApi().then(setInsumos))
      }
      await Promise.all(promises)
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao carregar estoque')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarTudo()
  }, [isEstoquista])

  async function handleCriarAlimento(e: React.FormEvent) {
    e.preventDefault()
    setSalvandoAlimento(true)
    setErro('')
    try {
      await criarAlimentoApi({
        nome: nomeAlimento.trim(),
        unidade: unidadeAlimento.trim() || 'kg',
      })
      setNomeAlimento('')
      setUnidadeAlimento('kg')
      await carregarTudo()
      showToast('Alimento cadastrado com sucesso!')
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao cadastrar alimento')
    } finally {
      setSalvandoAlimento(false)
    }
  }

  async function handleRegistrarEntrada(e: React.FormEvent) {
    e.preventDefault()
    setSalvandoEntrada(true)
    setErro('')
    try {
      const itens = itensEntrada.map(it => ({
        alimentoId: it.modo === 'existente' ? Number(it.alimentoId) : null,
        novoAlimento:
          it.modo === 'novo'
            ? { nome: it.novoNome.trim(), unidade: it.novaUnidade.trim() || 'kg' }
            : null,
        quantidade: Number(it.quantidade),
        lote: it.lote.trim(),
        validade: it.validade,
      }))
      const res = await registrarEntradaApi({ dataEntrada, itens })
      setItensEntrada([emptyItem()])
      await carregarTudo()
      showToast(`Nota de entrada #${res.notaId} registrada com ${res.insumos.length} lote(s)!`)
      changeTab('insumos')
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao registrar nota de entrada')
    } finally {
      setSalvandoEntrada(false)
    }
  }

  const hojeStr = new Date().toISOString().slice(0, 10)
  const resumoFiltrado = resumo.filter(r =>
    r.alimento.toLowerCase().includes(busca.toLowerCase())
  )
  const insumosFiltrados = insumos.filter(
    i =>
      i.alimento.toLowerCase().includes(busca.toLowerCase()) ||
      i.lote.toLowerCase().includes(busca.toLowerCase())
  )

  return (
    <AppLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Estoque &amp; Insumos</h1>
          <p className="page-subtitle">
            Controle de alimentos, lotes com validade (PEPS) e notas de entrada
          </p>
        </div>
      </div>

      <div className="tabs">
        <button
          type="button"
          className={`tab-btn ${tab === 'resumo' ? 'active' : ''}`}
          onClick={() => changeTab('resumo')}
        >
          Resumo Disponível
        </button>
        {isEstoquista && (
          <button
            type="button"
            className={`tab-btn ${tab === 'insumos' ? 'active' : ''}`}
            onClick={() => changeTab('insumos')}
          >
            Lotes em Estoque
          </button>
        )}
        <button
          type="button"
          className={`tab-btn ${tab === 'alimentos' ? 'active' : ''}`}
          onClick={() => changeTab('alimentos')}
        >
          Alimentos
        </button>
        {isEstoquista && (
          <button
            type="button"
            className={`tab-btn ${tab === 'entrada' ? 'active' : ''}`}
            onClick={() => changeTab('entrada')}
          >
            <Plus size={15} /> Nova Nota de Entrada
          </button>
        )}
      </div>

      {erro && (
        <div className="alert alert-error" style={{ marginBottom: '1.25rem' }}>
          <AlertCircle size={17} className="alert-icon" />
          <span>{erro}</span>
        </div>
      )}

      {(tab === 'resumo' || tab === 'insumos') && (
        <div className="field" style={{ maxWidth: '340px', marginBottom: '1.25rem' }}>
          <div className="field-input-wrap">
            <span className="field-input-icon"><Search size={16} /></span>
            <input
              type="text"
              className="field-input has-icon-left"
              placeholder="Filtrar por alimento ou lote..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
            />
          </div>
        </div>
      )}

      {loading ? (
        <div className="card empty-state">Carregando dados do estoque...</div>
      ) : tab === 'resumo' ? (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Alimento</th>
                <th>Unidade</th>
                <th>Quantidade Disponível</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {resumoFiltrado.length === 0 ? (
                <tr>
                  <td colSpan={4} className="empty-state">Nenhum alimento encontrado.</td>
                </tr>
              ) : (
                resumoFiltrado.map(item => (
                  <tr key={item.alimentoId}>
                    <td><strong>{item.alimento}</strong></td>
                    <td>{item.unidade}</td>
                    <td>{item.quantidadeDisponivel}</td>
                    <td>
                      <span className={`badge ${Number(item.quantidadeDisponivel) > 0 ? '' : 'badge-error'}`}>
                        {Number(item.quantidadeDisponivel) > 0 ? 'Disponível' : 'Sem estoque'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : tab === 'insumos' && isEstoquista ? (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Alimento</th>
                <th>Lote</th>
                <th>Quantidade</th>
                <th>Data Entrada</th>
                <th>Validade</th>
                <th>Situação</th>
              </tr>
            </thead>
            <tbody>
              {insumosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="empty-state">Nenhum lote em estoque.</td>
                </tr>
              ) : (
                insumosFiltrados.map(ins => {
                  const vencido = ins.validade < hojeStr
                  return (
                    <tr key={ins.id}>
                      <td><strong>{ins.alimento}</strong></td>
                      <td>{ins.lote}</td>
                      <td>{ins.quantidade} {ins.unidade}</td>
                      <td>{ins.dataEntrada}</td>
                      <td>{ins.validade}</td>
                      <td>
                        <span className={`badge ${vencido ? 'badge-error' : ''}`}>
                          {vencido ? 'Vencido' : 'Válido'}
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      ) : tab === 'alimentos' ? (
        <div className="form-stack" style={{ gap: '1.5rem' }}>
          {isEstoquista && (
            <div className="card">
              <h2 className="section-title">Cadastrar Alimento</h2>
              <form onSubmit={handleCriarAlimento} className="form-grid-2" style={{ alignItems: 'end' }}>
                <div className="field">
                  <label className="field-label" htmlFor="alimento-nome">Nome do alimento</label>
                  <input
                    id="alimento-nome"
                    className="field-input"
                    value={nomeAlimento}
                    onChange={e => setNomeAlimento(e.target.value)}
                    placeholder="Ex.: Arroz branco"
                    required
                    maxLength={100}
                  />
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="alimento-unidade">Unidade</label>
                  <input
                    id="alimento-unidade"
                    className="field-input"
                    value={unidadeAlimento}
                    onChange={e => setUnidadeAlimento(e.target.value)}
                    placeholder="kg, L, un..."
                    maxLength={20}
                  />
                </div>
                <div>
                  <button type="submit" className="btn btn-primary" disabled={salvandoAlimento}>
                    {salvandoAlimento ? <span className="spinner" /> : <><Plus size={16} /> Cadastrar</>}
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nome</th>
                  <th>Unidade</th>
                </tr>
              </thead>
              <tbody>
                {alimentos.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="empty-state">Nenhum alimento cadastrado.</td>
                  </tr>
                ) : (
                  alimentos.map(a => (
                    <tr key={a.id}>
                      <td>#{a.id}</td>
                      <td><strong>{a.nome}</strong></td>
                      <td>{a.unidade}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : tab === 'entrada' && isEstoquista ? (
        <div className="card">
          <h2 className="section-title">Nova Nota de Entrada</h2>
          <form onSubmit={handleRegistrarEntrada} className="form-stack">
            <div className="field" style={{ maxWidth: '240px' }}>
              <label className="field-label" htmlFor="dataEntrada">Data da entrada</label>
              <input
                id="dataEntrada"
                type="date"
                className="field-input"
                value={dataEntrada}
                onChange={e => setDataEntrada(e.target.value)}
                required
              />
            </div>

            {itensEntrada.map((item, idx) => (
              <div
                key={idx}
                style={{
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1rem',
                  background: 'var(--bg-surface-alt)',
                }}
              >
                <div className="row-actions" style={{ justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                  <strong>Item #{idx + 1}</strong>
                  <div className="row-actions">
                    <button
                      type="button"
                      className={`btn btn-sm ${item.modo === 'existente' ? 'btn-primary' : 'btn-outline'}`}
                      onClick={() =>
                        setItensEntrada(prev =>
                          prev.map((p, i) => (i === idx ? { ...p, modo: 'existente' } : p))
                        )
                      }
                    >
                      Alimento existente
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm ${item.modo === 'novo' ? 'btn-primary' : 'btn-outline'}`}
                      onClick={() =>
                        setItensEntrada(prev =>
                          prev.map((p, i) => (i === idx ? { ...p, modo: 'novo' } : p))
                        )
                      }
                    >
                      Cadastrar novo na hora
                    </button>
                    {itensEntrada.length > 1 && (
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        onClick={() => setItensEntrada(prev => prev.filter((_, i) => i !== idx))}
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="form-grid-2">
                  {item.modo === 'existente' ? (
                    <div className="field">
                      <label className="field-label">Alimento</label>
                      <select
                        className="field-input"
                        value={item.alimentoId}
                        onChange={e =>
                          setItensEntrada(prev =>
                            prev.map((p, i) => (i === idx ? { ...p, alimentoId: e.target.value } : p))
                          )
                        }
                        required
                      >
                        <option value="">Selecione...</option>
                        {alimentos.map(a => (
                          <option key={a.id} value={a.id}>
                            {a.nome} ({a.unidade})
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <>
                      <div className="field">
                        <label className="field-label">Nome do novo alimento</label>
                        <input
                          className="field-input"
                          value={item.novoNome}
                          onChange={e =>
                            setItensEntrada(prev =>
                              prev.map((p, i) => (i === idx ? { ...p, novoNome: e.target.value } : p))
                            )
                          }
                          placeholder="Ex.: Feijão carioca"
                          required
                        />
                      </div>
                      <div className="field">
                        <label className="field-label">Unidade</label>
                        <input
                          className="field-input"
                          value={item.novaUnidade}
                          onChange={e =>
                            setItensEntrada(prev =>
                              prev.map((p, i) => (i === idx ? { ...p, novaUnidade: e.target.value } : p))
                            )
                          }
                          placeholder="kg"
                          required
                        />
                      </div>
                    </>
                  )}

                  <div className="field">
                    <label className="field-label">Quantidade</label>
                    <input
                      type="number"
                      step="0.001"
                      min="0.001"
                      className="field-input"
                      value={item.quantidade}
                      onChange={e =>
                        setItensEntrada(prev =>
                          prev.map((p, i) => (i === idx ? { ...p, quantidade: e.target.value } : p))
                        )
                      }
                      placeholder="Ex.: 50"
                      required
                    />
                  </div>

                  <div className="field">
                    <label className="field-label">Lote</label>
                    <input
                      className="field-input"
                      value={item.lote}
                      onChange={e =>
                        setItensEntrada(prev =>
                          prev.map((p, i) => (i === idx ? { ...p, lote: e.target.value } : p))
                        )
                      }
                      placeholder="Ex.: L001"
                      required
                    />
                  </div>

                  <div className="field">
                    <label className="field-label">Validade</label>
                    <input
                      type="date"
                      className="field-input"
                      value={item.validade}
                      onChange={e =>
                        setItensEntrada(prev =>
                          prev.map((p, i) => (i === idx ? { ...p, validade: e.target.value } : p))
                        )
                      }
                      required
                    />
                  </div>
                </div>
              </div>
            ))}

            <div className="row-actions" style={{ justifyContent: 'space-between' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setItensEntrada(prev => [...prev, emptyItem()])}
              >
                <Plus size={16} /> Adicionar outro item
              </button>

              <button type="submit" className="btn btn-primary" disabled={salvandoEntrada}>
                {salvandoEntrada ? <span className="spinner" /> : <><Package size={16} /> Registrar Nota de Entrada</>}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {toast && (
        <div className="toast">
          <CheckCircle2 size={18} />
          <span>{toast}</span>
        </div>
      )}
    </AppLayout>
  )
}
