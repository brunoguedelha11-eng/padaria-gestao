'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CustoFixo, GastoPessoal } from '@/types'
import { format } from 'date-fns'
import { BarChart3, Plus, Trash2, Download } from 'lucide-react'
import { exportToCsv } from '@/lib/exportCsv'

const categorias = ['Salários', 'Vales', 'Aluguel', 'Energia', 'Internet', 'Impostos', 'Taxas de cartão', 'Outros']
const mesAtual = format(new Date(), 'yyyy-MM')
const hoje = format(new Date(), 'yyyy-MM-dd')

export default function BalancoPage() {
  const supabase = createClient()
  const [custosFixos, setCustosFixos] = useState<CustoFixo[]>([])
  const [gastosPessoais, setGastosPessoais] = useState<GastoPessoal[]>([])
  const [totalVendasMes, setTotalVendasMes] = useState(0)
  const [totalComprasMes, setTotalComprasMes] = useState(0)
  const [formFixo, setFormFixo] = useState({ categoria: categorias[0], valor: '', descricao: '' })
  const [formPessoal, setFormPessoal] = useState({ data: hoje, descricao: '', valor: '' })

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    const inicio = `${mesAtual}-01`
    const fim = `${mesAtual}-31`

    const [{ data: cf }, { data: gp }, { data: vendas }, { data: compras }] = await Promise.all([
      supabase.from('custos_fixos').select('*').eq('mes_referencia', mesAtual),
      supabase.from('gastos_pessoais').select('*').gte('data', inicio).lte('data', fim),
      supabase.from('vendas').select('total').gte('data', inicio).lte('data', fim),
      supabase.from('itens_compra').select('total, compras(data)').gte('compras.data', inicio).lte('compras.data', fim),
    ])
    if (cf) setCustosFixos(cf)
    if (gp) setGastosPessoais(gp)
    if (vendas) setTotalVendasMes(vendas.reduce((s, v) => s + v.total, 0))
    if (compras) setTotalComprasMes(compras.reduce((s, c) => s + c.total, 0))
  }

  async function addCustoFixo(e: React.FormEvent) {
    e.preventDefault()
    await supabase.from('custos_fixos').insert({
      mes_referencia: mesAtual, categoria: formFixo.categoria,
      valor: parseFloat(formFixo.valor), descricao: formFixo.descricao
    })
    setFormFixo({ categoria: categorias[0], valor: '', descricao: '' })
    fetchData()
  }

  async function addGastoPessoal(e: React.FormEvent) {
    e.preventDefault()
    const { error } = await supabase.from('gastos_pessoais').insert({
      data: formPessoal.data, descricao: formPessoal.descricao, valor: parseFloat(formPessoal.valor)
    })
    if (error) {
      alert('Erro ao salvar: ' + error.message)
      return
    }
    setFormPessoal({ data: hoje, descricao: '', valor: '' })
    fetchData()
  }

  async function deleteCustoFixo(id: string) {
    await supabase.from('custos_fixos').delete().eq('id', id)
    fetchData()
  }

  async function deleteGastoPessoal(id: string) {
    await supabase.from('gastos_pessoais').delete().eq('id', id)
    fetchData()
  }

  const totalCustosFixos = custosFixos.reduce((s, c) => s + c.valor, 0)
  const totalGastosPessoais = gastosPessoais.reduce((s, g) => s + g.valor, 0)
  const resultado = totalVendasMes - totalComprasMes - totalCustosFixos - totalGastosPessoais

  const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
       <div className="flex items-center gap-3">
        <BarChart3 className="w-6 h-6 text-amber-700" />
        <h1 className="text-2xl font-bold text-gray-800">Balanço Financeiro</h1>
        <span className="text-gray-400 text-sm ml-2">{['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'][new Date().getMonth()]} {new Date().getFullYear()}</span>
       </div>
        <button
          onClick={() => exportToCsv('balanco', [
            ...custosFixos.map(c => ({ Tipo: 'Custo Fixo', Categoria: c.categoria, Descrição: c.descricao || '', Valor: c.valor })),
            ...gastosPessoais.map(g => ({ Tipo: 'Gasto Pessoal', Categoria: g.descricao, Descrição: g.data, Valor: g.valor })),
          ])}
          className="flex items-center gap-2 text-sm border border-gray-300 rounded-lg px-3 py-2 hover:bg-gray-50 transition-colors"
        >
          <Download className="w-4 h-4" /> Exportar CSV
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Receita (vendas)', value: totalVendasMes, color: 'text-green-600' },
          { label: 'Compras', value: totalComprasMes, color: 'text-orange-600' },
          { label: 'Custos fixos', value: totalCustosFixos, color: 'text-red-600' },
          { label: 'Gastos pessoais', value: totalGastosPessoais, color: 'text-purple-600' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl p-4 shadow-sm border">
            <p className="text-xs text-gray-500">{label}</p>
            <p className={`text-lg font-bold mt-1 ${color}`}>{fmt(value)}</p>
          </div>
        ))}
      </div>

      <div className={`rounded-xl p-5 text-center ${resultado >= 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
        <p className="text-sm text-gray-600">Resultado líquido do mês</p>
        <p className={`text-3xl font-bold mt-1 ${resultado >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmt(resultado)}</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-5 shadow-sm border">
          <h2 className="font-semibold text-gray-800 mb-3">Custos Fixos</h2>
          <form onSubmit={addCustoFixo} className="space-y-2 mb-4">
            <select value={formFixo.categoria} onChange={e => setFormFixo({ ...formFixo, categoria: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
              {categorias.map(c => <option key={c}>{c}</option>)}
            </select>
            <input type="number" step="0.01" value={formFixo.valor} onChange={e => setFormFixo({ ...formFixo, valor: e.target.value })}
              placeholder="Valor (R$)" required
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
            <input value={formFixo.descricao} onChange={e => setFormFixo({ ...formFixo, descricao: e.target.value })}
              placeholder="Descrição (opcional)"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
            <button type="submit" className="w-full bg-amber-700 text-white py-2 rounded-lg text-sm hover:bg-amber-800">
              <Plus className="w-3 h-3 inline mr-1" />Adicionar
            </button>
          </form>
          <div className="space-y-2">
            {custosFixos.map(c => (
              <div key={c.id} className="flex justify-between items-center text-sm">
                <div>
                  <span className="font-medium">{c.categoria}</span>
                  {c.descricao && <span className="text-gray-400 ml-1">— {c.descricao}</span>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-red-600 font-medium">{fmt(c.valor)}</span>
                  <button onClick={() => deleteCustoFixo(c.id)} className="text-gray-300 hover:text-red-400">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border">
          <h2 className="font-semibold text-gray-800 mb-3">Gastos Pessoais</h2>
          <form onSubmit={addGastoPessoal} className="space-y-2 mb-4">
            <input type="date" value={formPessoal.data} onChange={e => setFormPessoal({ ...formPessoal, data: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
            <input value={formPessoal.descricao} onChange={e => setFormPessoal({ ...formPessoal, descricao: e.target.value })}
              placeholder="Descrição" required
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
            <input type="number" step="0.01" value={formPessoal.valor} onChange={e => setFormPessoal({ ...formPessoal, valor: e.target.value })}
              placeholder="Valor (R$)" required
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
            <button type="submit" className="w-full bg-amber-700 text-white py-2 rounded-lg text-sm hover:bg-amber-800">
              <Plus className="w-3 h-3 inline mr-1" />Adicionar
            </button>
          </form>
          <div className="space-y-2">
            {gastosPessoais.map(g => (
              <div key={g.id} className="flex justify-between items-center text-sm">
                <span>{g.descricao}</span>
                <div className="flex items-center gap-2">
                  <span className="text-purple-600 font-medium">{fmt(g.valor)}</span>
                  <button onClick={() => deleteGastoPessoal(g.id)} className="text-gray-300 hover:text-red-400">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
