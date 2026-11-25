import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  CalendarDays,
  ClipboardList,
  Package,
  UtensilsCrossed,
} from 'lucide-react'
import AppLayout from '../components/AppLayout'
import { useAuth } from '../contexts/AuthContext'
import {
  listarCardapiosApi,
  listarInsumosApi,
  listarPratosApi,
  resumoEstoqueApi,
} from '../services/api'
import type { CardapioResponse, EstoqueResumo, InsumoResponse, PratoResponse } from '../types'

export default function DashboardPage() {
  const { user } = useAuth()
  const isEstoquista = user?.papel === 'ESTOQUISTA' || user?.papel === 'ADMIN'
  const isNutri = user?.papel === 'NUTRICIONISTA' || user?.papel === 'ADMIN'

  const [resumo, setResumo] = useState<EstoqueResumo[]>([])
  const [pratos, setPratos] = useState<PratoResponse[]>([])
  const [cardapios, setCardapios] = useState<CardapioResponse[]>([])
  const [insumos, setInsumos] = useState<InsumoResponse[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const tasks: Promise<void>[] = [
      resumoEstoqueApi().then(setResumo).catch(() => {}),
      listarPratosApi().then(setPratos).catch(() => {}),
      listarCardapiosApi().then(setCardapios).catch(() => {}),
    ]
    if (isEstoquista) {
      tasks.push(listarInsumosApi().then(setInsumos).catch(() => {}))
    }
    Promise.all(tasks).finally(() => setLoading(false))
  }, [isEstoquista])

  const hoje = new Date()
  const em7Dias = new Date()
  em7Dias.setDate(hoje.getDate() + 7)
  const hojeStr = hoje.toISOString().slice(0, 10)
  const em7DiasStr = em7Dias.toISOString().slice(0, 10)

  const vencidos = insumos.filter(i => i.validade < hojeStr && Number(i.quantidade) > 0)
  const vencendo = insumos.filter(
    i => i.validade >= hojeStr && i.validade <= em7DiasStr && Number(i.quantidade) > 0
  )
  const semEstoque = resumo.filter(r => Number(r.quantidadeDisponivel) <= 0)

  return (
    <AppLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Olá, {user?.nome}</h1>
          <p className="page-subtitle">
            Visão geral da cozinha — perfil <strong>{user?.papel}</strong>
          </p>
        </div>
        <div className="row-actions">
          <Link to="/" className="btn btn-outline btn-sm">
            Ver Cardápio Público
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="card empty-state">Carregando indicadores...</div>
      ) : (
        <>
          <div className="stats-grid">
            <div className="stat-card stat-card-accent">
              <div className="stat-label">
                <Package size={17} /> Alimentos em Estoque
              </div>
              <div className="stat-value">{resumo.length}</div>
              <div className="stat-desc">{semEstoque.length} zerado(s)</div>
            </div>

            <div className="stat-card stat-card-accent">
              <div className="stat-label">
                <UtensilsCrossed size={17} /> Pratos Cadastrados
              </div>
              <div className="stat-value">{pratos.length}</div>
              <div className="stat-desc">Com ficha técnica e receita</div>
            </div>

            <div className="stat-card stat-card-accent">
              <div className="stat-label">
                <CalendarDays size={17} /> Cardápios Semanais
              </div>
              <div className="stat-value">{cardapios.length}</div>
              <div className="stat-desc">Validados contra o estoque</div>
            </div>

            {isEstoquista && (
              <div className={`stat-card ${vencidos.length > 0 ? 'stat-card-danger' : 'stat-card-warning'}`}>
                <div className="stat-label">
                  <AlertTriangle size={17} /> Atenção de Validade
                </div>
                <div className="stat-value">{vencidos.length + vencendo.length}</div>
                <div className="stat-desc">
                  {vencidos.length} vencido(s) · {vencendo.length} vencem em 7 dias
                </div>
              </div>
            )}
          </div>

          <h2 className="section-title">Ações Rápidas</h2>
          <div className="home-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            {isEstoquista && (
              <Link to="/estoque?tab=entrada" className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
                <strong style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent)' }}>
                  <Package size={18} /> Lançar Nota de Entrada
                </strong>
                <p className="page-subtitle" style={{ marginTop: '0.4rem' }}>
                  Registrar novos lotes de insumos com validade no estoque.
                </p>
              </Link>
            )}

            {isNutri && (
              <Link to="/pratos" className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
                <strong style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent)' }}>
                  <UtensilsCrossed size={18} /> Novo Prato / Disponibilidade
                </strong>
                <p className="page-subtitle" style={{ marginTop: '0.4rem' }}>
                  Criar ficha técnica e conferir quais pratos o estoque cobre.
                </p>
              </Link>
            )}

            {isNutri && (
              <Link to="/cardapios" className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
                <strong style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent)' }}>
                  <CalendarDays size={18} /> Montar Cardápio Semanal
                </strong>
                <p className="page-subtitle" style={{ marginTop: '0.4rem' }}>
                  Programar pratos da semana e acompanhar avaliações.
                </p>
              </Link>
            )}

            {isEstoquista && (
              <Link to="/retiradas" className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
                <strong style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent)' }}>
                  <ClipboardList size={18} /> Notas de Retirada
                </strong>
                <p className="page-subtitle" style={{ marginTop: '0.4rem' }}>
                  Gerar lista consolidada de ingredientes e dar baixa PEPS.
                </p>
              </Link>
            )}
          </div>

          {isEstoquista && (vencidos.length > 0 || vencendo.length > 0) && (
            <>
              <h2 className="section-title">Lotes Vencidos ou Próximos do Vencimento</h2>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Alimento</th>
                      <th>Lote</th>
                      <th>Quantidade</th>
                      <th>Validade</th>
                      <th>Situação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...vencidos, ...vencendo].map(lote => {
                      const isVencido = lote.validade < hojeStr
                      return (
                        <tr key={lote.id}>
                          <td><strong>{lote.alimento}</strong></td>
                          <td>{lote.lote}</td>
                          <td>{lote.quantidade} {lote.unidade}</td>
                          <td>{lote.validade}</td>
                          <td>
                            <span className={`badge ${isVencido ? 'badge-error' : 'badge-warning'}`}>
                              {isVencido ? 'Vencido' : 'Vence em breve'}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </AppLayout>
  )
}
