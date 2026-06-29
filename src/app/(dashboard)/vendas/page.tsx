'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Venda, Meta } from '@/types'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Plus, TrendingUp, Download, Pencil, Trash2, X, Check } from 'lucide-react'
import { exportToCsv } from '@/lib/exportCsv'
import MonthNav from '@/components/MonthNav'

const hoje = format(new Date(), 'yyyy-MM-dd')
const formVazio = { data: hoje, dinheiro: '', debito: '', credito: '', pix: '', saidas: '', obs: '' }

export default function VendasPage() {
  const supabase = createClient()
  const [mes, setMes] = useState(new Date())
  const [vendas, setVendas] = useState<Venda[]>([])
  const [meta, setMeta] = useState<Meta | null>(null)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState(formVazio)
  const [editandoId, setEditandoId] = useState<string | null>(null)

  useEffect(() => { fetchData() }, [mes])

  async function fetchData() {
    const inicio = startOfMonth(mes).toISOString().split('T')[0]
    const fim = endOfMonth(mes).toISOString().split('T')[0]
    const mesRef = format(mes, 'yyyy-MM')
    const [{ data: v }, { data: m }] = await Promise.all([
      supabase.from('vendas').select('*').gte('data', inicio).lte('data', fim).order('data', { ascending: false }),
      supabase.from('metas').select('*').eq('mes_referencia', mesRef).single()
    ])
    if (v) setVendas(v)
    if (m) setMeta(m)
  }

  const totalMes = vendas.reduce((s, v) => s + v.total, 0)
  const progressoPct = meta ? Math.min((totalMes / meta.meta_vendas) * 100, 100) : 0

  function calcTotal(f: typeof form) {
    return (parseFloat(f.dinheiro || '0') + parseFloat(f.debito || '0') +
      parseFloat(f.credito || '0') + parseFloat(f.pix || '0')) - parseFloat(f.saidas || '0')
  }

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

    if (editandoId) {
      await supabase.from('vendas').update({ data: form.data, dinheiro: din, debito: deb, credito: cred, pix, saidas, total, obs: form.obs }).eq('id', editandoId)
      setEditandoId(null)
    } else {
      await supabase.from('vendas').insert({ data: form.data, dinheiro: din, debito: deb, credito: cred, pix, saidas, total, obs: form.obs, user_id: user?.id })
    }
    setForm(formVazio)
    fetchData()
    setLoading(false)
  }

  function iniciarEdicao(v: Venda) {
    setEditandoId(v.id)
    setForm({ data: v.data, dinheiro: v.dinheiro > 0 ? String(v.dinheiro) : '', debito: v.debito > 0 ? String(v.debito) : '', credito: v.credito > 0 ? String(v.credito) : '', pix: v.pix > 0 ? String(v.pix) : '', saidas: v.saidas > 0 ? String(v.saidas) : '', obs: v.obs || '' })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function deletarVenda(id: string) {
    if (!confirm('Apagar este lançamento de venda?')) return
    await supabase.from('vendas').delete().eq('id', id)
    fetchData()
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TrendingUp className="w-6 h-6 text-amber-700" />
          <h1 className="text-2xl font-bold text-gray-800">Vendas Diárias</h1>
        </div>
        <div className="flex items-center gap-3">
          <MonthNav mes={mes} onChange={setMes} />
          <button onClick={() => exportToCsv('vendas', vendas.map(v => ({ Data: v.data, Dinheiro: v.dinheiro, Débito: v.debito, Crédito: v.credito, Pix: v.pix, Saídas: v.saidas, Total: v.total, Observações: v.obs || '' })))}
            className="flex items-center gap-2 text-sm border border-gray-300 rounded-lg px-3 py-2 hover:bg-gray-50 transition-colors">
            <Download className="w-4 h-4" /> CSV
          </button>
        </div>
      </div>

      {meta && (
        <div className="bg-white rounded-xl p-5 shadow-sm border">
          <div className="flex justify-between text-sm mb-2">
            <span className="font-medium text-gray-700">Meta mensal</span>
            <span className="text-gray-500">R$ {totalMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / R$ {meta.meta_vendas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${progressoPct}%` }} />
          </div>
          <p className="text-right text-xs text-gray-500 mt-1">{progressoPct.toFixed(1)}%</p>
        </div>
      )}

      <div className={`bg-white rounded-xl p-6 shadow-sm border ${editandoId ? 'ring-2 ring-amber-500' : ''}`}>
        <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          {editandoId ? <><Pencil className="w-4 h-4 text-amber-600" /> Editar venda</> : <><Plus className="w-4 h-4" /> Lançar venda</>}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Data', field: 'data', type: 'date' },
              { label: 'Dinheiro (R$)', field: 'dinheiro', type: 'number' },
              { label: 'Débito (R$)', field: 'debito', type: 'number' },
              { label: 'Crédito (R$)', field: 'credito', type: 'number' },
              { label: 'Pix (R$)', field: 'pix', type: 'number' },
              { label: 'Saídas de caixa (R$)', field: 'saidas', type: 'number' },
            ].map(({ label, field, type }) => (
              <div key={field}>
                <label className="text-xs font-medium text-gray-600">{label}</label>
                <input type={type} step={type === 'number' ? '0.01' : undefined}
                  value={(form as any)[field]} onChange={e => setForm({ ...form, [field]: e.target.value })}
                  placeholder={type === 'number' ? '0,00' : undefined}
                  className="w-full border rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-amber-500" />
              </div>
            ))}
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Observações</label>
            <textarea value={form.obs} onChange={e => setForm({ ...form, obs: e.target.value })}
              rows={2} placeholder="Opcional..."
              className="w-full border rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-amber-500" />
          </div>
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="text-lg font-bold text-gray-800">
              Total: <span className={calcTotal(form) >= 0 ? 'text-green-600' : 'text-red-600'}>
                R$ {calcTotal(form).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex gap-2">
              {editandoId && (
                <button type="button" onClick={() => { setEditandoId(null); setForm(formVazio) }}
                  className="border border-gray-300 text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-gray-50 flex items-center gap-1">
                  <X className="w-3 h-3" /> Cancelar
                </button>
              )}
              <button type="submit" disabled={loading}
                className="bg-amber-700 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-amber-800 transition-colors disabled:opacity-50 flex items-center gap-1">
                {editandoId ? <><Check className="w-3 h-3" /> Salvar edição</> : loading ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="font-semibold text-gray-800">Histórico</h2>
          <span className="text-sm font-medium text-gray-700">Total: <span className="text-green-600 font-bold">R$ {totalMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></span>
        </div>
        {vendas.length === 0 ? (
          <p className="text-center text-gray-400 py-8 text-sm">Nenhuma venda neste mês</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>{['Data', 'Dinheiro', 'Débito', 'Crédito', 'Pix', 'Saídas', 'Total', 'Obs', ''].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y">
              {vendas.map(v => (
                <tr key={v.id} className={`hover:bg-gray-50 ${editandoId === v.id ? 'bg-amber-50' : ''}`}>
                  <td className="px-4 py-3">{format(new Date(v.data + 'T12:00:00'), 'dd/MM', { locale: ptBR })}</td>
                  <td className="px-4 py-3">{v.dinheiro > 0 ? `R$ ${v.dinheiro.toFixed(2)}` : '-'}</td>
                  <td className="px-4 py-3">{v.debito > 0 ? `R$ ${v.debito.toFixed(2)}` : '-'}</td>
                  <td className="px-4 py-3">{v.credito > 0 ? `R$ ${v.credito.toFixed(2)}` : '-'}</td>
                  <td className="px-4 py-3">{v.pix > 0 ? `R$ ${v.pix.toFixed(2)}` : '-'}</td>
                  <td className="px-4 py-3 text-red-500">{v.saidas > 0 ? `-R$ ${v.saidas.toFixed(2)}` : '-'}</td>
                  <td className="px-4 py-3 font-semibold text-green-600">R$ {v.total.toFixed(2)}</td>
                  <td className="px-4 py-3 text-gray-400 max-w-[80px] truncate">{v.obs || '-'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => iniciarEdicao(v)} className="text-gray-400 hover:text-amber-600"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => deletarVenda(v.id)} className="text-gray-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
