'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Producao, Meta } from '@/types'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { Recycle, Plus, AlertTriangle, Download } from 'lucide-react'
import { exportToCsv } from '@/lib/exportCsv'

const hoje = format(new Date(), 'yyyy-MM-dd')
const mesAtual = format(new Date(), 'yyyy-MM')

export default function ProducaoPage() {
  const supabase = createClient()
  const [producoes, setProducoes] = useState<Producao[]>([])
  const [meta, setMeta] = useState<Meta | null>(null)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ data: hoje, produto: '', produzido: '', descartado: '', custo_estimado: '' })

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('producao').insert({
      data: form.data, produto: form.produto,
      produzido: parseInt(form.produzido),
      descartado: parseInt(form.descartado),
      custo_estimado: parseFloat(form.custo_estimado || '0'),
      user_id: user?.id
    })
    setForm({ data: hoje, produto: '', produzido: '', descartado: '', custo_estimado: '' })
    fetchData()
    setLoading(false)
  }

  const taxaGeral = producoes.length > 0
    ? (producoes.reduce((s, p) => s + p.descartado, 0) / producoes.reduce((s, p) => s + p.produzido, 0)) * 100
    : 0

  const custoTotalDesperdicio = producoes.reduce((s, p) => s + p.custo_estimado, 0)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Recycle className="w-6 h-6 text-amber-700" />
          <h1 className="text-2xl font-bold text-gray-800">Produção e Desperdício</h1>
        </div>
        <button
          onClick={() => exportToCsv('producao', producoes.map(p => ({ Data: p.data, Produto: p.produto, Produzido: p.produzido, Descartado: p.descartado, 'Taxa (%)': ((p.descartado / p.produzido) * 100).toFixed(1), 'Custo Desperdício': p.custo_estimado })))}
          className="flex items-center gap-2 text-sm border border-gray-300 rounded-lg px-3 py-2 hover:bg-gray-50 transition-colors"
        >
          <Download className="w-4 h-4" /> Exportar CSV
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border text-center">
          <p className="text-xs text-gray-500">Total produzido</p>
          <p className="text-2xl font-bold text-gray-800">{producoes.reduce((s, p) => s + p.produzido, 0)}</p>
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

      <div className="bg-white rounded-xl p-6 shadow-sm border">
        <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2"><Plus className="w-4 h-4" />Lançar produção</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-600">Data</label>
              <input type="date" value={form.data} onChange={e => setForm({ ...form, data: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Produto</label>
              <input value={form.produto} onChange={e => setForm({ ...form, produto: e.target.value })}
                placeholder="Ex: Pão francês" required
                className="w-full border rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Produzido (un)</label>
              <input type="number" value={form.produzido} onChange={e => setForm({ ...form, produzido: e.target.value })}
                placeholder="0" required
                className="w-full border rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Descartado (un)</label>
              <input type="number" value={form.descartado} onChange={e => setForm({ ...form, descartado: e.target.value })}
                placeholder="0" required
                className="w-full border rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Custo estimado do descarte (R$)</label>
              <input type="number" step="0.01" value={form.custo_estimado} onChange={e => setForm({ ...form, custo_estimado: e.target.value })}
                placeholder="0,00"
                className="w-full border rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
            {form.produzido && form.descartado && (
              <div className="flex items-end pb-2">
                <div>
                  <p className="text-xs text-gray-500">Taxa deste lançamento</p>
                  <p className={`text-lg font-bold ${meta && (parseInt(form.descartado) / parseInt(form.produzido)) * 100 > meta.meta_desperdicio_pct ? 'text-red-600' : 'text-green-600'}`}>
                    {((parseInt(form.descartado) / parseInt(form.produzido)) * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
            )}
          </div>
          <div className="flex justify-end border-t pt-4">
            <button type="submit" disabled={loading}
              className="bg-amber-700 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-amber-800 transition-colors disabled:opacity-50">
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="p-4 border-b"><h2 className="font-semibold text-gray-800">Histórico do mês</h2></div>
        {producoes.length === 0 ? (
          <p className="text-center text-gray-400 py-8 text-sm">Nenhum lançamento este mês</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Data', 'Produto', 'Produzido', 'Descartado', 'Taxa', 'Custo desperdício'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {producoes.map(p => {
                const taxa = (p.descartado / p.produzido) * 100
                const alerta = meta && taxa > meta.meta_desperdicio_pct
                return (
                  <tr key={p.id} className={`hover:bg-gray-50 ${alerta ? 'bg-red-50' : ''}`}>
                    <td className="px-4 py-3">{format(new Date(p.data + 'T12:00:00'), 'dd/MM')}</td>
                    <td className="px-4 py-3 font-medium">{p.produto}</td>
                    <td className="px-4 py-3">{p.produzido}</td>
                    <td className="px-4 py-3">{p.descartado}</td>
                    <td className={`px-4 py-3 font-semibold ${alerta ? 'text-red-600' : 'text-green-600'}`}>
                      {taxa.toFixed(1)}% {alerta && '⚠️'}
                    </td>
                    <td className="px-4 py-3 text-red-500">R$ {p.custo_estimado.toFixed(2)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
