'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TrendingUp } from 'lucide-react'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  Title, Tooltip, Legend, ArcElement, PointElement, LineElement
} from 'chart.js'
import { Bar, Pie } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement)

const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const diasSemana = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

export default function RelatoriosPage() {
  const supabase = createClient()
  const [vendasMensais, setVendasMensais] = useState<number[]>(Array(12).fill(0))
  const [vendasPorPgto, setVendasPorPgto] = useState({ dinheiro: 0, debito: 0, credito: 0, pix: 0 })
  const [vendasPorDia, setVendasPorDia] = useState<number[]>(Array(7).fill(0))
  const [ticketMedio, setTicketMedio] = useState(0)
  const anoAtual = new Date().getFullYear()

  useEffect(() => { fetchRelatorios() }, [])

  async function fetchRelatorios() {
    const { data: vendas } = await supabase
      .from('vendas').select('*')
      .gte('data', `${anoAtual}-01-01`)
      .lte('data', `${anoAtual}-12-31`)

    if (!vendas) return

    const mensais = Array(12).fill(0)
    const porDia = Array(7).fill(0)
    let din = 0, deb = 0, cred = 0, pix = 0

    vendas.forEach(v => {
      const mes = new Date(v.data + 'T12:00:00').getMonth()
      const dia = new Date(v.data + 'T12:00:00').getDay()
      mensais[mes] += v.total
      porDia[dia] += v.total
      din += v.dinheiro
      deb += v.debito
      cred += v.credito
      pix += v.pix
    })

    setVendasMensais(mensais)
    setVendasPorPgto({ dinheiro: din, debito: deb, credito: cred, pix })
    setVendasPorDia(porDia)
    setTicketMedio(vendas.length > 0 ? vendas.reduce((s, v) => s + v.total, 0) / vendas.length : 0)
  }

  const chartOptions = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: true, ticks: { callback: (v: any) => `R$ ${v.toLocaleString('pt-BR')}` } } }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <TrendingUp className="w-6 h-6 text-amber-700" />
        <h1 className="text-2xl font-bold text-gray-800">Relatórios</h1>
        <span className="text-gray-400 text-sm">{anoAtual}</span>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border text-center">
          <p className="text-xs text-gray-500">Total do ano</p>
          <p className="text-xl font-bold text-gray-800">R$ {vendasMensais.reduce((s, v) => s + v, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border text-center">
          <p className="text-xs text-gray-500">Ticket médio/dia</p>
          <p className="text-xl font-bold text-gray-800">R$ {ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border text-center">
          <p className="text-xs text-gray-500">Melhor dia</p>
          <p className="text-xl font-bold text-gray-800">
            {diasSemana[vendasPorDia.indexOf(Math.max(...vendasPorDia))]}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl p-5 shadow-sm border">
        <h2 className="font-semibold text-gray-800 mb-4">Vendas mensais — {anoAtual}</h2>
        <Bar
          data={{
            labels: meses,
            datasets: [{ label: 'Vendas', data: vendasMensais, backgroundColor: '#b45309', borderRadius: 6 }]
          }}
          options={chartOptions}
        />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-5 shadow-sm border">
          <h2 className="font-semibold text-gray-800 mb-4">Vendas por forma de pagamento</h2>
          <Pie
            data={{
              labels: ['Dinheiro', 'Débito', 'Crédito', 'Pix'],
              datasets: [{
                data: [vendasPorPgto.dinheiro, vendasPorPgto.debito, vendasPorPgto.credito, vendasPorPgto.pix],
                backgroundColor: ['#f59e0b', '#3b82f6', '#8b5cf6', '#10b981']
              }]
            }}
          />
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border">
          <h2 className="font-semibold text-gray-800 mb-4">Vendas por dia da semana</h2>
          <Bar
            data={{
              labels: diasSemana,
              datasets: [{ label: 'Total', data: vendasPorDia, backgroundColor: '#f59e0b', borderRadius: 6 }]
            }}
            options={{ ...chartOptions, plugins: { ...chartOptions.plugins, legend: { display: false } } }}
          />
        </div>
      </div>
    </div>
  )
}
