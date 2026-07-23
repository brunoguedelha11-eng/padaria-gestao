'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ItemCompra } from '@/types'
import { format, startOfMonth, endOfMonth, addDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Plus, Package, Trash2, Download, ChevronDown, ChevronUp, BarChart2, Pencil, Check, X, AlertCircle, CheckCircle2, Wand2 } from 'lucide-react'
import { exportToCsv } from '@/lib/exportCsv'
import MonthNav from '@/components/MonthNav'

const apresentacoes = ['kg', 'g', 'L', 'mL', 'un', 'cx', 'pct'] as const
const hoje = format(new Date(), 'yyyy-MM-dd')
const PAGAMENTOS = [
  { value: 'debito', label: 'Débito', imediato: true },
  { value: 'pix', label: 'Pix', imediato: true },
  { value: 'credito', label: 'Crédito', imediato: false },
  { value: 'boleto', label: 'Boleto (7 dias)', imediato: false },
]

interface CompraComItens {
  id: string; data: string; fornecedor: string; user_id: string
  forma_pagamento: string; data_vencimento?: string; pago: boolean
  itens_compra: ItemCompra[]
}

interface ItemEditavel extends ItemCompra {
  editando?: boolean; _quantidade?: string; _valor_unitario?: string; _produto?: string; _apresentacao?: string
}

const formVazio = { data: hoje, fornecedor: '', forma_pagamento: 'debito', data_vencimento: '' }

export default function ComprasPage() {
  const supabase = createClient()
  const [mes, setMes] = useState(new Date())
  const [compras, setCompras] = useState<CompraComItens[]>([])
  const [expandido, setExpandido] = useState<string | null>(null)
  const [verResumo, setVerResumo] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState(formVazio)
  const [itens, setItens] = useState([{ produto: '', quantidade: '', apresentacao: 'un', valor_unitario: '' }])
  const [itensEditaveis, setItensEditaveis] = useState<Record<string, ItemEditavel[]>>({})
  const [produtos, setProdutos] = useState<{ nome: string; unidade: string }[]>([])
  const [padronizando, setPadronizando] = useState(false)
  const [mapeamento, setMapeamento] = useState<Record<string, string>>({})
  const [nomesUnicos, setNomesUnicos] = useState<string[]>([])
  const [salvandoPadronizacao, setSalvandoPadronizacao] = useState(false)

  useEffect(() => { fetchCompras() }, [mes])
  useEffect(() => { fetchProdutos() }, [])

  // Calcula vencimento automático ao mudar pagamento ou data
  useEffect(() => {
    if (form.forma_pagamento === 'credito') {
      setForm(f => ({ ...f, data_vencimento: format(addDays(new Date(f.data + 'T12:00:00'), 30), 'yyyy-MM-dd') }))
    } else if (form.forma_pagamento === 'boleto') {
      setForm(f => ({ ...f, data_vencimento: format(addDays(new Date(f.data + 'T12:00:00'), 7), 'yyyy-MM-dd') }))
    } else {
      setForm(f => ({ ...f, data_vencimento: '' }))
    }
  }, [form.forma_pagamento, form.data])

  async function fetchProdutos() {
    const { data } = await supabase.from('produtos').select('nome, unidade').in('categoria', ['compra', 'ambos']).order('nome')
    if (data) setProdutos(data.map(p => ({ nome: p.nome, unidade: p.unidade || 'un' })))
  }

  async function abrirPadronizacao() {
    // Busca todos os nomes únicos usados em itens_compra
    const { data } = await supabase.from('itens_compra').select('produto')
    const unicos = Array.from(new Set((data || []).map((i: any) => i.produto?.trim()).filter(Boolean))).sort()
    setNomesUnicos(unicos)
    // Pré-preenche com o próprio nome
    const mapa: Record<string, string> = {}
    unicos.forEach(n => { mapa[n] = n })
    setMapeamento(mapa)
    setPadronizando(true)
  }

  async function salvarPadronizacao() {
    setSalvandoPadronizacao(true)
    // Para cada nome que mudou, atualiza todos os itens_compra
    const alterados = Object.entries(mapeamento).filter(([original, novo]) => original !== novo)
    for (const [original, novo] of alterados) {
      await supabase.from('itens_compra').update({ produto: novo }).eq('produto', original)
    }
    setSalvandoPadronizacao(false)
    setPadronizando(false)
    fetchCompras()
  }

  function selecionarProduto(idx: number, nome: string, unidade: string) {
    const novo = [...itens]
    novo[idx] = { ...novo[idx], produto: nome, apresentacao: unidade as any }
    setItens(novo)
  }

  async function fetchCompras() {
    const inicio = startOfMonth(mes).toISOString().split('T')[0]
    const fim = endOfMonth(mes).toISOString().split('T')[0]
    const { data } = await supabase.from('compras').select('*, itens_compra(*)')
      .gte('data', inicio).lte('data', fim).order('data', { ascending: false })
    if (data) {
      setCompras(data as CompraComItens[])
      const mapa: Record<string, ItemEditavel[]> = {}
      ;(data as CompraComItens[]).forEach(c => { mapa[c.id] = c.itens_compra.map(i => ({ ...i })) })
      setItensEditaveis(mapa)
    }
  }

  function addItem() { setItens([...itens, { produto: '', quantidade: '', apresentacao: 'un', valor_unitario: '' }]) }
  function removeItem(i: number) { setItens(itens.filter((_, idx) => idx !== i)) }
  function updateItem(i: number, field: string, value: string) {
    const novo = [...itens]; novo[i] = { ...novo[i], [field]: value }; setItens(novo)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const imediato = ['debito', 'pix'].includes(form.forma_pagamento)
    const { data: compra, error } = await supabase.from('compras').insert({
      data: form.data, fornecedor: form.fornecedor, user_id: user?.id,
      forma_pagamento: form.forma_pagamento,
      data_vencimento: form.data_vencimento || null,
      pago: imediato
    }).select().single()
    if (error) { alert('Erro: ' + error.message); setLoading(false); return }
    if (compra) {
      const itensData = itens.map(it => ({ compra_id: compra.id, produto: it.produto, quantidade: parseFloat(it.quantidade), apresentacao: it.apresentacao, valor_unitario: parseFloat(it.valor_unitario), total: parseFloat(it.quantidade) * parseFloat(it.valor_unitario) }))
      const { error: err2 } = await supabase.from('itens_compra').insert(itensData)
      if (err2) alert('Erro nos itens: ' + err2.message)
    }
    setForm(formVazio)
    setItens([{ produto: '', quantidade: '', apresentacao: 'un', valor_unitario: '' }])
    fetchCompras(); setLoading(false)
  }

  async function marcarPago(id: string) {
    await supabase.from('compras').update({ pago: true }).eq('id', id)
    fetchCompras()
  }

  async function deletarCompra(id: string) {
    if (!confirm('Apagar esta compra e todos os seus itens?')) return
    await supabase.from('itens_compra').delete().eq('compra_id', id)
    await supabase.from('compras').delete().eq('id', id)
    fetchCompras()
  }

  async function deletarItem(itemId: string) {
    if (!confirm('Apagar este item?')) return
    await supabase.from('itens_compra').delete().eq('id', itemId)
    fetchCompras()
  }

  function iniciarEdicaoItem(compraId: string, itemId: string) {
    setItensEditaveis(prev => ({ ...prev, [compraId]: prev[compraId].map(it => it.id === itemId ? { ...it, editando: true, _produto: it.produto, _quantidade: String(it.quantidade), _apresentacao: it.apresentacao, _valor_unitario: String(it.valor_unitario) } : it) }))
  }

  function cancelarEdicaoItem(compraId: string, itemId: string) {
    setItensEditaveis(prev => ({ ...prev, [compraId]: prev[compraId].map(it => it.id === itemId ? { ...it, editando: false } : it) }))
  }

  function atualizarCampoItem(compraId: string, itemId: string, campo: string, valor: string) {
    setItensEditaveis(prev => ({ ...prev, [compraId]: prev[compraId].map(it => it.id === itemId ? { ...it, [campo]: valor } : it) }))
  }

  async function salvarEdicaoItem(compraId: string, itemId: string) {
    const item = itensEditaveis[compraId]?.find(it => it.id === itemId)
    if (!item) return
    const quantidade = parseFloat(item._quantidade || '0')
    const valor_unitario = parseFloat(item._valor_unitario || '0')
    const { error } = await supabase.from('itens_compra').update({ produto: item._produto, quantidade, apresentacao: item._apresentacao, valor_unitario, total: quantidade * valor_unitario }).eq('id', itemId)
    if (error) { alert('Erro: ' + error.message); return }
    fetchCompras()
  }

  const totalMes = compras.filter(c => c.pago).reduce((s, c) => s + (c.itens_compra?.reduce((si, i) => si + Number(i.total), 0) || 0), 0)
  const totalPendente = compras.filter(c => !c.pago).reduce((s, c) => s + (c.itens_compra?.reduce((si, i) => si + Number(i.total), 0) || 0), 0)

  const resumoProdutos = compras.flatMap(c => c.itens_compra || []).reduce((acc, it) => {
    const key = `${it.produto}__${it.apresentacao}`
    if (!acc[key]) acc[key] = { produto: it.produto, apresentacao: it.apresentacao, quantidade: 0, total: 0 }
    acc[key].quantidade += Number(it.quantidade); acc[key].total += Number(it.total)
    return acc
  }, {} as Record<string, { produto: string; apresentacao: string; quantidade: number; total: number }>)
  const resumoLista = Object.values(resumoProdutos).sort((a, b) => b.total - a.total)

  const pagamentoSelecionado = PAGAMENTOS.find(p => p.value === form.forma_pagamento)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Package className="w-6 h-6 text-amber-700" />
          <h1 className="text-2xl font-bold text-gray-800">Compras</h1>
        </div>
        <div className="flex items-center gap-3">
          <MonthNav mes={mes} onChange={setMes} />
          <button onClick={abrirPadronizacao}
            className="flex items-center gap-2 text-sm border border-purple-300 text-purple-700 rounded-lg px-3 py-2 hover:bg-purple-50 transition-colors">
            <Wand2 className="w-4 h-4" /> Padronizar produtos
          </button>
          <button onClick={() => setVerResumo(!verResumo)}
            className={`flex items-center gap-2 text-sm border rounded-lg px-3 py-2 transition-colors ${verResumo ? 'bg-amber-700 text-white border-amber-700' : 'border-gray-300 hover:bg-gray-50'}`}>
            <BarChart2 className="w-4 h-4" /> Resumo
          </button>
          <button onClick={() => exportToCsv('compras', compras.flatMap(c => (c.itens_compra || []).map(i => ({ Data: c.data, Fornecedor: c.fornecedor, Produto: i.produto, Quantidade: i.quantidade, Apresentação: i.apresentacao, 'Valor Unit.': i.valor_unitario, Total: i.total, Pagamento: c.forma_pagamento, Pago: c.pago ? 'Sim' : 'Não' }))))}
            className="flex items-center gap-2 text-sm border border-gray-300 rounded-lg px-3 py-2 hover:bg-gray-50 transition-colors">
            <Download className="w-4 h-4" /> CSV
          </button>
          <div className="bg-white border rounded-xl px-4 py-2 text-sm space-y-0.5">
            <div><span className="text-gray-500">Pago:</span> <span className="font-bold text-gray-800">R$ {totalMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
            {totalPendente > 0 && <div><span className="text-orange-500">Pendente:</span> <span className="font-bold text-orange-600">R$ {totalPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>}
          </div>
        </div>
      </div>

      {/* Painel de padronização */}
      {padronizando && (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="p-4 border-b bg-purple-50 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-purple-800 flex items-center gap-2"><Wand2 className="w-4 h-4" /> Padronizar nomes de produtos</h2>
              <p className="text-xs text-purple-600 mt-0.5">
                Esses são todos os nomes usados nas compras. Corrija os que estão errados ou divergentes usando o dropdown ao lado — a alteração vai atualizar <strong>todos</strong> os registros com aquele nome.
              </p>
            </div>
            <button onClick={() => setPadronizando(false)} className="text-gray-400 hover:text-gray-600 ml-4"><X className="w-5 h-5" /></button>
          </div>

          <div className="divide-y max-h-96 overflow-y-auto">
            {nomesUnicos.map(nome => {
              const diferente = mapeamento[nome] !== nome
              return (
                <div key={nome} className={`flex items-center gap-3 px-4 py-3 ${diferente ? 'bg-purple-50' : ''}`}>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${diferente ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{nome}</p>
                    {diferente && <p className="text-xs text-purple-600 mt-0.5">→ será renomeado para &quot;{mapeamento[nome]}&quot;</p>}
                  </div>
                  <select
                    value={mapeamento[nome] || nome}
                    onChange={e => setMapeamento({ ...mapeamento, [nome]: e.target.value })}
                    className={`border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 w-56 ${diferente ? 'border-purple-400 bg-purple-50' : ''}`}>
                    <option value={nome}>{nome} (manter)</option>
                    {produtos.map(p => (
                      <option key={p.nome} value={p.nome}>{p.nome}</option>
                    ))}
                  </select>
                </div>
              )
            })}
          </div>

          <div className="p-4 border-t bg-gray-50 flex items-center justify-between gap-3">
            <p className="text-xs text-gray-500">
              {Object.entries(mapeamento).filter(([o, n]) => o !== n).length} alteração(ões) pendente(s)
            </p>
            <div className="flex gap-3">
              <button onClick={() => setPadronizando(false)} className="border border-gray-300 text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-gray-100">Cancelar</button>
              <button onClick={salvarPadronizacao} disabled={salvandoPadronizacao || Object.entries(mapeamento).filter(([o, n]) => o !== n).length === 0}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2">
                <Check className="w-4 h-4" /> {salvandoPadronizacao ? 'Salvando...' : 'Aplicar padronização'}
              </button>
            </div>
          </div>
        </div>
      )}

      {verResumo && (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="p-4 border-b bg-amber-50">
            <h2 className="font-semibold text-amber-900 flex items-center gap-2"><BarChart2 className="w-4 h-4" /> Resumo — {format(mes, 'MMMM yyyy', { locale: ptBR })}</h2>
            <p className="text-xs text-amber-700 mt-1">Total pago: <strong>R$ {totalMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong> em {compras.length} compra(s)</p>
          </div>
          {resumoLista.length === 0 ? <p className="text-center text-gray-400 py-6 text-sm">Nenhuma compra</p> : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50"><tr>{['Produto', 'Qtd total', 'Unidade', 'Total gasto'].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500">{h}</th>)}</tr></thead>
              <tbody className="divide-y">
                {resumoLista.map(r => (
                  <tr key={r.produto + r.apresentacao} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{r.produto}</td>
                    <td className="px-4 py-3">{r.quantidade.toLocaleString('pt-BR')}</td>
                    <td className="px-4 py-3 text-gray-500">{r.apresentacao}</td>
                    <td className="px-4 py-3 font-semibold text-amber-700">R$ {r.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <div className="bg-white rounded-xl p-6 shadow-sm border">
        <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2"><Plus className="w-4 h-4" />Nova compra</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-600">Data</label>
              <input type="date" value={form.data} onChange={e => setForm({ ...form, data: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Fornecedor</label>
              <input value={form.fornecedor} onChange={e => setForm({ ...form, fornecedor: e.target.value })} placeholder="Nome do fornecedor" required
                className="w-full border rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
          </div>

          {/* Forma de pagamento */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-600">Forma de pagamento</label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {PAGAMENTOS.map(p => (
                  <button key={p.value} type="button" onClick={() => setForm(f => ({ ...f, forma_pagamento: p.value }))}
                    className={`px-3 py-2 rounded-lg text-sm border transition-colors ${form.forma_pagamento === p.value ? 'bg-amber-700 text-white border-amber-700' : 'border-gray-300 hover:bg-gray-50'}`}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            {!pagamentoSelecionado?.imediato && (
              <div>
                <label className="text-xs font-medium text-gray-600">Data de vencimento</label>
                <input type="date" value={form.data_vencimento} onChange={e => setForm({ ...form, data_vencimento: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-amber-500" />
                <p className="text-xs text-orange-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Será registrado como pagamento pendente
                </p>
              </div>
            )}
          </div>

          {/* Chips de produtos rápidos */}
          {produtos.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">Produtos cadastrados — clique para adicionar rapidamente:</p>
              <div className="flex flex-wrap gap-2">
                {produtos.map(p => (
                  <button key={p.nome} type="button"
                    onClick={() => {
                      const idx = itens.findIndex(it => it.produto === '')
                      if (idx >= 0) selecionarProduto(idx, p.nome, p.unidade)
                      else { addItem(); setTimeout(() => selecionarProduto(itens.length, p.nome, p.unidade), 0) }
                    }}
                    className="px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-full text-xs hover:bg-amber-100 hover:border-amber-400 transition-colors font-medium">
                    {p.nome} <span className="text-amber-500 ml-1">{p.unidade}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 px-1">
              <div className="col-span-4">Produto</div><div className="col-span-2">Quantidade</div>
              <div className="col-span-2">Unidade</div><div className="col-span-2">Valor unit.</div><div className="col-span-2">Total</div>
            </div>
            {itens.map((item, i) => {
              const total = parseFloat(item.quantidade || '0') * parseFloat(item.valor_unitario || '0')
              return (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-4">
                    <input list="produtos-compra" value={item.produto} onChange={e => updateItem(i, 'produto', e.target.value)} placeholder="Ex: Farinha de trigo" required
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
                    <datalist id="produtos-compra">{produtos.map(p => <option key={p.nome} value={p.nome} />)}</datalist>
                  </div>
                  <div className="col-span-2">
                    <input type="number" step="0.001" value={item.quantidade} onChange={e => updateItem(i, 'quantidade', e.target.value)} placeholder="0" required
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
                  </div>
                  <div className="col-span-2">
                    <select value={item.apresentacao} onChange={e => updateItem(i, 'apresentacao', e.target.value)}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
                      {apresentacoes.map(a => <option key={a}>{a}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <input type="number" step="0.01" value={item.valor_unitario} onChange={e => updateItem(i, 'valor_unitario', e.target.value)} placeholder="0,00" required
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
                  </div>
                  <div className="col-span-1 text-sm font-medium text-gray-700">R$ {total.toFixed(2)}</div>
                  <div className="col-span-1 flex justify-center">
                    {itens.length > 1 && <button type="button" onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>}
                  </div>
                </div>
              )
            })}
            <button type="button" onClick={addItem} className="text-amber-700 text-sm hover:underline flex items-center gap-1 mt-2">
              <Plus className="w-3 h-3" /> Adicionar item
            </button>
          </div>
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="text-sm font-medium text-gray-700">
              Total: <span className="text-amber-700 font-bold">R$ {itens.reduce((s, it) => s + parseFloat(it.quantidade || '0') * parseFloat(it.valor_unitario || '0'), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              {!pagamentoSelecionado?.imediato && <span className="text-orange-500 text-xs ml-2">(pendente até {form.data_vencimento ? format(new Date(form.data_vencimento + 'T12:00:00'), 'dd/MM/yyyy') : '...'})</span>}
            </div>
            <button type="submit" disabled={loading} className="bg-amber-700 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-amber-800 transition-colors disabled:opacity-50">
              {loading ? 'Salvando...' : 'Salvar compra'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="p-4 border-b"><h2 className="font-semibold text-gray-800">Histórico</h2></div>
        {compras.length === 0 ? <p className="text-center text-gray-400 py-8 text-sm">Nenhuma compra neste mês</p> : (
          <div className="divide-y">
            {compras.map(c => {
              const totalCompra = c.itens_compra?.reduce((s, i) => s + Number(i.total), 0) || 0
              const aberto = expandido === c.id
              const itensEd = itensEditaveis[c.id] || []
              const vencido = !c.pago && c.data_vencimento && c.data_vencimento < hoje
              return (
                <div key={c.id}>
                  <div className={`flex items-center ${vencido ? 'bg-red-50' : ''}`}>
                    <button onClick={() => setExpandido(aberto ? null : c.id)}
                      className="flex-1 p-4 flex justify-between items-center hover:bg-gray-50 transition-colors text-left">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-gray-800">{c.fornecedor}</span>
                        <span className="text-gray-400 text-sm">{format(new Date(c.data + 'T12:00:00'), "dd/MM", { locale: ptBR })}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${c.forma_pagamento === 'debito' ? 'bg-blue-100 text-blue-700' : c.forma_pagamento === 'pix' ? 'bg-green-100 text-green-700' : c.forma_pagamento === 'credito' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'}`}>
                          {c.forma_pagamento}
                        </span>
                        {!c.pago && (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${vencido ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {vencido ? '⚠️ Vencido' : `Vence ${c.data_vencimento ? format(new Date(c.data_vencimento + 'T12:00:00'), 'dd/MM') : ''}`}
                          </span>
                        )}
                        {c.pago && ['credito', 'boleto'].includes(c.forma_pagamento) && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">✓ Pago</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`font-bold ${c.pago ? 'text-gray-800' : 'text-orange-600'}`}>R$ {totalCompra.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        {aberto ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                      </div>
                    </button>
                    <div className="flex items-center gap-1 pr-3">
                      {!c.pago && (
                        <button onClick={() => marcarPago(c.id)} title="Marcar como pago"
                          className="text-green-400 hover:text-green-600 transition-colors p-1">
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                      )}
                      <button onClick={() => deletarCompra(c.id)} className="text-gray-300 hover:text-red-500 transition-colors p-1"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                  {aberto && (
                    <div className="px-4 pb-4 bg-gray-50 border-t">
                      <table className="w-full text-sm mt-3">
                        <thead><tr className="text-xs text-gray-500">
                          <th className="text-left pb-2">Produto</th><th className="text-left pb-2">Quantidade</th>
                          <th className="text-left pb-2">Valor unit.</th><th className="text-right pb-2">Total</th><th className="pb-2"></th>
                        </tr></thead>
                        <tbody className="divide-y divide-gray-200">
                          {itensEd.map(it => (
                            <tr key={it.id}>
                              {it.editando ? (
                                <>
                                  <td className="py-2 pr-2">
                                    <select value={it._produto} onChange={e => atualizarCampoItem(c.id, it.id, '_produto', e.target.value)} className="w-full border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500">
                                      {it._produto && !produtos.find(p => p.nome === it._produto) && (
                                        <option value={it._produto}>{it._produto} (atual)</option>
                                      )}
                                      {produtos.map(p => <option key={p.nome} value={p.nome}>{p.nome}</option>)}
                                    </select>
                                  </td>
                                  <td className="py-2 pr-2"><div className="flex gap-1">
                                    <input type="number" step="0.001" value={it._quantidade} onChange={e => atualizarCampoItem(c.id, it.id, '_quantidade', e.target.value)} className="w-20 border rounded px-2 py-1 text-sm" />
                                    <select value={it._apresentacao} onChange={e => atualizarCampoItem(c.id, it.id, '_apresentacao', e.target.value)} className="border rounded px-1 py-1 text-sm">
                                      {apresentacoes.map(a => <option key={a}>{a}</option>)}
                                    </select>
                                  </div></td>
                                  <td className="py-2 pr-2"><input type="number" step="0.01" value={it._valor_unitario} onChange={e => atualizarCampoItem(c.id, it.id, '_valor_unitario', e.target.value)} className="w-24 border rounded px-2 py-1 text-sm" /></td>
                                  <td className="py-2 text-right font-semibold">R$ {(parseFloat(it._quantidade || '0') * parseFloat(it._valor_unitario || '0')).toFixed(2)}</td>
                                  <td className="py-2 pl-2"><div className="flex gap-1">
                                    <button onClick={() => salvarEdicaoItem(c.id, it.id)} className="text-green-600 hover:text-green-700"><Check className="w-4 h-4" /></button>
                                    <button onClick={() => cancelarEdicaoItem(c.id, it.id)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                                  </div></td>
                                </>
                              ) : (
                                <>
                                  <td className="py-2 font-medium">{it.produto}</td>
                                  <td className="py-2 text-gray-600">{it.quantidade} {it.apresentacao}</td>
                                  <td className="py-2 text-gray-600">R$ {Number(it.valor_unitario).toFixed(2)}</td>
                                  <td className="py-2 text-right font-semibold">R$ {Number(it.total).toFixed(2)}</td>
                                  <td className="py-2 pl-2"><div className="flex gap-1">
                                    <button onClick={() => iniciarEdicaoItem(c.id, it.id)} className="text-gray-400 hover:text-amber-600"><Pencil className="w-3.5 h-3.5" /></button>
                                    <button onClick={() => deletarItem(it.id)} className="text-gray-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                                  </div></td>
                                </>
                              )}
                            </tr>
                          ))}
                        </tbody>
                        <tfoot><tr className="border-t border-gray-300">
                          <td colSpan={3} className="pt-2 text-xs text-gray-500 font-medium">Total da compra</td>
                          <td className="pt-2 text-right font-bold text-amber-700">R$ {totalCompra.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                          <td></td>
                        </tr></tfoot>
                      </table>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
