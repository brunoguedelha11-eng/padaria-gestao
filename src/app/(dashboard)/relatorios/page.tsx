'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TrendingUp } from 'lucide-react'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import MonthNav from '@/components/MonthNav'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  Title, Tooltip, Legend, ArcElement, PointElement, LineElement
} from 'chart.js'
import { Bar, Pie } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement)

const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export default function RelatoriosPage() {
  const supabase = createClient()
  const [mes, setMes] = useState(new Date())
  const [vendas, setVendas] = useState<any[]>([])
  const [compras, setCompras] = useState<any[]>([])
  const [producao, setProducao] = useState<any[]>([])

  useEffect(() => { fetchRelatorios() }, [mes])

  async function fetchRelatorios() {
    const inicio = startOfMonth(mes).toISOString().split('T')[0]
    const fim = endOfMonth(mes).toISOString().split('T')[0]

    const [{ data: v }, { data: c }, { data: p }] = await Promise.all([
      supabase.from('vendas').select('*').gte('data', inicio).lte('data', fim).order('data'),
      supabase.from('compras').select('*, itens_compra(total)').gte('data', inicio).lte('data', fim).order('data'),
      supabase.from('producao').select('*').gte('data', inicio).lte('data', fim).order('data'),
    ])
    setVendas(v || [])
    setCompras(c || [])
    setProducao(p || [])
  }

  // Vendas por dia da semana
  const porDia = Array(7).fill(0)
  vendas.forEach(v => { porDia[new Date(v.data + 'T12:00:00').getDay()] += v.total })

  // Vendas por forma de pagamento
  const pgto = { dinheiro: 0, debito: 0, credito: 0, pix: 0 }
  vendas.forEach(v => { pgto.dinheiro += v.dinheiro; pgto.debito += v.debito; pgto.credito += v.credito; pgto.pix += v.pix })

  // Vendas por semana do mês (agrupado por data)
  const porData: Record<string, number> = {}
  vendas.forEach(v => { porData[v.data] = (porData[v.data] || 0) + v.total })
  const datas = Object.keys(porData).sort()

  // Totais
  const totalVendas = vendas.reduce((s, v) => s + v.total, 0)
  const totalCompras = compras.reduce((s, c) => s + (c.itens_compra || []).reduce((si: number, i: any) => si + Number(i.total), 0), 0)
  const ticketMedio = vendas.length > 0 ? totalVendas / vendas.length : 0
  const melhorDia = porDia.indexOf(Math.max(...porDia))

  const totalProd = producao.reduce((s, p) => s + p.produzido, 0)
  const totalDesc = producao.reduce((s, p) => s + p.descartado, 0)
  const taxaDesc = totalProd > 0 ? (totalDesc / totalProd) * 100 : 0

  const chartOptions = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: true, ticks: { callback: (v: any) => `R$ ${v.toLocaleString('pt-BR')}` } } }
  }

  const mesLabel = format(mes, "MMMM 'de' yyyy", { locale: ptBR })

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <TrendingUp className="w-6 h-6 text-amber-700" />
          <h1 className="text-2xl font-bold text-gray-800 capitalize">{mesLabel}</h1>
        </div>
        <MonthNav mes={mes} onChange={setMes} />
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border text-center">
          <p className="text-xs text-gray-500">Total vendas</p>
          <p className="text-lg font-bold text-green-600">R$ {totalVendas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border text-center">
          <p className="text-xs text-gray-500">Total compras</p>
          <p className="text-lg font-bold text-orange-600">R$ {totalCompras.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border text-center">
          <p className="text-xs text-gray-500">Ticket médio/dia</p>
          <p className="text-lg font-bold text-gray-800">R$ {ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border text-center">
          <p className="text-xs text-gray-500">Melhor dia</p>
          <p className="text-lg font-bold text-gray-800">{vendas.length > 0 ? diasSemana[melhorDia] : '—'}</p>
        </div>
      </div>

      {/* Vendas diárias do mês */}
      <div className="bg-white rounded-xl p-5 shadow-sm border">
        <h2 className="font-semibold text-gray-800 mb-4 capitalize">Vendas diárias — {mesLabel}</h2>
        {datas.length > 0 ? (
          <Bar
            data={{
              labels: datas.map(d => format(new Date(d + 'T12:00:00'), 'dd/MM')),
              datasets: [{ label: 'Vendas', data: datas.map(d => porData[d]), backgroundColor: '#b45309', borderRadius: 6 }]
            }}
            options={chartOptions}
          />
        ) : <p className="text-gray-400 text-sm text-center py-8">Nenhuma venda neste mês.</p>}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Vendas por forma de pagamento */}
        <div className="bg-white rounded-xl p-5 shadow-sm border">
          <h2 className="font-semibold text-gray-800 mb-4">Formas de pagamento</h2>
          {totalVendas > 0 ? (
            <Pie
              data={{
                labels: ['Dinheiro', 'Débito', 'Crédito', 'Pix'],
                datasets: [{
                  data: [pgto.dinheiro, pgto.debito, pgto.credito, pgto.pix],
                  backgroundColor: ['#f59e0b', '#3b82f6', '#8b5cf6', '#10b981']
                }]
              }}
            />
          ) : <p className="text-gray-400 text-sm text-center py-8">Sem dados neste mês.</p>}
        </div>

        {/* Vendas por dia da semana */}
        <div className="bg-white rounded-xl p-5 shadow-sm border">
          <h2 className="font-semibold text-gray-800 mb-4">Vendas por dia da semana</h2>
          <Bar
            data={{
              labels: diasSemana,
              datasets: [{ label: 'Total', data: porDia, backgroundColor: '#f59e0b', borderRadius: 6 }]
            }}
            options={chartOptions}
          />
        </div>
      </div>

      {/* Produção e desperdício */}
      <div className="bg-white rounded-xl p-5 shadow-sm border">
        <h2 className="font-semibold text-gray-800 mb-3">Produção e desperdício</h2>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xs text-gray-500">Total produzido</p>
            <p className="text-xl font-bold text-gray-800">{totalProd}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Total descartado</p>
            <p className="text-xl font-bold text-red-600">{totalDesc}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Taxa de desperdício</p>
            <p className={`text-xl font-bold ${taxaDesc > 10 ? 'text-red-600' : 'text-green-600'}`}>{taxaDesc.toFixed(1)}%</p>
          </div>
        </div>
      </div>
    </div>
  )
}
