'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { BookOpen, Plus, Trash2, ChevronDown, ChevronUp, Calculator } from 'lucide-react'

interface Ingrediente {
  id?: string
  produto: string
  quantidade: number
  unidade: string
  custo_unitario: number
}

interface Receita {
  id: string
  nome: string
  rendimento: number
  unidade_rendimento: string
  margem_pct: number
  ingredientes_receita: Ingrediente[]
}

const unidades = ['kg', 'g', 'L', 'ml', 'un', 'cx', 'pct', 'sc']

export default function ReceitasPage() {
  const supabase = createClient()
  const [receitas, setReceitas] = useState<Receita[]>([])
  const [expandido, setExpandido] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [nome, setNome] = useState('')
  const [rendimento, setRendimento] = useState('')
  const [unidadeRendimento, setUnidadeRendimento] = useState('un')
  const [margem, setMargem] = useState('60')
  const [ingredientes, setIngredientes] = useState<Ingrediente[]>([
    { produto: '', quantidade: 0, unidade: 'kg', custo_unitario: 0 }
  ])
  const [loading, setLoading] = useState(false)

  useEffect(() => { fetchReceitas() }, [])

  async function fetchReceitas() {
    const { data } = await supabase.from('receitas').select('*, ingredientes_receita(*)').order('nome')
    setReceitas(data || [])
  }

  function addIngrediente() {
    setIngredientes([...ingredientes, { produto: '', quantidade: 0, unidade: 'kg', custo_unitario: 0 }])
  }

  function removeIngrediente(i: number) {
    setIngredientes(ingredientes.filter((_, idx) => idx !== i))
  }

  function updateIngrediente(i: number, campo: keyof Ingrediente, valor: string | number) {
    const novo = [...ingredientes]
    novo[i] = { ...novo[i], [campo]: valor }
    setIngredientes(novo)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { data: rec } = await supabase.from('receitas').insert({
      nome, rendimento: parseFloat(rendimento),
      unidade_rendimento: unidadeRendimento,
      margem_pct: parseFloat(margem)
    }).select().single()

    if (rec) {
      const ings = ingredientes.filter(i => i.produto).map(i => ({
        receita_id: rec.id, produto: i.produto,
        quantidade: Number(i.quantidade), unidade: i.unidade,
        custo_unitario: Number(i.custo_unitario)
      }))
      if (ings.length > 0) await supabase.from('ingredientes_receita').insert(ings)
    }

    setNome(''); setRendimento(''); setMargem('60')
    setIngredientes([{ produto: '', quantidade: 0, unidade: 'kg', custo_unitario: 0 }])
    setShowForm(false)
    setLoading(false)
    fetchReceitas()
  }

  async function deleteReceita(id: string) {
    if (!confirm('Excluir esta receita?')) return
    await supabase.from('ingredientes_receita').delete().eq('receita_id', id)
    await supabase.from('receitas').delete().eq('id', id)
    fetchReceitas()
  }

  function calcularCustoTotal(ings: Ingrediente[]) {
    return ings.reduce((s, i) => s + Number(i.quantidade) * Number(i.custo_unitario), 0)
  }

  function calcularPrecoSugerido(custoTotal: number, rendimento: number, margem: number) {
    if (rendimento <= 0) return 0
    const custoUnitario = custoTotal / rendimento
    return custoUnitario / (1 - margem / 100)
  }

  const fmt = (v: number) => `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`

  // Custo prévia no formulário
  const custoFormulario = calcularCustoTotal(ingredientes)
  const rendimentoNum = parseFloat(rendimento) || 0
  const precoSugerido = calcularPrecoSugerido(custoFormulario, rendimentoNum, parseFloat(margem) || 60)

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BookOpen className="w-6 h-6 text-amber-700" />
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Receitas e Precificação</h1>
            <p className="text-sm text-gray-400">Cadastre suas receitas e descubra o preço justo de venda</p>
          </div>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="bg-amber-700 text-white px-4 py-2 rounded-lg text-sm hover:bg-amber-800 flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nova receita
        </button>
      </div>

      {/* Formulário de nova receita */}
      {showForm && (
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <h2 className="font-semibold text-gray-800 mb-4">Nova receita</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700">Nome do produto</label>
                <input value={nome} onChange={e => setNome(e.target.value)} required placeholder="Ex: Pão francês"
                  className="w-full border rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-amber-500" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Rendimento (qtd produzida)</label>
                <input type="number" value={rendimento} onChange={e => setRendimento(e.target.value)} required placeholder="Ex: 50"
                  className="w-full border rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-amber-500" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Unidade</label>
                <select value={unidadeRendimento} onChange={e => setUnidadeRendimento(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-amber-500">
                  {unidades.map(u => <option key={u}>{u}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700">Margem de lucro desejada: <span className="text-amber-700 font-bold">{margem}%</span></label>
                <input type="range" min="10" max="90" step="5" value={margem} onChange={e => setMargem(e.target.value)}
                  className="w-full mt-1 accent-amber-700" />
                <div className="flex justify-between text-xs text-gray-400 mt-0.5"><span>10%</span><span>90%</span></div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">Ingredientes</label>
                <button type="button" onClick={addIngrediente}
                  className="text-xs text-amber-700 hover:underline flex items-center gap-1">
                  <Plus className="w-3 h-3" /> Adicionar ingrediente
                </button>
              </div>
              <div className="space-y-2">
                {ingredientes.map((ing, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-center">
                    <input value={ing.produto} onChange={e => updateIngrediente(i, 'produto', e.target.value)}
                      placeholder="Ingrediente" className="col-span-4 border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500" />
                    <input type="number" step="0.001" value={ing.quantidade || ''} onChange={e => updateIngrediente(i, 'quantidade', e.target.value)}
                      placeholder="Qtd" className="col-span-2 border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500" />
                    <select value={ing.unidade} onChange={e => updateIngrediente(i, 'unidade', e.target.value)}
                      className="col-span-2 border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500">
                      {unidades.map(u => <option key={u}>{u}</option>)}
                    </select>
                    <input type="number" step="0.01" value={ing.custo_unitario || ''} onChange={e => updateIngrediente(i, 'custo_unitario', e.target.value)}
                      placeholder="R$/un" className="col-span-3 border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500" />
                    <button type="button" onClick={() => removeIngrediente(i)} className="col-span-1 text-gray-300 hover:text-red-400 flex justify-center">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Prévia do preço */}
            {custoFormulario > 0 && rendimentoNum > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Calculator className="w-4 h-4 text-amber-700" />
                  <span className="font-medium text-amber-800 text-sm">Prévia do preço</span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div><p className="text-xs text-gray-500">Custo total</p><p className="font-bold text-gray-800">{fmt(custoFormulario)}</p></div>
                  <div><p className="text-xs text-gray-500">Custo/unidade</p><p className="font-bold text-gray-800">{fmt(custoFormulario / rendimentoNum)}</p></div>
                  <div><p className="text-xs text-gray-500">Preço sugerido</p><p className="font-bold text-green-700 text-base">{fmt(precoSugerido)}</p></div>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button type="button" onClick={() => setShowForm(false)}
                className="flex-1 border border-gray-300 text-gray-600 py-2.5 rounded-lg text-sm hover:bg-gray-50">
                Cancelar
              </button>
              <button type="submit" disabled={loading}
                className="flex-1 bg-amber-700 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-amber-800 disabled:opacity-50">
                {loading ? 'Salvando...' : 'Salvar receita'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de receitas */}
      {receitas.length === 0 && !showForm && (
        <div className="text-center py-16 text-gray-400">
          <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Nenhuma receita cadastrada ainda.</p>
          <button onClick={() => setShowForm(true)} className="text-amber-700 hover:underline text-sm mt-1">Criar primeira receita →</button>
        </div>
      )}

      <div className="space-y-3">
        {receitas.map(rec => {
          const custoTotal = calcularCustoTotal(rec.ingredientes_receita)
          const precoSug = calcularPrecoSugerido(custoTotal, rec.rendimento, rec.margem_pct)
          const custoUn = rec.rendimento > 0 ? custoTotal / rec.rendimento : 0
          const aberto = expandido === rec.id

          return (
            <div key={rec.id} className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                onClick={() => setExpandido(aberto ? null : rec.id)}>
                <div className="flex items-center gap-3">
                  {aberto ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  <div>
                    <p className="font-semibold text-gray-800">{rec.nome}</p>
                    <p className="text-xs text-gray-400">Rendimento: {rec.rendimento} {rec.unidade_rendimento} · Margem: {rec.margem_pct}%</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">Preço sugerido</p>
                  <p className="font-bold text-green-700">{fmt(precoSug)}<span className="text-xs text-gray-400 font-normal">/{rec.unidade_rendimento}</span></p>
                </div>
              </div>

              {aberto && (
                <div className="border-t px-4 pb-4 pt-3 space-y-4">
                  {/* Cards de custo */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <p className="text-xs text-gray-500">Custo total</p>
                      <p className="font-bold text-gray-800">{fmt(custoTotal)}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <p className="text-xs text-gray-500">Custo/unidade</p>
                      <p className="font-bold text-gray-800">{fmt(custoUn)}</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3 text-center">
                      <p className="text-xs text-gray-500">Preço sugerido</p>
                      <p className="font-bold text-green-700">{fmt(precoSug)}</p>
                    </div>
                  </div>

                  {/* Ingredientes */}
                  {rec.ingredientes_receita.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Ingredientes</p>
                      <div className="space-y-1">
                        {rec.ingredientes_receita.map((ing, i) => (
                          <div key={i} className="flex justify-between text-sm">
                            <span className="text-gray-700">{ing.produto} — {ing.quantidade} {ing.unidade}</span>
                            <span className="text-gray-500">{fmt(Number(ing.quantidade) * Number(ing.custo_unitario))}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <button onClick={() => deleteReceita(rec.id)}
                    className="text-xs text-red-400 hover:text-red-600 flex items-center gap-1 mt-1">
                    <Trash2 className="w-3 h-3" /> Excluir receita
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
