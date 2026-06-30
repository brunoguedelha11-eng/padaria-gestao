'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Boxes, Plus, Trash2, Pencil, Check, X, History, AlertTriangle, RefreshCw } from 'lucide-react'
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
  const [showForm, setShowForm] = useState(false)
  const [showHistorico, setShowHistorico] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [atualizandoEstoque, setAtualizandoEstoque] = useState(false)
  const [qtdsTemp, setQtdsTemp] = useState<Record<string, string>>({})

  const [form, setForm] = useState({ produto: '', unidade: 'kg', quantidade_atual: '', quantidade_minima: '', preco_unitario: '' })
  const [editForm, setEditForm] = useState({ produto: '', unidade: 'kg', quantidade_atual: '', quantidade_minima: '', preco_unitario: '' })

  useEffect(() => { fetchTudo() }, [])

  async function fetchTudo() {
    const [{ data: ing }, { data: hist }] = await Promise.all([
      supabase.from('estoque_ingredientes').select('*').order('produto'),
      supabase.from('historico_precos').select('*').order('created_at', { ascending: false }).limit(30),
    ])
    setIngredientes(ing || [])
    setHistorico(hist || [])
  }

  async function addIngrediente(e: React.FormEvent) {
    e.preventDefault()
    await supabase.from('estoque_ingredientes').insert({
      produto: form.produto, unidade: form.unidade,
      quantidade_atual: parseFloat(form.quantidade_atual),
      quantidade_minima: parseFloat(form.quantidade_minima),
      preco_unitario: parseFloat(form.preco_unitario || '0'),
      updated_at: new Date().toISOString()
    })
    setForm({ produto: '', unidade: 'kg', quantidade_atual: '', quantidade_minima: '', preco_unitario: '' })
    setShowForm(false)
    fetchTudo()
  }

  async function salvarEdicao(ing: Ingrediente) {
    const precoNovo = parseFloat(editForm.preco_unitario)
    if (precoNovo !== ing.preco_unitario && ing.preco_unitario > 0) {
      await supabase.from('historico_precos').insert({
        ingrediente: ing.produto,
        preco_anterior: ing.preco_unitario,
        preco_novo: precoNovo,
        data: new Date().toISOString().split('T')[0]
      })
    }
    await supabase.from('estoque_ingredientes').update({
      produto: editForm.produto, unidade: editForm.unidade,
      quantidade_atual: parseFloat(editForm.quantidade_atual),
      quantidade_minima: parseFloat(editForm.quantidade_minima),
      preco_unitario: precoNovo,
      updated_at: new Date().toISOString()
    }).eq('id', ing.id)
    setEditandoId(null)
    fetchTudo()
  }

  async function atualizarQuantidades() {
    for (const [id, qtd] of Object.entries(qtdsTemp)) {
      if (qtd !== '') {
        await supabase.from('estoque_ingredientes').update({
          quantidade_atual: parseFloat(qtd),
          updated_at: new Date().toISOString()
        }).eq('id', id)
      }
    }
    setQtdsTemp({})
    setAtualizandoEstoque(false)
    fetchTudo()
  }

  async function deleteIngrediente(id: string) {
    if (!confirm('Excluir este ingrediente?')) return
    await supabase.from('estoque_ingredientes').delete().eq('id', id)
    fetchTudo()
  }

  function iniciarEdicao(ing: Ingrediente) {
    setEditandoId(ing.id)
    setEditForm({
      produto: ing.produto, unidade: ing.unidade,
      quantidade_atual: String(ing.quantidade_atual),
      quantidade_minima: String(ing.quantidade_minima),
      preco_unitario: String(ing.preco_unitario)
    })
  }

  const baixos = ingredientes.filter(i => i.quantidade_atual <= i.quantidade_minima)
  const ok = ingredientes.filter(i => i.quantidade_atual > i.quantidade_minima)
  const fmt = (v: number) => `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Boxes className="w-6 h-6 text-amber-700" />
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Estoque de Ingredientes</h1>
            <p className="text-sm text-gray-400">Atualize diariamente para manter os alertas precisos</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowHistorico(!showHistorico)}
            className="flex items-center gap-2 border border-gray-300 text-gray-600 px-3 py-2 rounded-lg text-sm hover:bg-gray-50">
            <History className="w-4 h-4" /> Histórico
          </button>
          <button onClick={() => { setAtualizandoEstoque(true); setQtdsTemp({}) }}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">
            <RefreshCw className="w-4 h-4" /> Atualizar estoque
          </button>
          <button onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-amber-700 text-white px-4 py-2 rounded-lg text-sm hover:bg-amber-800">
            <Plus className="w-4 h-4" /> Novo
          </button>
        </div>
      </div>

      {/* Modal atualização diária */}
      {atualizandoEstoque && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-blue-800">Atualização diária do estoque</h2>
              <p className="text-xs text-blue-600 mt-0.5">Informe as quantidades atuais. Deixe em branco para não alterar.</p>
            </div>
            <button onClick={() => setAtualizandoEstoque(false)} className="text-blue-400 hover:text-blue-700"><X className="w-5 h-5" /></button>
          </div>
          <div className="space-y-2 mb-4">
            {ingredientes.map(ing => (
              <div key={ing.id} className="flex items-center gap-3">
                <span className="flex-1 text-sm font-medium text-gray-700">{ing.produto}</span>
                <span className="text-xs text-gray-400 w-8">{ing.unidade}</span>
                <span className="text-xs text-gray-400 w-24 text-right">atual: {ing.quantidade_atual}</span>
                <input
                  type="number" step="0.1"
                  placeholder="nova qtd"
                  value={qtdsTemp[ing.id] || ''}
                  onChange={e => setQtdsTemp({ ...qtdsTemp, [ing.id]: e.target.value })}
                  className="w-28 border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
            ))}
          </div>
          <button onClick={atualizarQuantidades}
            className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center justify-center gap-2">
            <Check className="w-4 h-4" /> Salvar atualizações
          </button>
        </div>
      )}

      {/* Formulário novo ingrediente */}
      {showForm && (
        <div className="bg-white rounded-xl p-5 shadow-sm border">
          <h2 className="font-semibold text-gray-800 mb-4">Novo ingrediente</h2>
          <form onSubmit={addIngrediente} className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-600">Produto</label>
              <input value={form.produto} onChange={e => setForm({ ...form, produto: e.target.value })} required placeholder="Ex: Farinha de trigo"
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
              <label className="text-xs font-medium text-gray-600">Preço unitário (R$/{form.unidade})</label>
              <input type="number" step="0.01" value={form.preco_unitario} onChange={e => setForm({ ...form, preco_unitario: e.target.value })}
                placeholder="Ex: 3.50" className="w-full border rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Quantidade atual</label>
              <input type="number" step="0.1" value={form.quantidade_atual} onChange={e => setForm({ ...form, quantidade_atual: e.target.value })} required
                placeholder="Ex: 20" className="w-full border rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Quantidade mínima (alerta)</label>
              <input type="number" step="0.1" value={form.quantidade_minima} onChange={e => setForm({ ...form, quantidade_minima: e.target.value })} required
                placeholder="Ex: 5" className="w-full border rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
            <div className="col-span-2 flex gap-3">
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 border border-gray-300 text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-50">Cancelar</button>
              <button type="submit" className="flex-1 bg-amber-700 text-white py-2 rounded-lg text-sm hover:bg-amber-800">Salvar</button>
            </div>
          </form>
        </div>
      )}

      {/* Histórico de preços */}
      {showHistorico && (
        <div className="bg-white rounded-xl p-5 shadow-sm border">
          <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2"><History className="w-4 h-4" /> Histórico de variação de preços</h2>
          {historico.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">Nenhuma alteração de preço registrada ainda.</p>
          ) : (
            <div className="space-y-2">
              {historico.map(h => {
                const subiu = h.preco_novo > h.preco_anterior
                const pct = ((h.preco_novo - h.preco_anterior) / h.preco_anterior * 100).toFixed(1)
                return (
                  <div key={h.id} className="flex items-center justify-between text-sm py-2 border-b last:border-0">
                    <div>
                      <span className="font-medium text-gray-800">{h.ingrediente}</span>
                      <span className="text-gray-400 text-xs ml-2">{format(new Date(h.data + 'T12:00:00'), "dd/MM/yyyy")}</span>
                    </div>
                    <div className="flex items-center gap-2 text-right">
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
          )}
        </div>
      )}

      {/* Alertas de estoque baixo */}
      {baixos.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-red-700 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Estoque baixo</h2>
          {baixos.map(ing => (
            <div key={ing.id} className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-red-800">{ing.produto}</p>
                <p className="text-red-600 text-sm">Atual: <strong>{ing.quantidade_atual} {ing.unidade}</strong> — mínimo: {ing.quantidade_minima} {ing.unidade}</p>
              </div>
              <button onClick={() => iniciarEdicao(ing)} className="text-xs text-red-600 border border-red-300 px-2 py-1 rounded hover:bg-red-100">Editar</button>
            </div>
          ))}
        </div>
      )}

      {/* Lista completa */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="p-4 border-b">
          <h2 className="font-semibold text-gray-800 text-sm">Todos os ingredientes ({ingredientes.length})</h2>
        </div>
        {ingredientes.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">
            <Boxes className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>Nenhum ingrediente cadastrado ainda.</p>
          </div>
        ) : (
          <div className="divide-y">
            {ingredientes.map(ing => {
              const status = ing.quantidade_atual <= ing.quantidade_minima ? 'baixo' : ing.quantidade_atual <= ing.quantidade_minima * 1.5 ? 'atencao' : 'ok'
              const editando = editandoId === ing.id

              return (
                <div key={ing.id} className={`p-4 ${status === 'baixo' ? 'bg-red-50' : status === 'atencao' ? 'bg-yellow-50' : ''}`}>
                  {editando ? (
                    <div className="grid grid-cols-2 gap-2">
                      <input value={editForm.produto} onChange={e => setEditForm({ ...editForm, produto: e.target.value })}
                        className="col-span-2 border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500" />
                      <div className="flex gap-2">
                        <input type="number" step="0.1" value={editForm.quantidade_atual} onChange={e => setEditForm({ ...editForm, quantidade_atual: e.target.value })}
                          placeholder="Qtd atual" className="flex-1 border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500" />
                        <select value={editForm.unidade} onChange={e => setEditForm({ ...editForm, unidade: e.target.value })}
                          className="w-20 border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500">
                          {unidades.map(u => <option key={u}>{u}</option>)}
                        </select>
                      </div>
                      <input type="number" step="0.1" value={editForm.quantidade_minima} onChange={e => setEditForm({ ...editForm, quantidade_minima: e.target.value })}
                        placeholder="Qtd mínima" className="border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500" />
                      <input type="number" step="0.01" value={editForm.preco_unitario} onChange={e => setEditForm({ ...editForm, preco_unitario: e.target.value })}
                        placeholder={`Preço R$/${editForm.unidade}`} className="border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500" />
                      <div className="flex gap-2 col-span-2">
                        <button onClick={() => salvarEdicao(ing)} className="flex-1 bg-amber-700 text-white py-1.5 rounded-lg text-sm flex items-center justify-center gap-1 hover:bg-amber-800"><Check className="w-3 h-3" /> Salvar</button>
                        <button onClick={() => setEditandoId(null)} className="flex-1 border border-gray-300 text-gray-600 py-1.5 rounded-lg text-sm hover:bg-gray-50">Cancelar</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${status === 'baixo' ? 'bg-red-500' : status === 'atencao' ? 'bg-yellow-500' : 'bg-green-500'}`} />
                          <p className="font-medium text-gray-800 text-sm">{ing.produto}</p>
                        </div>
                        <p className="text-xs text-gray-500 ml-4 mt-0.5">
                          Atual: <strong className={status === 'baixo' ? 'text-red-600' : 'text-gray-700'}>{ing.quantidade_atual} {ing.unidade}</strong>
                          {' '} · mín: {ing.quantidade_minima} {ing.unidade}
                          {ing.preco_unitario > 0 && <> · {fmt(ing.preco_unitario)}/{ing.unidade}</>}
                        </p>
                        <p className="text-xs text-gray-400 ml-4">Atualizado: {format(new Date(ing.updated_at), "dd/MM HH:mm", { locale: ptBR })}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => iniciarEdicao(ing)} className="text-gray-300 hover:text-amber-600"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => deleteIngrediente(ing.id)} className="text-gray-300 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
