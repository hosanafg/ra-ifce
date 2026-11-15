import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import ThemeToggle from '../components/ThemeToggle'
import { getFornecedores, createFornecedor, createAlimento, uploadOCR } from '../services/api'
import type { Fornecedor } from '../types'
import './AddFoodPage.css'

export default function AddFoodPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { theme } = useTheme()
  const isReceita = params.get('tipo') === 'receita'

  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([])
  const [fornecedorId, setFornecedorId] = useState<string>('')
  const [novoForn, setNovoForn] = useState('')
  const [showNovoForn, setShowNovoForn] = useState(false)
  const [savingForn, setSavingForn] = useState(false)

  const [nome, setNome] = useState('')
  const [pesoValor, setPesoValor] = useState('')
  const [pesoUnidade, setPesoUnidade] = useState('kg')
  const [quantidade, setQuantidade] = useState('')
  const [dataVenc, setDataVenc] = useState('')

  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // OCR
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [ocrLoading, setOcrLoading] = useState(false)
  const [ocrAlert, setOcrAlert] = useState<'revisar' | 'error' | null>(null)
  const [ocrMsg, setOcrMsg] = useState('')
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    getFornecedores().then(setFornecedores).catch(() => {})
  }, [])

  function handleFileSelect(f: File) {
    if (f.size > 5 * 1024 * 1024) {
      setOcrAlert('error')
      setOcrMsg('Arquivo excede o limite de 5 MB.')
      return
    }
    setFile(f)
    setOcrAlert(null)
    setOcrMsg('')
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFileSelect(f)
  }

  async function handleOCR() {
    if (!file) return
    setOcrLoading(true)
    setOcrAlert(null)
    setOcrMsg('')
    try {
      const res = await uploadOCR(file)
      if (res.insumos && res.insumos.length > 0) {
        const ins = res.insumos[0]
        if (ins.ingrediente) setNome(ins.ingrediente)
        if (ins.peso_valor) setPesoValor(String(ins.peso_valor))
        if (ins.peso_unidade) setPesoUnidade(ins.peso_unidade)
        if (ins.quantidade) setQuantidade(String(ins.quantidade))
        if (ins.data_vencimento) setDataVenc(ins.data_vencimento)
        if (res.insumos.some(i => i.revisar)) {
          setOcrAlert('revisar')
          setOcrMsg('Alguns campos precisam de revisão antes de salvar.')
        }
      }
    } catch (err: any) {
      setOcrAlert('error')
      setOcrMsg(err?.detail ?? err?.message ?? 'Erro ao processar OCR.')
    } finally {
      setOcrLoading(false)
    }
  }

  async function handleSaveForn() {
    if (!novoForn.trim()) return
    setSavingForn(true)
    try {
      const f = await createFornecedor({ nome: novoForn.trim() })
      setFornecedores(prev => [...prev, f])
      setFornecedorId(String(f.id))
      setNovoForn('')
      setShowNovoForn(false)
    } catch {
      /* noop */
    } finally {
      setSavingForn(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await createAlimento({
        nome: nome.trim(),
        fornecedor_id: fornecedorId ? parseInt(fornecedorId) : undefined,
        peso_valor: pesoValor ? parseFloat(pesoValor) : undefined,
        peso_unidade: pesoUnidade || undefined,
        quantidade: quantidade ? parseInt(quantidade) : undefined,
        data_vencimento: dataVenc || undefined,
      })
      setToast('Alimento salvo!')
      setTimeout(() => navigate('/dashboard'), 1200)
    } catch (err: any) {
      setError(err?.detail ?? 'Erro ao salvar alimento.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="addfood-page" data-theme={theme}>
      {/* Navbar */}
      <nav className="addfood-nav">
        <div className="addfood-nav-left">
          <button className="btn btn-sm btn-ghost" onClick={() => navigate('/dashboard')}>← Voltar</button>
          <span className="addfood-nav-logo">🌿 {isReceita ? 'Nova Receita' : 'Novo Alimento'}</span>
        </div>
        <div className="addfood-nav-right">
          <ThemeToggle />
          <span className="addfood-nav-user">{user?.email}</span>
          <button className="btn btn-sm btn-ghost" onClick={logout}>Sair</button>
        </div>
      </nav>

      {toast && (
        <div className="addfood-toast">
          ✅ {toast}
        </div>
      )}

      <div className="addfood-container">
        <h1 className="addfood-title">{isReceita ? 'Nova Receita' : 'Novo Alimento'}</h1>

        {/* OCR Section */}
        <section className="addfood-ocr-section">
          <h2 className="addfood-section-title">📷 Extração automática (OCR)</h2>
          <div
            className={`addfood-dropzone${dragging ? ' dragging' : ''}`}
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
          >
            {file
              ? <span className="addfood-file-preview">📄 {file.name} ({(file.size / 1024).toFixed(0)} KB)</span>
              : <span>Arraste uma imagem ou PDF aqui, ou clique para selecionar<br/><small>Máx. 5 MB — image/*, .pdf</small></span>
            }
            <input
              ref={fileRef}
              type="file"
              accept="image/*,application/pdf"
              style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelect(f) }}
            />
          </div>

          {ocrAlert === 'revisar' && (
            <div className="addfood-alert addfood-alert-warning">⚠ {ocrMsg}</div>
          )}
          {ocrAlert === 'error' && (
            <div className="addfood-alert addfood-alert-error">❌ {ocrMsg}</div>
          )}

          <button
            type="button"
            className="btn btn-outline"
            onClick={handleOCR}
            disabled={!file || ocrLoading}
          >
            {ocrLoading
              ? <><span className="spinner" /> Processando OCR…</>
              : '✨ Extrair dados automaticamente'}
          </button>
        </section>

        {/* Form Section */}
        <section className="addfood-form-section">
          <h2 className="addfood-section-title">Dados do {isReceita ? 'receita' : 'alimento'}</h2>
          {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}
          <form onSubmit={handleSubmit} className="addfood-form">
            {/* Fornecedor */}
            <div className="field">
              <label className="field-label">Fornecedor</label>
              <select className="field-input" value={fornecedorId}
                onChange={e => {
                  if (e.target.value === '__novo__') { setShowNovoForn(true); setFornecedorId('') }
                  else setFornecedorId(e.target.value)
                }}>
                <option value="">Nenhum</option>
                {fornecedores.map(f => (
                  <option key={f.id} value={f.id}>{f.nome}</option>
                ))}
                <option value="__novo__">+ Novo fornecedor</option>
              </select>
              {showNovoForn && (
                <div className="addfood-inline-new">
                  <input
                    type="text"
                    className="field-input"
                    placeholder="Nome do fornecedor"
                    value={novoForn}
                    onChange={e => setNovoForn(e.target.value)}
                  />
                  <button type="button" className="btn btn-sm btn-primary" onClick={handleSaveForn} disabled={savingForn}>
                    {savingForn ? <span className="spinner" /> : 'Criar'}
                  </button>
                  <button type="button" className="btn btn-sm btn-ghost" onClick={() => setShowNovoForn(false)}>
                    Cancelar
                  </button>
                </div>
              )}
            </div>

            {/* Nome */}
            <div className="field">
              <label className="field-label">{isReceita ? 'Nome da receita' : 'Nome do alimento'}</label>
              <input type="text" className="field-input" value={nome}
                onChange={e => setNome(e.target.value)} required placeholder="Ex: Arroz integral" />
            </div>

            {/* Peso */}
            <div className="field">
              <label className="field-label">Peso</label>
              <div className="addfood-peso-row">
                <input type="number" step="0.01" min="0" className="field-input" value={pesoValor}
                  onChange={e => setPesoValor(e.target.value)} placeholder="0.00" />
                <select className="field-input addfood-peso-unit" value={pesoUnidade}
                  onChange={e => setPesoUnidade(e.target.value)}>
                  <option value="g">g</option>
                  <option value="kg">kg</option>
                  <option value="mg">mg</option>
                  <option value="ml">ml</option>
                  <option value="l">l</option>
                </select>
              </div>
            </div>

            {/* Quantidade */}
            <div className="field">
              <label className="field-label">Quantidade</label>
              <input type="number" min="0" className="field-input" value={quantidade}
                onChange={e => setQuantidade(e.target.value)} placeholder="Ex: 10" />
            </div>

            {/* Data de vencimento */}
            <div className="field">
              <label className="field-label">Data de vencimento</label>
              <input type="date" className="field-input" value={dataVenc}
                onChange={e => setDataVenc(e.target.value)} />
            </div>

            <div className="addfood-form-actions">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? <><span className="spinner" /> Salvando…</> : 'Salvar'}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => navigate('/dashboard')}>
                Cancelar
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  )
}
