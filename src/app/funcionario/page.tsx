'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { ChefHat, LogOut, Plus, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

const hoje = format(new Date(), 'yyyy-MM-dd')

export default function FuncionarioPage() {
  const supabase = createClient()
  const router = useRouter()
  const [dataForm, setDataForm] = useState(hoje)
  const [itens, setItens] = useState([{ produto: '', produzido: '', descartado: '', custo_estimado: '' }])
  const [loading, setLoading] = useState(false)
  const [sucesso, setSucesso] = useState(false)

  function addItem() {
    setItens([...itens, { produto: '', produzido: '', descartado: '', custo_estimado: '' }])
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
    const registros = itens.map(it => ({
      data: dataForm, produto: it.produto,
      produzido: parseInt(it.produzido),
      descartado: parseInt(it.descartado || '0'),
      custo_estimado: parseFloat(it.custo_estimado || '0'),
      user_id: user?.id
    }))
    const { error } = await supabase.from('producao').insert(registros)
    if (error) { alert('Erro ao salvar: ' + error.message); setLoading(false); return }
    setDataForm(hoje)
    setItens([{ produto: '', produzido: '', descartado: '', custo_estimado: '' }])
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
          <LogOut className="w-4 h-4" /> Sair
        </button>
      </header>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-xl">
          <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <Plus className="w-5 h-5 text-amber-700" /> Novo lançamento do dia
          </h2>

          {sucesso && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 text-green-700 text-sm font-medium">
              ✓ Lançamento salvo com sucesso!
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-sm font-medium text-gray-700">Data</label>
              <input type="date" value={dataForm} onChange={e => setDataForm(e.target.value)}
                className="w-full border rounded-lg px-3 py-2.5 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-700">Produtos</p>
              {itens.map((item, i) => (
                <div key={i} className="border rounded-xl p-4 space-y-3 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Produto {i + 1}</span>
                    {itens.length > 1 && (
                      <button type="button" onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Nome do produto</label>
                    <input value={item.produto} onChange={e => updateItem(i, 'produto', e.target.value)}
                      placeholder="Ex: Pão francês" required
                      className="w-full border rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-amber-500" />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-sm text-gray-600">Produzido (un)</label>
                      <input type="number" value={item.produzido} onChange={e => updateItem(i, 'produzido', e.target.value)}
                        placeholder="0" required
                        className="w-full border rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-amber-500" />
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Descartado (un)</label>
                      <input type="number" value={item.descartado} onChange={e => updateItem(i, 'descartado', e.target.value)}
                        placeholder="0"
                        className="w-full border rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-amber-500" />
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Custo descarte (R$)</label>
                      <input type="number" step="0.01" value={item.custo_estimado} onChange={e => updateItem(i, 'custo_estimado', e.target.value)}
                        placeholder="0,00"
                        className="w-full border rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-amber-500" />
                    </div>
                  </div>
                </div>
              ))}

              <button type="button" onClick={addItem}
                className="w-full border-2 border-dashed border-amber-300 rounded-xl py-3 text-amber-700 text-sm font-medium hover:border-amber-500 hover:bg-amber-50 transition-colors flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" /> Adicionar outro produto
              </button>
            </div>

            <button type="submit" disabled={loading}
              className="w-full bg-amber-700 text-white py-3 rounded-lg font-medium hover:bg-amber-800 transition-colors disabled:opacity-50">
              {loading ? 'Salvando...' : `Salvar ${itens.length > 1 ? itens.length + ' produtos' : 'lançamento'}`}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
