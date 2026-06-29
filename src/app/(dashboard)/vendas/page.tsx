'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Venda, Meta } from '@/types'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Plus, TrendingUp, Download } from 'lucide-react'
import { exportToCsv } from '@/lib/exportCsv'

const hoje = format(new Date(), 'yyyy-MM-dd')

export default function VendasPage() {
  const supabase = createClient()
  const [vendas, setVendas] = useState<Venda[]>([])
  const [meta, setMeta] = useState<Meta | null>(null)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    data: hoje, dinheiro: '', debito: '', credito: '', pix: '', saidas: '', obs: ''
  })

  const mesAtual = format(new Date(), 'yyyy-MM')

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    const inicio = startOfMonth(new Date()).toISOString().split('T')[0]
    const fim = endOfMonth(new Date()).toISOString().split('T')[0]

    const [{ data: v }, { data: m }] = await Promise.all([
      supabase.from('vendas').select('*').gte('data', inicio).lte('data', fim).order('data', { ascending: false }),
      supabase.from('metas').select('*').eq('mes_referencia', mesAtual).single()
    ])
    if (v) setVendas(v)
    if (m) setMeta(m)
  }

  const totalMes = vendas.reduce((s, v) => s + v.total, 0)
  const progressoPct = meta ? Math.min((totalMes / meta.meta_vendas) * 100, 100) : 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const din = parseFloat(form.dinheiro || '0')
    const deb = parseFloat(form.debito || '0')
    const cred = parseFloat(form.credito || '0')
    const pix = parseFloat(form.pix || '0')
    const saidas = parseFloat(form.saidas || '0')
    const total = din + deb + cred + pix - saidas

    await supabase.from('vendas').insert({
      data: form.data, dinheiro: din, debito: deb, credito: cred,
      pix, saidas, total, obs: form.obs, user_id: user?.id
    })
    setForm({ data: hoje, dinheiro: '', debito: '', credito: '', pix: '', saidas: '', obs: '' })
    fetchData()
    setLoading(false)
  }

  const totalForm = (parseFloat(form.dinheiro || '0') + parseFloat(form.debito || '0') +
    parseFloat(form.credito || '0') + parseFloat(form.pix || '0')) - parseFloat(form.saidas || '0')

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TrendingUp className="w-6 h-6 text-amber-700" />
          <h1 className="text-2xl font-bold text-gray-800">Vendas Diárias</h1>
        </div>
        <button
          onClick={() => exportToCsv('vendas', vendas.map(v => ({ Data: v.data, Dinheiro: v.dinheiro, Débito: v.debito, Crédito: v.credito, Pix: v.pix, Saídas: v.saidas, Total: v.total, Observações: v.obs || '' })))}
          className="flex items-center gap-2 text-sm border border-gray-300 rounded-lg px-3 py-2 hover:bg-gray-50 transition-colors"
        >
          <Download className="w-4 h-4" /> Exportar CSV
        </button>
      </div>

      {meta && (
        <div className="bg-white rounded-xl p-5 shadow-sm border">
          <div className="flex justify-between text-sm mb-2">
            <span className="font-medium text-gray-700">Meta mensal</span>
            <span className="text-gray-500">
              R$ {totalMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / R$ {meta.meta_vendas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 rounded-full transition-all"
              style={{ width: `${progressoPct}%` }}
            />
          </div>
          <p className="text-right text-xs text-gray-500 mt-1">{progressoPct.toFixed(1)}%</p>
        </div>
      )}

      <div className="bg-white rounded-xl p-6 shadow-sm border">
        <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Plus className="w-4 h-4" /> Lançar venda
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-600">Data</label>
              <input type="date" value={form.data} onChange={e => setForm({ ...form, data: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Dinheiro (R$)</label>
              <input type="number" step="0.01" value={form.dinheiro} onChange={e => setForm({ ...form, dinheiro: e.target.value })}
                placeholder="0,00" className="w-full border rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Débito (R$)</label>
              <input type="number" step="0.01" value={form.debito} onChange={e => setForm({ ...form, debito: e.target.value })}
                placeholder="0,00" className="w-full border rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Crédito (R$)</label>
              <input type="number" step="0.01" value={form.credito} onChange={e => setForm({ ...form, credito: e.target.value })}
                placeholder="0,00" className="w-full border rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Pix (R$)</label>
              <input type="number" step="0.01" value={form.pix} onChange={e => setForm({ ...form, pix: e.target.value })}
                placeholder="0,00" className="w-full border rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Saídas de caixa (R$)</label>
              <input type="number" step="0.01" value={form.saidas} onChange={e => setForm({ ...form, saidas: e.target.value })}
                placeholder="0,00" className="w-full border rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Observações</label>
            <textarea value={form.obs} onChange={e => setForm({ ...form, obs: e.target.value })}
              rows={2} placeholder="Opcional..." className="w-full border rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-amber-500" />
          </div>
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="text-lg font-bold text-gray-800">
              Total: <span className={totalForm >= 0 ? 'text-green-600' : 'text-red-600'}>
                R$ {totalForm.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <button type="submit" disabled={loading}
              className="bg-amber-700 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-amber-800 transition-colors disabled:opacity-50">
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="p-4 border-b">
          <h2 className="font-semibold text-gray-800">Histórico do mês</h2>
        </div>
        {vendas.length === 0 ? (
          <p className="text-center text-gray-400 py-8 text-sm">Nenhuma venda lançada este mês</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Data', 'Dinheiro', 'Débito', 'Crédito', 'Pix', 'Saídas', 'Total', 'Obs'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {vendas.map(v => (
                <tr key={v.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">{format(new Date(v.data + 'T12:00:00'), 'dd/MM', { locale: ptBR })}</td>
                  <td className="px-4 py-3">{v.dinheiro > 0 ? `R$ ${v.dinheiro.toFixed(2)}` : '-'}</td>
                  <td className="px-4 py-3">{v.debito > 0 ? `R$ ${v.debito.toFixed(2)}` : '-'}</td>
                  <td className="px-4 py-3">{v.credito > 0 ? `R$ ${v.credito.toFixed(2)}` : '-'}</td>
                  <td className="px-4 py-3">{v.pix > 0 ? `R$ ${v.pix.toFixed(2)}` : '-'}</td>
                  <td className="px-4 py-3 text-red-500">{v.saidas > 0 ? `-R$ ${v.saidas.toFixed(2)}` : '-'}</td>
                  <td className="px-4 py-3 font-semibold text-green-600">R$ {v.total.toFixed(2)}</td>
                  <td className="px-4 py-3 text-gray-400">{v.obs || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
