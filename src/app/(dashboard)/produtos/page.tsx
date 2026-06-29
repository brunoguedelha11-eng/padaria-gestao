'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { BookOpen, Plus, Trash2 } from 'lucide-react'

interface Produto {
  id: string
  nome: string
  categoria: 'compra' | 'producao' | 'ambos'
  unidade?: string
}

const categorias = [
  { value: 'compra', label: 'Compra' },
  { value: 'producao', label: 'Produção' },
  { value: 'ambos', label: 'Ambos' },
]

const unidades = ['kg', 'g', 'L', 'mL', 'un', 'cx', 'pct', 'sc']

export default function ProdutosPage() {
  const supabase = createClient()
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [form, setForm] = useState({ nome: '', categoria: 'compra', unidade: 'un' })
  const [loading, setLoading] = useState(false)

  useEffect(() => { fetchProdutos() }, [])

  async function fetchProdutos() {
    const { data } = await supabase.from('produtos').select('*').order('categoria').order('nome')
    if (data) setProdutos(data as Produto[])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.from('produtos').insert(form)
    if (error) { alert('Erro: ' + error.message); setLoading(false); return }
    setForm({ nome: '', categoria: 'compra', unidade: 'un' })
    fetchProdutos()
    setLoading(false)
  }

  async function deletar(id: string) {
    if (!confirm('Remover este produto da lista?')) return
    await supabase.from('produtos').delete().eq('id', id)
    fetchProdutos()
  }

  const porCategoria = produtos.reduce((acc, p) => {
    if (!acc[p.categoria]) acc[p.categoria] = []
    acc[p.categoria].push(p)
    return acc
  }, {} as Record<string, Produto[]>)

  const labelCategoria: Record<string, string> = { compra: 'Compras', producao: 'Produção', ambos: 'Compras e Produção' }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <BookOpen className="w-6 h-6 text-amber-700" />
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Cadastro de Produtos</h1>
          <p className="text-sm text-gray-400">Produtos cadastrados aparecem como sugestão ao lançar compras e produção</p>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border">
        <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2"><Plus className="w-4 h-4" /> Novo produto</h2>
        <form onSubmit={handleSubmit} className="flex gap-3 items-end flex-wrap">
          <div className="flex-1 min-w-48">
            <label className="text-xs font-medium text-gray-600">Nome do produto</label>
            <input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })}
              placeholder="Ex: Farinha de trigo" required
              className="w-full border rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-amber-500" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Usado em</label>
            <select value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-amber-500">
              {categorias.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Unidade padrão</label>
            <select value={form.unidade} onChange={e => setForm({ ...form, unidade: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-amber-500">
              {unidades.map(u => <option key={u}>{u}</option>)}
            </select>
          </div>
          <button type="submit" disabled={loading}
            className="bg-amber-700 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-amber-800 transition-colors disabled:opacity-50">
            {loading ? 'Salvando...' : 'Adicionar'}
          </button>
        </form>
      </div>

      {Object.entries(porCategoria).map(([cat, lista]) => (
        <div key={cat} className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="p-4 border-b bg-gray-50">
            <h3 className="font-semibold text-gray-700 text-sm">{labelCategoria[cat] || cat} ({lista.length})</h3>
          </div>
          <div className="divide-y">
            {lista.map(p => (
              <div key={p.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <span className="font-medium text-gray-800 text-sm">{p.nome}</span>
                  {p.unidade && <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{p.unidade}</span>}
                </div>
                <button onClick={() => deletar(p.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}

      {produtos.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhum produto cadastrado ainda</p>
          <p className="text-xs mt-1">Adicione produtos para que apareçam como sugestão nos formulários</p>
        </div>
      )}
    </div>
  )
}
