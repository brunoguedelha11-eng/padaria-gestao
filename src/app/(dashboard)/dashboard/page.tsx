'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { TrendingUp, Package, Recycle, BarChart3, ChefHat, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

const hoje = format(new Date(), 'yyyy-MM-dd')
const mesAtual = format(new Date(), 'yyyy-MM')
const inicioMes = startOfMonth(new Date()).toISOString().split('T')[0]
const fimMes = endOfMonth(new Date()).toISOString().split('T')[0]

export default function DashboardPage() {
  const supabase = createClient()
  const [vendaHoje, setVendaHoje] = useState(0)
  const [vendasMes, setVendasMes] = useState(0)
  const [metaVendas, setMetaVendas] = useState(0)
  const [comprasMes, setComprasMes] = useState(0)
  const [producaoHoje, setProducaoHoje] = useState<{ produto: string; produzido: number; descartado: number }[]>([])
  const [custosMes, setCustosMes] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    const [
      { data: vendasHojeData },
      { data: vendasMesData },
      { data: metaData },
      { data: comprasData },
      { data: producaoData },
      { data: custosFixosData },
      { data: custosVarData },
    ] = await Promise.all([
      supabase.from('vendas').select('total').eq('data', hoje),
      supabase.from('vendas').select('total').gte('data', inicioMes).lte('data', fimMes),
      supabase.from('metas').select('meta_vendas').eq('mes_referencia', mesAtual).single(),
      supabase.from('itens_compra').select('total, compras(data)').gte('compras.data', inicioMes).lte('compras.data', fimMes),
      supabase.from('producao').select('produto, produzido, descartado').eq('data', hoje),
      supabase.from('custos_fixos').select('valor').eq('mes_referencia', mesAtual),
      supabase.from('custos_variaveis').select('valor').gte('data', inicioMes).lte('data', fimMes),
    ])

    setVendaHoje(vendasHojeData?.reduce((s, v) => s + v.total, 0) || 0)
    setVendasMes(vendasMesData?.reduce((s, v) => s + v.total, 0) || 0)
    setMetaVendas(metaData?.meta_vendas || 0)
    setComprasMes(comprasData?.reduce((s, c) => s + c.total, 0) || 0)
    setProducaoHoje(producaoData || [])
    const totalCF = custosFixosData?.reduce((s, c) => s + c.valor, 0) || 0
    const totalCV = custosVarData?.reduce((s, c) => s + c.valor, 0) || 0
    setCustosMes(totalCF + totalCV)
    setLoading(false)
  }

  const progressoMeta = metaVendas > 0 ? Math.min((vendasMes / metaVendas) * 100, 100) : 0
  const lucroEstimado = vendasMes - comprasMes - custosMes
  const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
  const diaNome = format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-gray-400 text-sm">Carregando...</div>
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <ChefHat className="w-6 h-6 text-amber-700" />
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Bom dia!</h1>
          <p className="text-gray-400 text-sm capitalize">{diaNome}</p>
        </div>
      </div>

      {/* Vendas de hoje */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border col-span-2 md:col-span-1">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Vendas de hoje</p>
          <p className="text-3xl font-bold text-green-600 mt-2">{fmt(vendaHoje)}</p>
          {vendaHoje === 0 && (
            <p className="text-xs text-gray-400 mt-1">Nenhuma venda lançada ainda</p>
          )}
          <Link href="/vendas" className="text-xs text-amber-700 hover:underline mt-2 inline-block">
            Lançar venda →
          </Link>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border col-span-2 md:col-span-1">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Resultado estimado do mês</p>
          <p className={`text-3xl font-bold mt-2 ${lucroEstimado >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {fmt(lucroEstimado)}
          </p>
          <p className="text-xs text-gray-400 mt-1">Vendas − Compras − Custos</p>
        </div>
      </div>

      {/* Meta do mês */}
      {metaVendas > 0 && (
        <div className="bg-white rounded-xl p-5 shadow-sm border">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-700" />
              <span className="font-medium text-gray-800 text-sm">Meta de vendas do mês</span>
            </div>
            <span className="text-sm text-gray-500">{fmt(vendasMes)} / {fmt(metaVendas)}</span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${progressoMeta}%` }} />
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-xs text-gray-400">{progressoMeta.toFixed(1)}% da meta</span>
            {progressoMeta < 80 && metaVendas > 0 && (
              <span className="text-xs text-orange-500 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Falta {fmt(metaVendas - vendasMes)}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Cards resumo do mês */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="flex items-center gap-2 mb-2">
            <Package className="w-4 h-4 text-orange-500" />
            <p className="text-xs text-gray-500 font-medium">Compras no mês</p>
          </div>
          <p className="text-xl font-bold text-orange-600">{fmt(comprasMes)}</p>
          <Link href="/compras" className="text-xs text-amber-700 hover:underline mt-1 inline-block">Ver compras →</Link>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-4 h-4 text-red-500" />
            <p className="text-xs text-gray-500 font-medium">Custos no mês</p>
          </div>
          <p className="text-xl font-bold text-red-600">{fmt(custosMes)}</p>
          <Link href="/balanco" className="text-xs text-amber-700 hover:underline mt-1 inline-block">Ver balanço →</Link>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <p className="text-xs text-gray-500 font-medium">Receita no mês</p>
          </div>
          <p className="text-xl font-bold text-green-600">{fmt(vendasMes)}</p>
          <Link href="/vendas" className="text-xs text-amber-700 hover:underline mt-1 inline-block">Ver vendas →</Link>
        </div>
      </div>

      {/* Produção de hoje */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Recycle className="w-4 h-4 text-amber-700" />
            <h2 className="font-semibold text-gray-800 text-sm">Produção de hoje</h2>
          </div>
          <Link href="/producao" className="text-xs text-amber-700 hover:underline">Ver tudo →</Link>
        </div>
        {producaoHoje.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-gray-400 text-sm">Nenhuma produção lançada hoje</p>
            <Link href="/producao" className="text-amber-700 text-sm hover:underline mt-1 inline-block">
              Lançar produção →
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Produto', 'Produzido', 'Descartado', 'Taxa'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {producaoHoje.map((p, i) => {
                const taxa = p.produzido > 0 ? (p.descartado / p.produzido) * 100 : 0
                return (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{p.produto}</td>
                    <td className="px-4 py-3">{p.produzido} un</td>
                    <td className="px-4 py-3">{p.descartado} un</td>
                    <td className={`px-4 py-3 font-semibold ${taxa > 10 ? 'text-red-600' : 'text-green-600'}`}>
                      {taxa.toFixed(1)}%
                    </td>
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
