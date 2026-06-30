'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { EstoqueMinimo, Meta } from '@/types'
import { Bell, AlertTriangle, CheckCircle, Plus, Trash2, CreditCard, CheckCircle2 } from 'lucide-react'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const mesAtual = format(new Date(), 'yyyy-MM')
const hoje = format(new Date(), 'yyyy-MM-dd')

interface ComprasPendente {
  id: string; data: string; fornecedor: string; forma_pagamento: string
  data_vencimento: string; pago: boolean
  itens_compra: { total: number }[]
}

export default function AlertasPage() {
  const supabase = createClient()
  const [estoques, setEstoques] = useState<EstoqueMinimo[]>([])
  const [meta, setMeta] = useState<Meta | null>(null)
  const [totalVendas, setTotalVendas] = useState(0)
  const [taxaDesperdicio, setTaxaDesperdicio] = useState(0)
  const [comprasPendentes, setComprasPendentes] = useState<ComprasPendente[]>([])
  const [formEstoque, setFormEstoque] = useState({ produto: '', quantidade_minima: '', quantidade_atual: '' })

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    const inicio = startOfMonth(new Date()).toISOString().split('T')[0]
    const fim = endOfMonth(new Date()).toISOString().split('T')[0]

    const [{ data: e }, { data: m }, { data: v }, { data: p }, { data: cp }] = await Promise.all([
      supabase.from('estoque_minimo').select('*'),
      supabase.from('metas').select('*').eq('mes_referencia', mesAtual).single(),
      supabase.from('vendas').select('total').gte('data', inicio).lte('data', fim),
      supabase.from('producao').select('produzido, descartado').gte('data', inicio).lte('data', fim),
      supabase.from('compras').select('*, itens_compra(total)').eq('pago', false).order('data_vencimento'),
    ])
    if (e) setEstoques(e)
    if (m) setMeta(m)
    if (v) setTotalVendas(v.reduce((s: number, vv: any) => s + vv.total, 0))
    if (p) {
      const prod = p.reduce((s: number, pp: any) => s + pp.produzido, 0)
      const desc = p.reduce((s: number, pp: any) => s + pp.descartado, 0)
      setTaxaDesperdicio(prod > 0 ? (desc / prod) * 100 : 0)
    }
    if (cp) setComprasPendentes(cp as ComprasPendente[])
  }

  async function marcarPago(id: string) {
    await supabase.from('compras').update({ pago: true }).eq('id', id)
    fetchData()
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
  const alertaDesperdicio = meta && taxaDesperdicio > meta.meta_desperdicio_pct
  const comprasVencidas = comprasPendentes.filter(c => c.data_vencimento && c.data_vencimento < hoje)
  const comprasAVencer = comprasPendentes.filter(c => c.data_vencimento && c.data_vencimento >= hoje)
  const totalAlertas = alertasEstoque.length + (alertaVendas ? 1 : 0) + (alertaDesperdicio ? 1 : 0) + comprasVencidas.length

  const fmtData = (d: string) => format(new Date(d + 'T12:00:00'), "dd 'de' MMMM", { locale: ptBR })
  const fmtVal = (c: ComprasPendente) => `R$ ${(c.itens_compra?.reduce((s, i) => s + Number(i.total), 0) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Bell className="w-6 h-6 text-amber-700" />
        <h1 className="text-2xl font-bold text-gray-800">Alertas</h1>
        {totalAlertas > 0 && <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{totalAlertas}</span>}
      </div>

      {/* Pagamentos pendentes vencidos */}
      {comprasVencidas.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-red-700 flex items-center gap-2"><CreditCard className="w-4 h-4" /> Pagamentos vencidos</h2>
          {comprasVencidas.map(c => (
            <div key={c.id} className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <div>
                  <p className="font-medium text-red-800">{c.fornecedor} — {c.forma_pagamento}</p>
                  <p className="text-red-600 text-sm">Venceu em {fmtData(c.data_vencimento)} · {fmtVal(c)}</p>
                </div>
              </div>
              <button onClick={() => marcarPago(c.id)} className="flex items-center gap-1.5 bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-green-700 transition-colors">
                <CheckCircle2 className="w-3.5 h-3.5" /> Marcar pago
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Pagamentos a vencer */}
      {comprasAVencer.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-orange-700 flex items-center gap-2"><CreditCard className="w-4 h-4" /> Pagamentos pendentes</h2>
          {comprasAVencer.map(c => (
            <div key={c.id} className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-orange-500 flex-shrink-0" />
                <div>
                  <p className="font-medium text-orange-800">{c.fornecedor} — {c.forma_pagamento}</p>
                  <p className="text-orange-600 text-sm">Vence em {fmtData(c.data_vencimento)} · {fmtVal(c)}</p>
                </div>
              </div>
              <button onClick={() => marcarPago(c.id)} className="flex items-center gap-1.5 bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-green-700 transition-colors">
                <CheckCircle2 className="w-3.5 h-3.5" /> Marcar pago
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Outros alertas */}
      <div className="space-y-3">
        {totalAlertas === 0 && comprasPendentes.length === 0 && (
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
              <p className="text-red-600 text-sm">R$ {totalVendas.toFixed(2)} de R$ {meta?.meta_vendas.toFixed(2)} — {((totalVendas / (meta?.meta_vendas || 1)) * 100).toFixed(0)}% da meta</p>
            </div>
          </div>
        )}

        {alertaDesperdicio && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            <div>
              <p className="font-medium text-orange-800">Desperdício acima da meta</p>
              <p className="text-orange-600 text-sm">Taxa atual: {taxaDesperdicio.toFixed(1)}% — meta: {meta?.meta_desperdicio_pct}%</p>
            </div>
          </div>
        )}

        {alertasEstoque.map(e => (
          <div key={e.id} className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            <div>
              <p className="font-medium text-yellow-800">Estoque baixo: {e.produto}</p>
              <p className="text-yellow-600 text-sm">Atual: {e.quantidade_atual} — mínimo: {e.quantidade_minima}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Controle de estoque */}
      <div className="bg-white rounded-xl p-5 shadow-sm border">
        <h2 className="font-semibold text-gray-800 mb-4">Controle de Estoque Mínimo</h2>
        <form onSubmit={addEstoque} className="grid grid-cols-3 gap-3 mb-4">
          <input value={formEstoque.produto} onChange={e => setFormEstoque({ ...formEstoque, produto: e.target.value })}
            placeholder="Produto" required className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
          <input type="number" value={formEstoque.quantidade_atual} onChange={e => setFormEstoque({ ...formEstoque, quantidade_atual: e.target.value })}
            placeholder="Qtd atual" required className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
          <input type="number" value={formEstoque.quantidade_minima} onChange={e => setFormEstoque({ ...formEstoque, quantidade_minima: e.target.value })}
            placeholder="Qtd mínima" required className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
          <button type="submit" className="col-span-3 bg-amber-700 text-white py-2 rounded-lg text-sm hover:bg-amber-800"><Plus className="w-3 h-3 inline mr-1" />Adicionar produto</button>
        </form>
        <div className="space-y-2">
          {estoques.map(e => (
            <div key={e.id} className={`flex justify-between items-center text-sm p-3 rounded-lg ${e.quantidade_atual <= e.quantidade_minima ? 'bg-yellow-50' : 'bg-gray-50'}`}>
              <span className="font-medium">{e.produto}</span>
              <div className="flex items-center gap-4">
                <span className="text-gray-500">Atual: <span className={`font-bold ${e.quantidade_atual <= e.quantidade_minima ? 'text-red-600' : 'text-green-600'}`}>{e.quantidade_atual}</span></span>
                <span className="text-gray-400">Mín: {e.quantidade_minima}</span>
                <button onClick={() => deleteEstoque(e.id)} className="text-gray-300 hover:text-red-400"><Trash2 className="w-3 h-3" /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
