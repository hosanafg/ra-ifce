import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertCircle,
  CheckCircle2,
  Edit3,
  KeyRound,
  Plus,
  UserX,
  X,
} from 'lucide-react'
import AppLayout from '../components/AppLayout'
import { useAuth } from '../contexts/AuthContext'
import {
  atualizarUsuarioApi,
  criarUsuarioApi,
  desativarUsuarioApi,
  listarUsuariosApi,
  tokenSuporteApi,
} from '../services/api'
import type { Papel, UsuarioResponse } from '../types'

export default function AdminUsersPage() {
  const { impersonate } = useAuth()
  const navigate = useNavigate()

  const [usuarios, setUsuarios] = useState<UsuarioResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [toast, setToast] = useState('')

  // Modal Criar
  const [modalCriar, setModalCriar] = useState(false)
  const [novoNome, setNovoNome] = useState('')
  const [novoLogin, setNovoLogin] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [novoPapel, setNovoPapel] = useState<Papel>('ESTOQUISTA')

  // Modal Editar
  const [editando, setEditando] = useState<UsuarioResponse | null>(null)
  const [editNome, setEditNome] = useState('')
  const [editPapel, setEditPapel] = useState<Papel>('ESTOQUISTA')
  const [editAtivo, setEditAtivo] = useState(true)
  const [editNovaSenha, setEditNovaSenha] = useState('')
  const [salvando, setSalvando] = useState(false)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3500)
  }

  async function carregar() {
    setLoading(true)
    setErro('')
    try {
      setUsuarios(await listarUsuariosApi())
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao listar usuários')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregar()
  }, [])

  async function handleCriar(e: React.FormEvent) {
    e.preventDefault()
    setSalvando(true)
    setErro('')
    try {
      await criarUsuarioApi({
        nome: novoNome.trim(),
        login: novoLogin.trim(),
        senha: novaSenha,
        papel: novoPapel,
      })
      setModalCriar(false)
      setNovoNome('')
      setNovoLogin('')
      setNovaSenha('')
      await carregar()
      showToast('Usuário criado com sucesso!')
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao criar usuário')
    } finally {
      setSalvando(false)
    }
  }

  function abrirEdicao(u: UsuarioResponse) {
    setEditando(u)
    setEditNome(u.nome)
    setEditPapel(u.papel)
    setEditAtivo(u.ativo)
    setEditNovaSenha('')
  }

  async function handleEditar(e: React.FormEvent) {
    e.preventDefault()
    if (!editando) return
    setSalvando(true)
    setErro('')
    try {
      await atualizarUsuarioApi(editando.id, {
        nome: editNome.trim(),
        papel: editPapel,
        ativo: editAtivo,
        ...(editNovaSenha ? { novaSenha: editNovaSenha } : {}),
      })
      setEditando(null)
      await carregar()
      showToast('Usuário atualizado!')
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao atualizar usuário')
    } finally {
      setSalvando(false)
    }
  }

  async function handleDesativar(u: UsuarioResponse) {
    if (!confirm(`Desativar a conta de ${u.nome} (${u.login})?`)) return
    setErro('')
    try {
      await desativarUsuarioApi(u.id)
      await carregar()
      showToast(`Usuário ${u.login} desativado.`)
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao desativar usuário')
    }
  }

  async function handleTokenSuporte(u: UsuarioResponse) {
    setErro('')
    try {
      const tokenResp = await tokenSuporteApi(u.id)
      impersonate(tokenResp)
      navigate('/painel')
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao gerar token de suporte')
    }
  }

  return (
    <AppLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Administração de Usuários</h1>
          <p className="page-subtitle">Gerencie contas, perfis de acesso e tokens de suporte</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setModalCriar(true)}>
          <Plus size={17} /> Novo Usuário
        </button>
      </div>

      {erro && (
        <div className="alert alert-error" style={{ marginBottom: '1.25rem' }}>
          <AlertCircle size={17} className="alert-icon" />
          <span>{erro}</span>
        </div>
      )}

      {loading ? (
        <div className="card empty-state">Carregando usuários...</div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nome</th>
                <th>Login</th>
                <th>Perfil</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map(u => (
                <tr key={u.id}>
                  <td>#{u.id}</td>
                  <td><strong>{u.nome}</strong></td>
                  <td>{u.login}</td>
                  <td><span className="badge">{u.papel}</span></td>
                  <td>
                    <span className={`badge ${u.ativo ? '' : 'badge-error'}`}>
                      {u.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => abrirEdicao(u)}
                      >
                        <Edit3 size={14} /> Editar
                      </button>
                      {u.ativo && (
                        <>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => handleTokenSuporte(u)}
                            title="Entrar como esta conta"
                          >
                            <KeyRound size={14} /> Suporte
                          </button>
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDesativar(u)}
                          >
                            <UserX size={14} /> Desativar
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalCriar && (
        <div className="modal-backdrop" onClick={() => setModalCriar(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Criar Usuário</h3>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setModalCriar(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCriar} className="form-stack">
              <div className="field">
                <label className="field-label">Nome</label>
                <input
                  className="field-input"
                  value={novoNome}
                  onChange={e => setNovoNome(e.target.value)}
                  required
                  maxLength={100}
                />
              </div>
              <div className="field">
                <label className="field-label">Login</label>
                <input
                  className="field-input"
                  value={novoLogin}
                  onChange={e => setNovoLogin(e.target.value)}
                  required
                  minLength={3}
                  maxLength={50}
                />
              </div>
              <div className="field">
                <label className="field-label">Senha</label>
                <input
                  type="password"
                  className="field-input"
                  value={novaSenha}
                  onChange={e => setNovaSenha(e.target.value)}
                  required
                  minLength={6}
                  maxLength={100}
                />
              </div>
              <div className="field">
                <label className="field-label">Perfil</label>
                <select
                  className="field-input"
                  value={novoPapel}
                  onChange={e => setNovoPapel(e.target.value as Papel)}
                >
                  <option value="ESTOQUISTA">Estoquista</option>
                  <option value="NUTRICIONISTA">Nutricionista</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <div className="row-actions" style={{ justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setModalCriar(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={salvando}>
                  {salvando ? <span className="spinner" /> : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editando && (
        <div className="modal-backdrop" onClick={() => setEditando(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Editar: {editando.login}</h3>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditando(null)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditar} className="form-stack">
              <div className="field">
                <label className="field-label">Nome</label>
                <input
                  className="field-input"
                  value={editNome}
                  onChange={e => setEditNome(e.target.value)}
                  required
                  maxLength={100}
                />
              </div>
              <div className="field">
                <label className="field-label">Perfil</label>
                <select
                  className="field-input"
                  value={editPapel}
                  onChange={e => setEditPapel(e.target.value as Papel)}
                >
                  <option value="ESTOQUISTA">Estoquista</option>
                  <option value="NUTRICIONISTA">Nutricionista</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <div className="field">
                <label className="field-label">Nova senha (opcional)</label>
                <input
                  type="password"
                  className="field-input"
                  value={editNovaSenha}
                  onChange={e => setEditNovaSenha(e.target.value)}
                  placeholder="Deixe em branco para manter"
                  minLength={6}
                  maxLength={100}
                />
              </div>
              <label className="row-actions" style={{ cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={editAtivo}
                  onChange={e => setEditAtivo(e.target.checked)}
                />
                <span className="field-label">Conta ativa</span>
              </label>

              <div className="row-actions" style={{ justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setEditando(null)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={salvando}>
                  {salvando ? <span className="spinner" /> : 'Salvar Alterações'}
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
