'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Boxes, Plus, Trash2, Check, History, AlertTriangle, Save } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Ingrediente {
  id: string
  produto: string
  unidade: string
  quantidade_atual: number
  quantidade_minima: number
  preco_unitario: number
  updated_at: string
}

interface HistoricoPreco {
  id: string
  ingrediente: string
  preco_anterior: number
  preco_novo: number
  data: string
}

const unidades = ['kg', 'g', 'L', 'ml', 'un', 'cx', 'pct', 'sc', 'dz']

export default function EstoquePage() {
  const supabase = createClient()
  const [ingredientes, setIngredientes] = useState<Ingrediente[]>([])
  const [historico, setHistorico] = useState<HistoricoPreco[]>([])
  const [showHistorico, setShowHistorico] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [savedOk, setSavedOk] = useState(false)

  // Estado inline de cada ingrediente (qtd atual editável + qtd mínima editável)
  const [qtds, setQtds] = useState<Record<string, string>>({})
  const [mins, setMins] = useState<Record<string, string>>({})

  const [form, setForm] = useState({ produto: '', unidade: 'kg', quantidade_atual: '', quantidade_minima: '', preco_unitario: '' })

  useEffect(() => { fetchTudo() }, [])

  async function fetchTudo() {
    const [{ data: ing }, { data: hist }] = await Promise.all([
      supabase.from('estoque_ingredientes').select('*').order('produto'),
      supabase.from('historico_precos').select('*').order('created_at', { ascending: false }).limit(30),
    ])
    const lista = ing || []
    setIngredientes(lista)
    setHistorico(hist || [])

    // Inicializa os campos com os valores atuais
    const q: Record<string, string> = {}
    const m: Record<string, string> = {}
    lista.forEach((i: Ingrediente) => {
      q[i.id] = String(i.quantidade_atual)
      m[i.id] = String(i.quantidade_minima)
    })
    setQtds(q)
    setMins(m)
  }

  async function salvarTudo() {
    setSalvando(true)
    for (const ing of ingredientes) {
      const novaQtd = parseFloat(qtds[ing.id] ?? String(ing.quantidade_atual))
      const novaMin = parseFloat(mins[ing.id] ?? String(ing.quantidade_minima))
      if (novaQtd !== ing.quantidade_atual || novaMin !== ing.quantidade_minima) {
        await supabase.from('estoque_ingredientes').update({
          quantidade_atual: novaQtd,
          quantidade_minima: novaMin,
          updated_at: new Date().toISOString()
        }).eq('id', ing.id)
      }
    }
    setSalvando(false)
    setSavedOk(true)
    setTimeout(() => setSavedOk(false), 2000)
    fetchTudo()
  }

  async function addIngrediente(e: React.FormEvent) {
    e.preventDefault()
    await supabase.from('estoque_ingredientes').insert({
      produto: form.produto,
      unidade: form.unidade,
      quantidade_atual: parseFloat(form.quantidade_atual),
      quantidade_minima: parseFloat(form.quantidade_minima),
      preco_unitario: parseFloat(form.preco_unitario || '0'),
      updated_at: new Date().toISOString()
    })
    setForm({ produto: '', unidade: 'kg', quantidade_atual: '', quantidade_minima: '', preco_unitario: '' })
    setShowForm(false)
    fetchTudo()
  }

  async function deleteIngrediente(id: string) {
    if (!confirm('Excluir este ingrediente?')) return
    await supabase.from('estoque_ingredientes').delete().eq('id', id)
    fetchTudo()
  }

  const fmt = (v: number) => `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
  const alertas = ingredientes.filter(i => parseFloat(qtds[i.id] ?? String(i.quantidade_atual)) <= i.quantidade_minima)

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Boxes className="w-6 h-6 text-amber-700" />
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Estoque de Ingredientes</h1>
            <p className="text-sm text-gray-400">Atualize as quantidades diariamente</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowHistorico(!showHistorico)}
            className="flex items-center gap-2 border border-gray-300 text-gray-600 px-3 py-2 rounded-lg text-sm hover:bg-gray-50">
            <History className="w-4 h-4" /> Histórico
          </button>
          <button onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-amber-700 text-white px-4 py-2 rounded-lg text-sm hover:bg-amber-800">
            <Plus className="w-4 h-4" /> Novo ingrediente
          </button>
        </div>
      </div>

      {/* Alerta de estoque baixo */}
      {alertas.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-800 text-sm">Estoque baixo: {alertas.length} produto(s)</p>
            <p className="text-red-700 text-xs mt-0.5">{alertas.map(i => i.produto).join(', ')}</p>
          </div>
        </div>
      )}

      {/* Formulário novo ingrediente */}
      {showForm && (
        <div className="bg-white rounded-xl p-5 shadow-sm border">
          <h2 className="font-semibold text-gray-800 mb-4">Novo ingrediente</h2>
          <form onSubmit={addIngrediente} className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-600">Nome do produto</label>
              <input value={form.produto} onChange={e => setForm({ ...form, produto: e.target.value })} required
                placeholder="Ex: Farinha de trigo"
                className="w-full border rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Unidade</label>
              <select value={form.unidade} onChange={e => setForm({ ...form, unidade: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-amber-500">
                {unidades.map(u => <option key={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Preço unitário (R$)</label>
              <input type="number" step="0.01" value={form.preco_unitario} onChange={e => setForm({ ...form, preco_unitario: e.target.value })}
                placeholder="Ex: 3.50"
                className="w-full border rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Quantidade atual</label>
              <input type="number" step="0.1" value={form.quantidade_atual} onChange={e => setForm({ ...form, quantidade_atual: e.target.value })} required
                placeholder="Ex: 20"
                className="w-full border rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Quantidade mínima (alerta)</label>
              <input type="number" step="0.1" value={form.quantidade_minima} onChange={e => setForm({ ...form, quantidade_minima: e.target.value })} required
                placeholder="Ex: 5"
                className="w-full border rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
            <div className="col-span-2 flex gap-3 mt-1">
              <button type="button" onClick={() => setShowForm(false)}
                className="flex-1 border border-gray-300 text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-50">Cancelar</button>
              <button type="submit"
                className="flex-1 bg-amber-700 text-white py-2 rounded-lg text-sm hover:bg-amber-800">Salvar</button>
            </div>
          </form>
        </div>
      )}

      {/* Histórico de preços */}
      {showHistorico && (
        <div className="bg-white rounded-xl p-5 shadow-sm border">
          <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2"><History className="w-4 h-4" /> Histórico de preços</h2>
          {historico.length === 0
            ? <p className="text-gray-400 text-sm text-center py-4">Nenhuma alteração registrada ainda.</p>
            : <div className="space-y-2">
              {historico.map(h => {
                const subiu = h.preco_novo > h.preco_anterior
                const pct = ((h.preco_novo - h.preco_anterior) / h.preco_anterior * 100).toFixed(1)
                return (
                  <div key={h.id} className="flex items-center justify-between text-sm py-2 border-b last:border-0">
                    <div>
                      <span className="font-medium text-gray-800">{h.ingrediente}</span>
                      <span className="text-gray-400 text-xs ml-2">{format(new Date(h.data + 'T12:00:00'), 'dd/MM/yyyy')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">{fmt(h.preco_anterior)} →</span>
                      <span className={`font-bold ${subiu ? 'text-red-600' : 'text-green-600'}`}>{fmt(h.preco_novo)}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${subiu ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                        {subiu ? '+' : ''}{pct}%
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          }
        </div>
      )}

      {/* Lista principal — atualização diária inline */}
      {ingredientes.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-800 text-sm">Atualização diária</h2>
              <p className="text-xs text-gray-400 mt-0.5">Edite as quantidades e clique em Salvar</p>
            </div>
            <button onClick={salvarTudo} disabled={salvando}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${savedOk ? 'bg-green-600 text-white' : 'bg-amber-700 text-white hover:bg-amber-800'} disabled:opacity-50`}>
              {savedOk ? <><Check className="w-4 h-4" /> Salvo!</> : salvando ? 'Salvando...' : <><Save className="w-4 h-4" /> Salvar</>}
            </button>
          </div>

          {/* Cabeçalho da tabela */}
          <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-gray-50 border-b text-xs font-medium text-gray-500">
            <div className="col-span-4">Produto</div>
            <div className="col-span-2 text-center">Un.</div>
            <div className="col-span-3 text-center">Qtd atual</div>
            <div className="col-span-2 text-center" title="Quantidade mínima — abaixo disso, o alerta acende">Mín. ⬛</div>
            <div className="col-span-1"></div>
          </div>

          <div className="divide-y">
            {ingredientes.map(ing => {
              const qtdAtual = parseFloat(qtds[ing.id] ?? String(ing.quantidade_atual))
              const qtdMin = parseFloat(mins[ing.id] ?? String(ing.quantidade_minima))
              const alerta = qtdAtual <= qtdMin
              const atencao = !alerta && qtdAtual <= qtdMin * 1.5

              return (
                <div key={ing.id} className={`grid grid-cols-12 gap-2 items-center px-4 py-3 ${alerta ? 'bg-red-50' : atencao ? 'bg-yellow-50' : ''}`}>
                  <div className="col-span-4 flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${alerta ? 'bg-red-500' : atencao ? 'bg-yellow-400' : 'bg-green-500'}`} />
                    <span className="font-medium text-gray-800 text-sm truncate">{ing.produto}</span>
                  </div>
                  <div className="col-span-2 text-center text-xs text-gray-400">{ing.unidade}</div>
                  <div className="col-span-3">
                    <input
                      type="number" step="0.1"
                      value={qtds[ing.id] ?? ''}
                      onChange={e => setQtds({ ...qtds, [ing.id]: e.target.value })}
                      className={`w-full border rounded-lg px-3 py-2 text-sm text-center font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 ${alerta ? 'border-red-300 bg-red-50 text-red-700' : ''}`}
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number" step="0.1"
                      value={mins[ing.id] ?? ''}
                      onChange={e => setMins({ ...mins, [ing.id]: e.target.value })}
                      title="Quantidade mínima — abaixo disso o alerta acende"
                      className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm text-center text-gray-500 focus:outline-none focus:ring-1 focus:ring-amber-400 bg-gray-50"
                    />
                  </div>
                  <div className="col-span-1 flex justify-center">
                    <button onClick={() => deleteIngrediente(ing.id)} className="text-gray-200 hover:text-red-400">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="px-4 py-3 bg-gray-50 border-t flex items-center justify-between text-xs text-gray-400">
            <span>Legenda: <span className="text-green-600 font-medium">● OK</span> · <span className="text-yellow-500 font-medium">● Atenção</span> · <span className="text-red-500 font-medium">● Estoque baixo</span></span>
            <span>{format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
          </div>
        </div>
      )}

      {ingredientes.length === 0 && !showForm && (
        <div className="text-center py-16 text-gray-400">
          <Boxes className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhum ingrediente cadastrado ainda.</p>
          <button onClick={() => setShowForm(true)} className="text-amber-700 hover:underline text-sm mt-1">Cadastrar primeiro ingrediente →</button>
        </div>
      )}
    </div>
  )
}
