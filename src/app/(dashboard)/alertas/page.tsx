'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { EstoqueMinimo, Meta } from '@/types'
import { Bell, AlertTriangle, CheckCircle, Plus, Trash2 } from 'lucide-react'
import { format, startOfMonth, endOfMonth } from 'date-fns'

const mesAtual = format(new Date(), 'yyyy-MM')

export default function AlertasPage() {
  const supabase = createClient()
  const [estoques, setEstoques] = useState<EstoqueMinimo[]>([])
  const [meta, setMeta] = useState<Meta | null>(null)
  const [totalVendas, setTotalVendas] = useState(0)
  const [totalCompras] = useState(0)
  const [taxaDesperdicio, setTaxaDesperdicio] = useState(0)
  const [formEstoque, setFormEstoque] = useState({ produto: '', quantidade_minima: '', quantidade_atual: '' })

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    const inicio = startOfMonth(new Date()).toISOString().split('T')[0]
    const fim = endOfMonth(new Date()).toISOString().split('T')[0]

    const [{ data: e }, { data: m }, { data: v }, { data: p }] = await Promise.all([
      supabase.from('estoque_minimo').select('*'),
      supabase.from('metas').select('*').eq('mes_referencia', mesAtual).single(),
      supabase.from('vendas').select('total').gte('data', inicio).lte('data', fim),
      supabase.from('producao').select('produzido, descartado').gte('data', inicio).lte('data', fim),
    ])
    if (e) setEstoques(e)
    if (m) setMeta(m)
    if (v) setTotalVendas(v.reduce((s: number, vv: any) => s + vv.total, 0))
    if (p) {
      const prod = p.reduce((s: number, pp: any) => s + pp.produzido, 0)
      const desc = p.reduce((s: number, pp: any) => s + pp.descartado, 0)
      setTaxaDesperdicio(prod > 0 ? (desc / prod) * 100 : 0)
    }
  }

  async function addEstoque(e: React.FormEvent) {
    e.preventDefault()
    await supabase.from('estoque_minimo').insert({
      produto: formEstoque.produto,
      quantidade_minima: parseFloat(formEstoque.quantidade_minima),
      quantidade_atual: parseFloat(formEstoque.quantidade_atual)
    })
    setFormEstoque({ produto: '', quantidade_minima: '', quantidade_atual: '' })
    fetchData()
  }

  async function deleteEstoque(id: string) {
    await supabase.from('estoque_minimo').delete().eq('id', id)
    fetchData()
  }

  const alertasEstoque = estoques.filter(e => e.quantidade_atual <= e.quantidade_minima)
  const alertaVendas = meta && totalVendas < meta.meta_vendas * 0.7
  const alertaCompras = meta && totalCompras > meta.meta_compras
  const alertaDesperdicio = meta && taxaDesperdicio > meta.meta_desperdicio_pct

  const totalAlertas = alertasEstoque.length + (alertaVendas ? 1 : 0) + (alertaCompras ? 1 : 0) + (alertaDesperdicio ? 1 : 0)

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Bell className="w-6 h-6 text-amber-700" />
        <h1 className="text-2xl font-bold text-gray-800">Alertas</h1>
        {totalAlertas > 0 && (
          <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{totalAlertas}</span>
        )}
      </div>

      <div className="space-y-3">
        {totalAlertas === 0 && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <p className="text-green-700 font-medium">Tudo certo! Nenhum alerta ativo no momento.</p>
          </div>
        )}

        {alertaVendas && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <div>
              <p className="font-medium text-red-800">Vendas abaixo do esperado</p>
              <p className="text-red-600 text-sm">
                R$ {totalVendas.toFixed(2)} de R$ {meta?.meta_vendas.toFixed(2)} — apenas {((totalVendas / (meta?.meta_vendas || 1)) * 100).toFixed(0)}% da meta
              </p>
            </div>
          </div>
        )}

        {alertaDesperdicio && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            <div>
              <p className="font-medium text-orange-800">Desperdício acima da meta</p>
              <p className="text-orange-600 text-sm">
                Taxa atual: {taxaDesperdicio.toFixed(1)}% — meta: {meta?.meta_desperdicio_pct}%
              </p>
            </div>
          </div>
        )}

        {alertasEstoque.map(e => (
          <div key={e.id} className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            <div>
              <p className="font-medium text-yellow-800">Estoque baixo: {e.produto}</p>
              <p className="text-yellow-600 text-sm">
                Atual: {e.quantidade_atual} — mínimo: {e.quantidade_minima}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl p-5 shadow-sm border">
        <h2 className="font-semibold text-gray-800 mb-4">Controle de Estoque Mínimo</h2>
        <form onSubmit={addEstoque} className="grid grid-cols-3 gap-3 mb-4">
          <input value={formEstoque.produto} onChange={e => setFormEstoque({ ...formEstoque, produto: e.target.value })}
            placeholder="Produto" required
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
          <input type="number" value={formEstoque.quantidade_atual} onChange={e => setFormEstoque({ ...formEstoque, quantidade_atual: e.target.value })}
            placeholder="Qtd atual" required
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
          <input type="number" value={formEstoque.quantidade_minima} onChange={e => setFormEstoque({ ...formEstoque, quantidade_minima: e.target.value })}
            placeholder="Qtd mínima" required
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
          <button type="submit" className="col-span-3 bg-amber-700 text-white py-2 rounded-lg text-sm hover:bg-amber-800">
            <Plus className="w-3 h-3 inline mr-1" />Adicionar produto
          </button>
        </form>
        <div className="space-y-2">
          {estoques.map(e => (
            <div key={e.id} className={`flex justify-between items-center text-sm p-3 rounded-lg ${e.quantidade_atual <= e.quantidade_minima ? 'bg-yellow-50' : 'bg-gray-50'}`}>
              <span className="font-medium">{e.produto}</span>
              <div className="flex items-center gap-4">
                <span className="text-gray-500">Atual: <span className={`font-bold ${e.quantidade_atual <= e.quantidade_minima ? 'text-red-600' : 'text-green-600'}`}>{e.quantidade_atual}</span></span>
                <span className="text-gray-400">Mín: {e.quantidade_minima}</span>
                <button onClick={() => deleteEstoque(e.id)} className="text-gray-300 hover:text-red-400">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
