'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Producao, Meta } from '@/types'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Recycle, Plus, AlertTriangle, Download, ChevronDown, ChevronUp, BarChart2, Trash2, Pencil, Check, X } from 'lucide-react'
import { exportToCsv } from '@/lib/exportCsv'

const hoje = format(new Date(), 'yyyy-MM-dd')
const mesAtual = format(new Date(), 'yyyy-MM')

interface ItemEditavel extends Producao {
  editando?: boolean
  _produto?: string
  _produzido?: string
  _descartado?: string
  _custo_estimado?: string
}

export default function ProducaoPage() {
  const supabase = createClient()
  const [producoes, setProducoes] = useState<ItemEditavel[]>([])
  const [meta, setMeta] = useState<Meta | null>(null)
  const [loading, setLoading] = useState(false)
  const [expandido, setExpandido] = useState<string | null>(null)
  const [verResumo, setVerResumo] = useState(false)
  const [itens, setItens] = useState([{ produto: '', produzido: '', descartado: '', custo_estimado: '' }])
  const [dataForm, setDataForm] = useState(hoje)

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    const inicio = startOfMonth(new Date()).toISOString().split('T')[0]
    const fim = endOfMonth(new Date()).toISOString().split('T')[0]
    const [{ data: p }, { data: m }] = await Promise.all([
      supabase.from('producao').select('*').gte('data', inicio).lte('data', fim).order('data', { ascending: false }),
      supabase.from('metas').select('*').eq('mes_referencia', mesAtual).single()
    ])
    if (p) setProducoes(p)
    if (m) setMeta(m)
  }

  function addItem() {
    setItens([...itens, { produto: '', produzido: '', descartado: '', custo_estimado: '' }])
  }

  function removeItem(i: number) {
    setItens(itens.filter((_, idx) => idx !== i))
  }

  function updateItem(i: number, field: string, value: string) {
    const novo = [...itens]
    novo[i] = { ...novo[i], [field]: value }
    setItens(novo)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const registros = itens.map(it => ({
      data: dataForm, produto: it.produto,
      produzido: parseInt(it.produzido),
      descartado: parseInt(it.descartado || '0'),
      custo_estimado: parseFloat(it.custo_estimado || '0'),
      user_id: user?.id
    }))
    const { error } = await supabase.from('producao').insert(registros)
    if (error) { alert('Erro: ' + error.message); setLoading(false); return }
    setDataForm(hoje)
    setItens([{ produto: '', produzido: '', descartado: '', custo_estimado: '' }])
    fetchData()
    setLoading(false)
  }

  async function deletarItem(id: string) {
    if (!confirm('Apagar este item de produção?')) return
    await supabase.from('producao').delete().eq('id', id)
    fetchData()
  }

  function iniciarEdicao(id: string) {
    const item = producoes.find(p => p.id === id)
    if (!item) return
    setProducoes(prev => prev.map(p => p.id === id
      ? { ...p, editando: true, _produto: p.produto, _produzido: String(p.produzido), _descartado: String(p.descartado), _custo_estimado: String(p.custo_estimado) }
      : p))
  }

  function cancelarEdicao(id: string) {
    setProducoes(prev => prev.map(p => p.id === id ? { ...p, editando: false } : p))
  }

  function atualizarCampo(id: string, campo: string, valor: string) {
    setProducoes(prev => prev.map(p => p.id === id ? { ...p, [campo]: valor } : p))
  }

  async function salvarEdicao(id: string) {
    const item = producoes.find(p => p.id === id)
    if (!item) return
    const { error } = await supabase.from('producao').update({
      produto: item._produto,
      produzido: parseInt(item._produzido || '0'),
      descartado: parseInt(item._descartado || '0'),
      custo_estimado: parseFloat(item._custo_estimado || '0'),
    }).eq('id', id)
    if (error) { alert('Erro: ' + error.message); return }
    fetchData()
  }

  // Agrupar por data
  const porData = producoes.reduce((acc, p) => {
    if (!acc[p.data]) acc[p.data] = []
    acc[p.data].push(p)
    return acc
  }, {} as Record<string, ItemEditavel[]>)

  const datasOrdenadas = Object.keys(porData).sort((a, b) => b.localeCompare(a))

  // Totais gerais do mês
  const totalProduzido = producoes.reduce((s, p) => s + p.produzido, 0)
  const totalDescartado = producoes.reduce((s, p) => s + p.descartado, 0)
  const taxaGeral = totalProduzido > 0 ? (totalDescartado / totalProduzido) * 100 : 0
  const custoTotalDesperdicio = producoes.reduce((s, p) => s + p.custo_estimado, 0)

  // Resumo por produto
  const resumoProdutos = producoes.reduce((acc, p) => {
    if (!acc[p.produto]) acc[p.produto] = { produto: p.produto, produzido: 0, descartado: 0, custo: 0 }
    acc[p.produto].produzido += p.produzido
    acc[p.produto].descartado += p.descartado
    acc[p.produto].custo += p.custo_estimado
    return acc
  }, {} as Record<string, { produto: string; produzido: number; descartado: number; custo: number }>)

  const resumoLista = Object.values(resumoProdutos).sort((a, b) => b.produzido - a.produzido)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Recycle className="w-6 h-6 text-amber-700" />
          <h1 className="text-2xl font-bold text-gray-800">Produção e Desperdício</h1>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setVerResumo(!verResumo)}
            className={`flex items-center gap-2 text-sm border rounded-lg px-3 py-2 transition-colors ${verResumo ? 'bg-amber-700 text-white border-amber-700' : 'border-gray-300 hover:bg-gray-50'}`}>
            <BarChart2 className="w-4 h-4" /> Resumo do mês
          </button>
          <button
            onClick={() => exportToCsv('producao', producoes.map(p => ({ Data: p.data, Produto: p.produto, Produzido: p.produzido, Descartado: p.descartado, 'Taxa (%)': ((p.descartado / p.produzido) * 100).toFixed(1), 'Custo Desperdício': p.custo_estimado })))}
            className="flex items-center gap-2 text-sm border border-gray-300 rounded-lg px-3 py-2 hover:bg-gray-50 transition-colors">
            <Download className="w-4 h-4" /> Exportar CSV
          </button>
        </div>
      </div>

      {/* Cards resumo */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border text-center">
          <p className="text-xs text-gray-500">Total produzido</p>
          <p className="text-2xl font-bold text-gray-800">{totalProduzido.toLocaleString('pt-BR')}</p>
          <p className="text-xs text-gray-400">unidades</p>
        </div>
        <div className={`rounded-xl p-4 shadow-sm border text-center ${meta && taxaGeral > meta.meta_desperdicio_pct ? 'bg-red-50 border-red-200' : 'bg-white'}`}>
          <p className="text-xs text-gray-500">Taxa de desperdício</p>
          <p className={`text-2xl font-bold ${meta && taxaGeral > meta.meta_desperdicio_pct ? 'text-red-600' : 'text-gray-800'}`}>
            {taxaGeral.toFixed(1)}%
          </p>
          {meta && <p className="text-xs text-gray-400">meta: {meta.meta_desperdicio_pct}%</p>}
          {meta && taxaGeral > meta.meta_desperdicio_pct && (
            <div className="flex items-center justify-center gap-1 mt-1">
              <AlertTriangle className="w-3 h-3 text-red-500" />
              <span className="text-xs text-red-500">Acima da meta!</span>
            </div>
          )}
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border text-center">
          <p className="text-xs text-gray-500">Custo do desperdício</p>
          <p className="text-2xl font-bold text-red-600">R$ {custoTotalDesperdicio.toFixed(2)}</p>
        </div>
      </div>

      {/* Resumo por produto */}
      {verResumo && (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="p-4 border-b bg-amber-50">
            <h2 className="font-semibold text-amber-900 flex items-center gap-2">
              <BarChart2 className="w-4 h-4" /> Resumo de produção — {format(new Date(), 'MMMM yyyy', { locale: ptBR })}
            </h2>
            <p className="text-xs text-amber-700 mt-1">
              {totalProduzido.toLocaleString('pt-BR')} unidades produzidas em {datasOrdenadas.length} dia(s) de produção
            </p>
          </div>
          {resumoLista.length === 0 ? (
            <p className="text-center text-gray-400 py-6 text-sm">Nenhum registro este mês</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Produto', 'Total produzido', 'Total descartado', 'Taxa', 'Custo desperdício'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {resumoLista.map(r => {
                  const taxa = r.produzido > 0 ? (r.descartado / r.produzido) * 100 : 0
                  const alerta = meta && taxa > meta.meta_desperdicio_pct
                  return (
                    <tr key={r.produto} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{r.produto}</td>
                      <td className="px-4 py-3">{r.produzido.toLocaleString('pt-BR')} un</td>
                      <td className="px-4 py-3">{r.descartado.toLocaleString('pt-BR')} un</td>
                      <td className={`px-4 py-3 font-semibold ${alerta ? 'text-red-600' : 'text-green-600'}`}>{taxa.toFixed(1)}%</td>
                      <td className="px-4 py-3 text-red-500">R$ {r.custo.toFixed(2)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Formulário */}
      <div className="bg-white rounded-xl p-6 shadow-sm border">
        <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2"><Plus className="w-4 h-4" />Lançar produção do dia</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-600">Data</label>
            <input type="date" value={dataForm} onChange={e => setDataForm(e.target.value)}
              className="w-48 border rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-amber-500" />
          </div>

          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 px-1">
              <div className="col-span-4">Produto</div>
              <div className="col-span-2">Produzido (un)</div>
              <div className="col-span-2">Descartado (un)</div>
              <div className="col-span-3">Custo do descarte (R$)</div>
              <div className="col-span-1"></div>
            </div>
            {itens.map((item, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-4">
                  <input value={item.produto} onChange={e => updateItem(i, 'produto', e.target.value)}
                    placeholder="Ex: Pão francês" required
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
                </div>
                <div className="col-span-2">
                  <input type="number" value={item.produzido} onChange={e => updateItem(i, 'produzido', e.target.value)}
                    placeholder="0" required
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
                </div>
                <div className="col-span-2">
                  <input type="number" value={item.descartado} onChange={e => updateItem(i, 'descartado', e.target.value)}
                    placeholder="0"
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
                </div>
                <div className="col-span-3">
                  <input type="number" step="0.01" value={item.custo_estimado} onChange={e => updateItem(i, 'custo_estimado', e.target.value)}
                    placeholder="0,00"
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
                </div>
                <div className="col-span-1 flex justify-center">
                  {itens.length > 1 && (
                    <button type="button" onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
            <button type="button" onClick={addItem} className="text-amber-700 text-sm hover:underline flex items-center gap-1 mt-2">
              <Plus className="w-3 h-3" /> Adicionar produto
            </button>
          </div>

          <div className="flex justify-end pt-2 border-t">
            <button type="submit" disabled={loading}
              className="bg-amber-700 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-amber-800 transition-colors disabled:opacity-50">
              {loading ? 'Salvando...' : 'Salvar produção'}
            </button>
          </div>
        </form>
      </div>

      {/* Histórico agrupado por dia */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="p-4 border-b"><h2 className="font-semibold text-gray-800">Histórico do mês</h2></div>
        {datasOrdenadas.length === 0 ? (
          <p className="text-center text-gray-400 py-8 text-sm">Nenhum lançamento este mês</p>
        ) : (
          <div className="divide-y">
            {datasOrdenadas.map(data => {
              const itensDia = porData[data]
              const totalDiaProduzido = itensDia.reduce((s, p) => s + p.produzido, 0)
              const totalDiaDescartado = itensDia.reduce((s, p) => s + p.descartado, 0)
              const taxaDia = totalDiaProduzido > 0 ? (totalDiaDescartado / totalDiaProduzido) * 100 : 0
              const alerta = meta && taxaDia > meta.meta_desperdicio_pct
              const aberto = expandido === data
              return (
                <div key={data}>
                  <button onClick={() => setExpandido(aberto ? null : data)}
                    className="w-full p-4 flex justify-between items-center hover:bg-gray-50 transition-colors text-left">
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-gray-800">
                        {format(new Date(data + 'T12:00:00'), "dd 'de' MMMM", { locale: ptBR })}
                      </span>
                      <span className="text-gray-400 text-xs">({itensDia.length} produto(s))</span>
                      {alerta && <AlertTriangle className="w-4 h-4 text-red-500" />}
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-gray-600">{totalDiaProduzido.toLocaleString('pt-BR')} produzidos</span>
                      <span className={`text-sm font-semibold ${alerta ? 'text-red-600' : 'text-green-600'}`}>{taxaDia.toFixed(1)}% descarte</span>
                      {aberto ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </div>
                  </button>
                  {aberto && (
                    <div className="px-4 pb-4 bg-gray-50 border-t">
                      <table className="w-full text-sm mt-3">
                        <thead>
                          <tr className="text-xs text-gray-500">
                            <th className="text-left pb-2">Produto</th>
                            <th className="text-left pb-2">Produzido</th>
                            <th className="text-left pb-2">Descartado</th>
                            <th className="text-left pb-2">Taxa</th>
                            <th className="text-left pb-2">Custo desperdício</th>
                            <th className="pb-2"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {itensDia.map(it => {
                            const taxa = it.produzido > 0 ? (it.descartado / it.produzido) * 100 : 0
                            const al = meta && taxa > meta.meta_desperdicio_pct
                            return (
                              <tr key={it.id}>
                                {it.editando ? (
                                  <>
                                    <td className="py-2 pr-2">
                                      <input value={it._produto} onChange={e => atualizarCampo(it.id, '_produto', e.target.value)}
                                        className="w-full border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500" />
                                    </td>
                                    <td className="py-2 pr-2">
                                      <input type="number" value={it._produzido} onChange={e => atualizarCampo(it.id, '_produzido', e.target.value)}
                                        className="w-20 border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500" />
                                    </td>
                                    <td className="py-2 pr-2">
                                      <input type="number" value={it._descartado} onChange={e => atualizarCampo(it.id, '_descartado', e.target.value)}
                                        className="w-20 border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500" />
                                    </td>
                                    <td className="py-2 text-gray-400 text-xs">—</td>
                                    <td className="py-2 pr-2">
                                      <input type="number" step="0.01" value={it._custo_estimado} onChange={e => atualizarCampo(it.id, '_custo_estimado', e.target.value)}
                                        className="w-24 border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500" />
                                    </td>
                                    <td className="py-2 pl-2">
                                      <div className="flex gap-1">
                                        <button onClick={() => salvarEdicao(it.id)} className="text-green-600 hover:text-green-700"><Check className="w-4 h-4" /></button>
                                        <button onClick={() => cancelarEdicao(it.id)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                                      </div>
                                    </td>
                                  </>
                                ) : (
                                  <>
                                    <td className="py-2 font-medium">{it.produto}</td>
                                    <td className="py-2 text-gray-600">{it.produzido} un</td>
                                    <td className="py-2 text-gray-600">{it.descartado} un</td>
                                    <td className={`py-2 font-semibold ${al ? 'text-red-600' : 'text-green-600'}`}>{taxa.toFixed(1)}%</td>
                                    <td className="py-2 text-red-500">R$ {it.custo_estimado.toFixed(2)}</td>
                                    <td className="py-2 pl-2">
                                      <div className="flex gap-1">
                                        <button onClick={() => iniciarEdicao(it.id)} className="text-gray-400 hover:text-amber-600"><Pencil className="w-3.5 h-3.5" /></button>
                                        <button onClick={() => deletarItem(it.id)} className="text-gray-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                                      </div>
                                    </td>
                                  </>
                                )}
                              </tr>
                            )
                          })}
                        </tbody>
                        <tfoot>
                          <tr className="border-t border-gray-300">
                            <td className="pt-2 text-xs text-gray-500 font-medium">Total do dia</td>
                            <td className="pt-2 font-bold">{totalDiaProduzido} un</td>
                            <td className="pt-2 font-bold">{totalDiaDescartado} un</td>
                            <td className={`pt-2 font-bold ${alerta ? 'text-red-600' : 'text-green-600'}`}>{taxaDia.toFixed(1)}%</td>
                            <td className="pt-2 text-red-500 font-bold">R$ {itensDia.reduce((s, p) => s + p.custo_estimado, 0).toFixed(2)}</td>
                            <td></td>
                          </tr>
                        </tfoot>
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
