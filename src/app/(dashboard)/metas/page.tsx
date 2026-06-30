'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format, addMonths, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Target, Save, ChevronLeft, ChevronRight } from 'lucide-react'

export default function MetasPage() {
  const supabase = createClient()
  const [mes, setMes] = useState(new Date())
  const [form, setForm] = useState({ meta_vendas: '', meta_compras: '', meta_desperdicio_pct: '' })
  const [loading, setLoading] = useState(false)
  const [salvo, setSalvo] = useState(false)
  const [existeId, setExisteId] = useState<string | null>(null)

  const mesRef = format(mes, 'yyyy-MM')
  const isCurrentMonth = mesRef === format(new Date(), 'yyyy-MM')

  useEffect(() => { fetchMeta() }, [mes])

  async function fetchMeta() {
    const { data } = await supabase.from('metas').select('*').eq('mes_referencia', mesRef).single()
    if (data) {
      setForm({ meta_vendas: String(data.meta_vendas), meta_compras: String(data.meta_compras), meta_desperdicio_pct: String(data.meta_desperdicio_pct) })
      setExisteId(data.id)
    } else {
      setForm({ meta_vendas: '', meta_compras: '', meta_desperdicio_pct: '' })
      setExisteId(null)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const payload = {
      mes_referencia: mesRef,
      meta_vendas: parseFloat(form.meta_vendas),
      meta_compras: parseFloat(form.meta_compras),
      meta_desperdicio_pct: parseFloat(form.meta_desperdicio_pct),
    }
    if (existeId) {
      await supabase.from('metas').update(payload).eq('id', existeId)
    } else {
      const { data } = await supabase.from('metas').insert(payload).select().single()
      if (data) setExisteId(data.id)
    }
    setSalvo(true)
    setTimeout(() => setSalvo(false), 2500)
    setLoading(false)
  }

  async function copiarMesAnterior() {
    const mesAnterior = format(subMonths(mes, 1), 'yyyy-MM')
    const { data } = await supabase.from('metas').select('*').eq('mes_referencia', mesAnterior).single()
    if (data) {
      setForm({ meta_vendas: String(data.meta_vendas), meta_compras: String(data.meta_compras), meta_desperdicio_pct: String(data.meta_desperdicio_pct) })
    } else {
      alert('Nenhuma meta encontrada no mês anterior.')
    }
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Target className="w-6 h-6 text-amber-700" />
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Metas Mensais</h1>
          <p className="text-sm text-gray-400">Defina as metas de cada mês diretamente aqui</p>
        </div>
      </div>

      {/* Seletor de mês */}
      <div className="bg-white rounded-xl p-4 shadow-sm border flex items-center justify-between">
        <button onClick={() => setMes(subMonths(mes, 1))} className="text-gray-400 hover:text-gray-700 p-1">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="font-semibold text-gray-800 capitalize">{format(mes, 'MMMM yyyy', { locale: ptBR })}</span>
        <button onClick={() => setMes(addMonths(mes, 1))} disabled={isCurrentMonth}
          className="text-gray-400 hover:text-gray-700 p-1 disabled:opacity-30 disabled:cursor-not-allowed">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border">
        {salvo && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 text-green-700 text-sm font-medium flex items-center gap-2">
            <Save className="w-4 h-4" /> Metas salvas com sucesso!
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="text-sm font-medium text-gray-700">Meta de vendas (R$)</label>
            <p className="text-xs text-gray-400 mb-1">Valor total de vendas que deseja atingir no mês</p>
            <input type="number" step="0.01" value={form.meta_vendas} onChange={e => setForm({ ...form, meta_vendas: e.target.value })}
              placeholder="Ex: 30000,00" required
              className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Limite de compras (R$)</label>
            <p className="text-xs text-gray-400 mb-1">Valor máximo que deseja gastar em compras no mês</p>
            <input type="number" step="0.01" value={form.meta_compras} onChange={e => setForm({ ...form, meta_compras: e.target.value })}
              placeholder="Ex: 10000,00" required
              className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Meta de desperdício (%)</label>
            <p className="text-xs text-gray-400 mb-1">Taxa máxima de desperdício aceitável na produção</p>
            <input type="number" step="0.1" min="0" max="100" value={form.meta_desperdicio_pct} onChange={e => setForm({ ...form, meta_desperdicio_pct: e.target.value })}
              placeholder="Ex: 5" required
              className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={copiarMesAnterior}
              className="flex-1 border border-gray-300 text-gray-600 py-2.5 rounded-lg text-sm hover:bg-gray-50 transition-colors">
              Copiar mês anterior
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 bg-amber-700 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-amber-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              <Save className="w-4 h-4" /> {loading ? 'Salvando...' : existeId ? 'Atualizar metas' : 'Salvar metas'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
        💡 As metas definidas aqui aparecem automaticamente na barra de progresso de <strong>Vendas</strong>, nos <strong>Alertas</strong> e no <strong>Início</strong>.
      </div>
    </div>
  )
}
