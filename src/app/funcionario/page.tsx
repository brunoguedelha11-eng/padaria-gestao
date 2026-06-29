'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { ChefHat, LogOut, Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'

const hoje = format(new Date(), 'yyyy-MM-dd')

export default function FuncionarioPage() {
  const supabase = createClient()
  const router = useRouter()
  const [form, setForm] = useState({ data: hoje, produto: '', produzido: '', descartado: '', custo_estimado: '' })
  const [loading, setLoading] = useState(false)
  const [sucesso, setSucesso] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('producao').insert({
      data: form.data, produto: form.produto,
      produzido: parseInt(form.produzido),
      descartado: parseInt(form.descartado),
      custo_estimado: parseFloat(form.custo_estimado || '0'),
      user_id: user?.id
    })
    setForm({ data: hoje, produto: '', produzido: '', descartado: '', custo_estimado: '' })
    setSucesso(true)
    setTimeout(() => setSucesso(false), 3000)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-amber-50 flex flex-col">
      <header className="bg-amber-900 text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ChefHat className="w-6 h-6 text-amber-300" />
          <span className="font-bold">Lançamento de Produção</span>
        </div>
        <button onClick={async () => { await supabase.auth.signOut(); router.push('/login') }}
          className="flex items-center gap-2 text-sm text-amber-200 hover:text-white">
          <LogOut className="w-4 h-4" />Sair
        </button>
      </header>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
          <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <Plus className="w-5 h-5 text-amber-700" />Novo lançamento
          </h2>

          {sucesso && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 text-green-700 text-sm font-medium">
              ✓ Lançamento salvo com sucesso!
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Data</label>
              <input type="date" value={form.data} onChange={e => setForm({ ...form, data: e.target.value })}
                className="w-full border rounded-lg px-3 py-2.5 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Produto</label>
              <input value={form.produto} onChange={e => setForm({ ...form, produto: e.target.value })}
                placeholder="Ex: Pão francês" required
                className="w-full border rounded-lg px-3 py-2.5 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Produzido (unidades)</label>
              <input type="number" value={form.produzido} onChange={e => setForm({ ...form, produzido: e.target.value })}
                placeholder="0" required
                className="w-full border rounded-lg px-3 py-2.5 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Descartado (unidades)</label>
              <input type="number" value={form.descartado} onChange={e => setForm({ ...form, descartado: e.target.value })}
                placeholder="0" required
                className="w-full border rounded-lg px-3 py-2.5 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Custo estimado do descarte (R$)</label>
              <input type="number" step="0.01" value={form.custo_estimado} onChange={e => setForm({ ...form, custo_estimado: e.target.value })}
                placeholder="0,00"
                className="w-full border rounded-lg px-3 py-2.5 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-amber-700 text-white py-3 rounded-lg font-medium hover:bg-amber-800 transition-colors disabled:opacity-50 mt-2">
              {loading ? 'Salvando...' : 'Salvar lançamento'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
