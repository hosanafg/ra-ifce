import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import ThemeToggle from '../components/ThemeToggle'
import {
  getFornecedores, createFornecedor, createAlimento, createReceita, uploadOCR,
} from '../services/api'
import type { Fornecedor, OcrInsumo } from '../types'
import './AddFoodPage.css'

const MAX_BYTES = 5 * 1024 * 1024
const EXT_OK = ['.pdf', '.jpg', '.jpeg', '.png', '.bmp', '.tif', '.tiff', '.webp']
const REFEICOES: Record<string, string> = {
  cafe: 'Café da manhã', almoco: 'Almoço', lanche: 'Lanche', jantar: 'Jantar',
}
const hoje = () => new Date().toISOString().slice(0, 10)

/** Alimento: Fornecedor, Peso, Unidade (kg ou L), Quantidade, Data de vencimento (+ campos extras). */
interface Row {
  key: number
  nome: string
  fornecedorId: string
  pesoValor: string
  pesoUnidade: 'kg' | 'L'
  quantidade: string
  dataVenc: string
  extras: Record<string, string>
  revisar: boolean
}

let seq = 0
const novaLinha = (p: Partial<Row> = {}): Row => ({
  key: ++seq, nome: '', fornecedorId: '', pesoValor: '', pesoUnidade: 'kg', quantidade: '',
  dataVenc: '', extras: {}, revisar: false, ...p,
})

function msgErro(err: any, padrao: string): string {
  const d = err?.detail
  if (typeof d === 'string') return d
  if (Array.isArray(d)) return d.map((x: any) => x?.msg).filter(Boolean).join('; ') || padrao
  return d?.message ?? padrao
}

export default function AddFoodPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { theme } = useTheme()
  const isReceita = params.get('tipo') === 'receita'

  // Refeição > Receita
  const [refeicao, setRefeicao] = useState('almoco')
  const [receitaNome, setReceitaNome] = useState('')
  const [dataRef, setDataRef] = useState(hoje())

  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([])
  const [novoForn, setNovoForn] = useState('')
  const [showNovoForn, setShowNovoForn] = useState(false)
  const [savingForn, setSavingForn] = useState(false)

  const [rows, setRows] = useState<Row[]>([novaLinha()])
  const [camposExtras, setCamposExtras] = useState<string[]>([])
  const [showNovoCampo, setShowNovoCampo] = useState(false)
  const [novoCampo, setNovoCampo] = useState('')

  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // OCR
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [ocrLoading, setOcrLoading] = useState(false)
  const [ocrAlert, setOcrAlert] = useState<'info' | 'revisar' | 'error' | null>(null)
  const [ocrMsg, setOcrMsg] = useState('')
  const [dragging, setDragging] = useState(false)

  useEffect(() => { getFornecedores().then(setFornecedores).catch(() => {}) }, [])

  /* ── Fornecedores ── */
  async function criarFornecedor(nome: string): Promise<Fornecedor | null> {
    try {
      const f = await createFornecedor({ nome })
      setFornecedores(prev => [...prev, f])
      return f
    } catch (err: any) {
      if (err?.status === 409) {                 // já existe: recarrega a lista e usa o existente
        const lista = await getFornecedores()
        setFornecedores(lista)
        return lista.find(x => x.nome.toLowerCase() === nome.toLowerCase()) ?? null
      }
      throw err
    }
  }

  async function handleSaveForn() {
    if (!novoForn.trim()) return
    setSavingForn(true)
    try {
      await criarFornecedor(novoForn.trim())
      setNovoForn(''); setShowNovoForn(false)
    } catch (err: any) {
      setError(msgErro(err, 'Não foi possível criar o fornecedor.'))
    } finally { setSavingForn(false) }
  }

  /* ── Upload ── */
  function handleFileSelect(f: File) {
    const ext = f.name.slice(f.name.lastIndexOf('.')).toLowerCase()
    if (!EXT_OK.includes(ext)) {
      setFile(null); setOcrAlert('error')
      setOcrMsg('Formato não suportado. Envie uma foto (JPG, PNG, BMP, TIFF, WebP) ou um PDF.')
      return
    }
    if (f.size > MAX_BYTES) {
      setFile(null); setOcrAlert('error'); setOcrMsg('Arquivo excede o limite de 5 MB.')
      return
    }
    setFile(f); setOcrAlert(null); setOcrMsg('')
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFileSelect(f)
  }

  async function handleOCR() {
    if (!file) return
    setOcrLoading(true); setOcrAlert(null); setOcrMsg('')
    try {
      const res = await uploadOCR(file)
      if (res.insumos.length === 0) {
        setOcrAlert('info')
        setOcrMsg(res.alertas[0]?.mensagem ?? 'Nenhum alimento foi identificado. Preencha manualmente.')
        return
      }

      // Refeição / receita (usa os do documento se o usuário ainda não preencheu)
      const comRef = res.insumos.find(i => i.refeicao)
      if (comRef?.refeicao && REFEICOES[comRef.refeicao]) setRefeicao(comRef.refeicao)
      const comRec = res.insumos.find(i => i.receita)
      if (comRec?.receita && !receitaNome.trim()) setReceitaNome(comRec.receita)

      // Fornecedores citados: reaproveita os existentes ou cria os novos
      const idPorNome: Record<string, string> = {}
      const nomes = Array.from(new Set(res.insumos.map(i => i.fornecedor?.trim()).filter(Boolean) as string[]))
      for (const nome of nomes) {
        const ex = fornecedores.find(f => f.nome.toLowerCase() === nome.toLowerCase())
        if (ex) { idPorNome[nome] = String(ex.id); continue }
        try {
          const f = await criarFornecedor(nome)
          if (f) idPorNome[nome] = String(f.id)
        } catch { /* segue sem fornecedor */ }
      }

      // Campos extras vindos do documento (ex.: Marca)
      const chaves = Array.from(new Set(res.insumos.flatMap(i => Object.keys(i.extras ?? {}))))
      if (chaves.length) setCamposExtras(prev => [...prev, ...chaves.filter(c => !prev.includes(c))])

      const extraidas = res.insumos.map((i: OcrInsumo) => novaLinha({
        nome: i.ingrediente ?? '',
        fornecedorId: i.fornecedor ? idPorNome[i.fornecedor.trim()] ?? '' : '',
        pesoValor: i.peso_valor != null ? String(i.peso_valor) : '',
        pesoUnidade: i.peso_unidade === 'L' ? 'L' : 'kg',
        quantidade: i.quantidade != null ? String(i.quantidade) : '',
        dataVenc: i.data_vencimento ?? '',
        extras: i.extras ?? {},
        revisar: i.revisar,
      }))
      setRows(prev => [...prev.filter(r => r.nome || r.pesoValor || r.quantidade || r.dataVenc), ...extraidas])

      const rev = extraidas.some(r => r.revisar)
      setOcrAlert(rev ? 'revisar' : 'info')
      setOcrMsg(
        `${extraidas.length} alimento(s) identificado(s). Campos não reconhecidos ficaram em branco` +
        (rev ? '; itens destacados precisam de revisão.' : '.')
      )
    } catch (err: any) {
      setOcrAlert('error'); setOcrMsg(msgErro(err, 'Erro ao processar o documento.'))
    } finally {
      setOcrLoading(false)
    }
  }

  /* ── Linhas ── */
  const upd = (key: number, patch: Partial<Row>) =>
    setRows(prev => prev.map(r => (r.key === key ? { ...r, ...patch } : r)))
  const updExtra = (key: number, campo: string, v: string) =>
    setRows(prev => prev.map(r => (r.key === key ? { ...r, extras: { ...r.extras, [campo]: v } } : r)))
  const removeRow = (key: number) =>
    setRows(prev => (prev.length === 1 ? [novaLinha()] : prev.filter(r => r.key !== key)))

  /* ── Campos personalizados (ex.: Marca) ── */
  function addCampo() {
    const nome = novoCampo.trim()
    if (!nome) return
    if (camposExtras.some(c => c.toLowerCase() === nome.toLowerCase())) {
      setError(`O campo "${nome}" já existe.`); return
    }
    setCamposExtras(prev => [...prev, nome]); setNovoCampo(''); setShowNovoCampo(false); setError(null)
  }
  function removeCampo(nome: string) {
    setCamposExtras(prev => prev.filter(c => c !== nome))
    setRows(prev => prev.map(r => { const e = { ...r.extras }; delete e[nome]; return { ...r, extras: e } }))
  }

  /* ── Salvar: Receita (opcional) → Alimentos ── */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const validas = rows.filter(r => r.nome.trim())
    if (validas.length === 0) { setError('Informe o nome de pelo menos um alimento.'); return }
    if (isReceita && !receitaNome.trim()) { setError('Informe o nome da receita.'); return }
    setSaving(true); setError(null)
    try {
      let receitaId: number | undefined
      if (receitaNome.trim()) {
        const r = await createReceita({ nome: receitaNome.trim(), refeicao, data: dataRef || undefined })
        receitaId = r.id
      }
      for (const r of validas) {
        const extras = Object.fromEntries(
          Object.entries(r.extras).filter(([c, v]) => camposExtras.includes(c) && v.trim())
        )
        await createAlimento({
          nome: r.nome.trim(),
          fornecedor_id: r.fornecedorId ? parseInt(r.fornecedorId) : undefined,
          receita_id: receitaId,
          peso_valor: r.pesoValor ? parseFloat(r.pesoValor) : undefined,
          peso_unidade: r.pesoValor ? r.pesoUnidade : undefined,
          quantidade: r.quantidade ? parseInt(r.quantidade) : undefined,
          data_vencimento: r.dataVenc || undefined,
          revisar: r.revisar,
          extras: Object.keys(extras).length ? extras : undefined,
        })
      }
      setToast(validas.length > 1 ? `${validas.length} alimentos salvos!` : 'Alimento salvo!')
      setTimeout(() => navigate(`/dashboard?data=${dataRef || hoje()}`), 1200)
    } catch (err: any) {
      setError(msgErro(err, 'Erro ao salvar.'))
    } finally { setSaving(false) }
  }

  return (
    <div className="addfood-page" data-theme={theme}>
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

      {toast && <div className="addfood-toast" role="status">✅ {toast}</div>}

      <div className="addfood-container">
        <h1 className="addfood-title">{isReceita ? 'Nova Receita' : 'Novo Alimento'}</h1>

        {/* OCR */}
        <section className="addfood-ocr-section">
          <h2 className="addfood-section-title">📷 Extração automática (OCR)</h2>
          <div
            className={`addfood-dropzone${dragging ? ' dragging' : ''}`}
            role="button" tabIndex={0}
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') fileRef.current?.click() }}
          >
            {file
              ? <span className="addfood-file-preview">📄 {file.name} ({(file.size / 1024).toFixed(0)} KB)</span>
              : <span>Arraste uma foto ou PDF aqui, ou clique para selecionar<br /><small>Máx. 5 MB — JPG, PNG, BMP, TIFF, WebP ou PDF</small></span>}
            <input
              ref={fileRef} type="file" style={{ display: 'none' }}
              accept=".pdf,.jpg,.jpeg,.png,.bmp,.tif,.tiff,.webp,application/pdf,image/*"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); e.target.value = '' }}
            />
          </div>

          {ocrAlert === 'info' && <div className="addfood-alert addfood-alert-info">ℹ {ocrMsg}</div>}
          {ocrAlert === 'revisar' && <div className="addfood-alert addfood-alert-warning">⚠ {ocrMsg}</div>}
          {ocrAlert === 'error' && <div className="addfood-alert addfood-alert-error">❌ {ocrMsg}</div>}

          <button type="button" className="btn btn-outline" onClick={handleOCR} disabled={!file || ocrLoading}>
            {ocrLoading ? <><span className="spinner" /> Processando OCR…</> : '✨ Extrair dados automaticamente'}
          </button>
        </section>

        {/* Formulário */}
        <section className="addfood-form-section">
          {error && <div className="alert alert-error" role="alert" style={{ marginBottom: '1rem' }}>{error}</div>}

          <form onSubmit={handleSubmit} className="addfood-form">
            {/* Refeição > Receita */}
            <fieldset className="addfood-item">
              <legend>Refeição e receita</legend>
              <div className="addfood-grid">
                <div className="field">
                  <label className="field-label" htmlFor="refeicao">Refeição</label>
                  <select id="refeicao" className="field-input" value={refeicao} onChange={e => setRefeicao(e.target.value)}>
                    {Object.entries(REFEICOES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="receita">Nome da receita{isReceita ? '' : ' (opcional)'}</label>
                  <input id="receita" type="text" className="field-input" value={receitaNome}
                    onChange={e => setReceitaNome(e.target.value)} placeholder="Ex: Feijoada" />
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="data-ref">Data</label>
                  <input id="data-ref" type="date" className="field-input" value={dataRef}
                    onChange={e => setDataRef(e.target.value)} />
                </div>
              </div>
            </fieldset>

            <h2 className="addfood-section-title">Alimentos</h2>

            <div className="addfood-toolbar">
              {!showNovoForn && (
                <button type="button" className="btn btn-sm btn-outline" onClick={() => setShowNovoForn(true)}>
                  + Novo fornecedor
                </button>
              )}
            </div>
            {showNovoForn && (
              <div className="addfood-inline-new">
                <input type="text" className="field-input" placeholder="Nome do fornecedor" aria-label="Nome do novo fornecedor"
                  value={novoForn} onChange={e => setNovoForn(e.target.value)} />
                <button type="button" className="btn btn-sm btn-primary" onClick={handleSaveForn} disabled={savingForn}>
                  {savingForn ? <span className="spinner" /> : 'Criar'}
                </button>
                <button type="button" className="btn btn-sm btn-ghost" onClick={() => setShowNovoForn(false)}>Cancelar</button>
              </div>
            )}

            {rows.map((r, idx) => (
              <fieldset key={r.key} className={`addfood-item${r.revisar ? ' needs-review' : ''}`}>
                <legend>
                  Alimento {idx + 1}{r.revisar && <span className="addfood-review-tag">revisar</span>}
                </legend>
                <button type="button" className="btn btn-sm btn-ghost addfood-item-remove"
                  onClick={() => removeRow(r.key)} aria-label={`Remover alimento ${idx + 1}`}>🗑</button>

                <div className="field">
                  <label className="field-label" htmlFor={`nome-${r.key}`}>Alimento</label>
                  <input id={`nome-${r.key}`} type="text" className="field-input" value={r.nome}
                    onChange={e => upd(r.key, { nome: e.target.value })} placeholder="Ex: Arroz integral" />
                </div>

                <div className="addfood-grid">
                  <div className="field">
                    <label className="field-label" htmlFor={`forn-${r.key}`}>Fornecedor</label>
                    <select id={`forn-${r.key}`} className="field-input" value={r.fornecedorId}
                      onChange={e => upd(r.key, { fornecedorId: e.target.value })}>
                      <option value="">Nenhum</option>
                      {fornecedores.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
                    </select>
                  </div>
                  <div className="field">
                    <label className="field-label" htmlFor={`peso-${r.key}`}>Peso</label>
                    <input id={`peso-${r.key}`} type="number" step="0.001" min="0" className="field-input"
                      value={r.pesoValor} onChange={e => upd(r.key, { pesoValor: e.target.value })} placeholder="0.00" />
                  </div>
                  <div className="field">
                    <label className="field-label" htmlFor={`un-${r.key}`}>Unidade</label>
                    <select id={`un-${r.key}`} className="field-input" value={r.pesoUnidade}
                      onChange={e => upd(r.key, { pesoUnidade: e.target.value as 'kg' | 'L' })}>
                      <option value="kg">kg</option>
                      <option value="L">L</option>
                    </select>
                  </div>
                  <div className="field">
                    <label className="field-label" htmlFor={`qtd-${r.key}`}>Quantidade</label>
                    <input id={`qtd-${r.key}`} type="number" min="0" className="field-input" value={r.quantidade}
                      onChange={e => upd(r.key, { quantidade: e.target.value })} placeholder="Ex: 10" />
                  </div>
                  <div className="field">
                    <label className="field-label" htmlFor={`venc-${r.key}`}>Data de vencimento</label>
                    <input id={`venc-${r.key}`} type="date" className="field-input" value={r.dataVenc}
                      onChange={e => upd(r.key, { dataVenc: e.target.value })} />
                  </div>

                  {camposExtras.map(c => (
                    <div className="field" key={c}>
                      <label className="field-label" htmlFor={`${c}-${r.key}`}>{c}</label>
                      <input id={`${c}-${r.key}`} type="text" className="field-input" value={r.extras[c] ?? ''}
                        onChange={e => updExtra(r.key, c, e.target.value)} />
                    </div>
                  ))}
                </div>
              </fieldset>
            ))}

            <div className="addfood-toolbar">
              <button type="button" className="btn btn-sm btn-outline" onClick={() => setRows(p => [...p, novaLinha()])}>
                + Adicionar alimento
              </button>
              {!showNovoCampo && (
                <button type="button" className="btn btn-sm btn-outline" onClick={() => setShowNovoCampo(true)}>
                  + Adicionar campo
                </button>
              )}
            </div>

            {showNovoCampo && (
              <div className="addfood-inline-new">
                <input type="text" className="field-input" placeholder="Nome do campo (ex.: Marca)" autoFocus
                  aria-label="Nome do novo campo" value={novoCampo} maxLength={40}
                  onChange={e => setNovoCampo(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCampo() } }} />
                <button type="button" className="btn btn-sm btn-primary" onClick={addCampo}>Adicionar</button>
                <button type="button" className="btn btn-sm btn-ghost" onClick={() => { setShowNovoCampo(false); setNovoCampo('') }}>Cancelar</button>
              </div>
            )}

            {camposExtras.length > 0 && (
              <div className="addfood-chips" aria-label="Campos personalizados">
                {camposExtras.map(c => (
                  <span key={c} className="addfood-chip">
                    {c}
                    <button type="button" onClick={() => removeCampo(c)} aria-label={`Remover campo ${c}`}>×</button>
                  </span>
                ))}
              </div>
            )}

            <div className="addfood-form-actions">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? <><span className="spinner" /> Salvando…</> : `Salvar${rows.length > 1 ? ' todos' : ''}`}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => navigate('/dashboard')}>Cancelar</button>
            </div>
          </form>
        </section>
      </div>
    </div>
  )
}
