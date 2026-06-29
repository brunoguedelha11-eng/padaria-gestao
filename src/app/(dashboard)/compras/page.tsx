'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Compra, ItemCompra } from '@/types'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Plus, Package, Trash2 } from 'lucide-react'

const apresentacoes = ['kg', 'g', 'L', 'mL', 'un', 'cx', 'pct'] as const
const hoje = format(new Date(), 'yyyy-MM-dd')

export default function ComprasPage() {
  const supabase = createClient()
  const [compras, setCompras] = useState<(Compra & { itens: ItemCompra[] })[]>([])
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ data: hoje, fornecedor: '' })
  const [itens, setItens] = useState([{ produto: '', quantidade: '', apresentacao: 'un', valor_unitario: '' }])

  useEffect(() => { fetchCompras() }, [])

  async function fetchCompras() {
    const inicio = startOfMonth(new Date()).toISOString().split('T')[0]
    const fim = endOfMonth(new Date()).toISOString().split('T')[0]
    const { data } = await supabase.from('compras').select('*, itens_compra(*)').gte('data', inicio).lte('data', fim).order('data', { ascending: false })
    if (data) setCompras(data as any)
  }

  function addItem() {
    setItens([...itens, { produto: '', quantidade: '', apresentacao: 'un', valor_unitario: '' }])
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

    const { data: compra } = await supabase.from('compras')
      .insert({ data: form.data, fornecedor: form.fornecedor, user_id: user?.id })
      .select().single()

    if (compra) {
      const itensData = itens.map(it => ({
        compra_id: compra.id,
        produto: it.produto,
        quantidade: parseFloat(it.quantidade),
        apresentacao: it.apresentacao,
        valor_unitario: parseFloat(it.valor_unitario),
        total: parseFloat(it.quantidade) * parseFloat(it.valor_unitario)
      }))
      await supabase.from('itens_compra').insert(itensData)
    }

    setForm({ data: hoje, fornecedor: '' })
    setItens([{ produto: '', quantidade: '', apresentacao: 'un', valor_unitario: '' }])
    fetchCompras()
    setLoading(false)
  }

  const totalMes = compras.reduce((s, c) => s + (c.itens?.reduce((si, i) => si + i.total, 0) || 0), 0)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Package className="w-6 h-6 text-amber-700" />
          <h1 className="text-2xl font-bold text-gray-800">Compras</h1>
        </div>
        <div className="bg-white border rounded-xl px-4 py-2 text-sm">
          <span className="text-gray-500">Total do mês:</span>
          <span className="font-bold text-gray-800 ml-2">R$ {totalMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
        </div>
      </div>

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
              <input value={form.fornecedor} onChange={e => setForm({ ...form, fornecedor: e.target.value })}
                placeholder="Nome do fornecedor" required
                className="w-full border rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-600">Itens</label>
            {itens.map((item, i) => {
              const total = (parseFloat(item.quantidade || '0') * parseFloat(item.valor_unitario || '0'))
              return (
                <div key={i} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-4">
                    <input value={item.produto} onChange={e => updateItem(i, 'produto', e.target.value)}
                      placeholder="Produto" required
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
                  </div>
                  <div className="col-span-2">
                    <input type="number" value={item.quantidade} onChange={e => updateItem(i, 'quantidade', e.target.value)}
                      placeholder="Qtd" required
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
                  </div>
                  <div className="col-span-2">
                    <select value={item.apresentacao} onChange={e => updateItem(i, 'apresentacao', e.target.value)}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
                      {apresentacoes.map(a => <option key={a}>{a}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <input type="number" step="0.01" value={item.valor_unitario} onChange={e => updateItem(i, 'valor_unitario', e.target.value)}
                      placeholder="Valor" required
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
                  </div>
                  <div className="col-span-1 text-xs text-gray-500 pb-2">R$ {total.toFixed(2)}</div>
                  <div className="col-span-1">
                    {itens.length > 1 && (
                      <button type="button" onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
            <button type="button" onClick={addItem} className="text-amber-700 text-sm hover:underline flex items-center gap-1">
              <Plus className="w-3 h-3" /> Adicionar item
            </button>
          </div>

          <div className="flex justify-end pt-2 border-t">
            <button type="submit" disabled={loading}
              className="bg-amber-700 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-amber-800 transition-colors disabled:opacity-50">
              {loading ? 'Salvando...' : 'Salvar compra'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="p-4 border-b"><h2 className="font-semibold text-gray-800">Histórico do mês</h2></div>
        {compras.length === 0 ? (
          <p className="text-center text-gray-400 py-8 text-sm">Nenhuma compra registrada este mês</p>
        ) : (
          <div className="divide-y">
            {compras.map(c => {
              const totalCompra = c.itens?.reduce((s, i) => s + i.total, 0) || 0
              return (
                <div key={c.id} className="p-4">
                  <div className="flex justify-between items-center mb-2">
                    <div>
                      <span className="font-medium text-gray-800">{c.fornecedor}</span>
                      <span className="text-gray-400 text-sm ml-3">
                        {format(new Date(c.data + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR })}
                      </span>
                    </div>
                    <span className="font-bold text-gray-800">R$ {totalCompra.toFixed(2)}</span>
                  </div>
                  <div className="text-xs text-gray-500 space-y-1">
                    {c.itens?.map(it => (
                      <div key={it.id} className="flex justify-between">
                        <span>{it.produto} — {it.quantidade} {it.apresentacao}</span>
                        <span>R$ {it.total.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
