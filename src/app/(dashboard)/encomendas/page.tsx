'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ShoppingBag, Plus, Trash2, ChevronDown, ChevronUp, Check, Clock, X } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Receita {
  id: string
  nome: string
  rendimento: number
  unidade_rendimento: string
  margem_pct: number
  ingredientes_receita: { produto: string; quantidade: number; unidade: string; custo_unitario: number }[]
}

interface ItemEncomenda {
  receita_id: string
  produto: string
  quantidade: number
  preco_unitario: number
  total: number
}

interface Encomenda {
  id: string
  cliente: string
  data_entrega: string
  observacoes: string
  total: number
  status: string
  itens_encomenda: ItemEncomenda[]
}

export default function EncomendasPage() {
  const supabase = createClient()
  const [receitas, setReceitas] = useState<Receita[]>([])
  const [encomendas, setEncomendas] = useState<Encomenda[]>([])
  const [expandido, setExpandido] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  const [cliente, setCliente] = useState('')
  const [dataEntrega, setDataEntrega] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [itens, setItens] = useState<{ receita_id: string; quantidade: string }[]>([{ receita_id: '', quantidade: '' }])
  const [loading, setLoading] = useState(false)

  useEffect(() => { fetchTudo() }, [])

  async function fetchTudo() {
    const [{ data: rec }, { data: enc }] = await Promise.all([
      supabase.from('receitas').select('*, ingredientes_receita(*)').order('nome'),
      supabase.from('encomendas').select('*, itens_encomenda(*)').order('data_entrega'),
    ])
    setReceitas(rec || [])
    setEncomendas(enc || [])
  }

  function calcularPrecoUnitario(rec: Receita) {
    const custoIngr = rec.ingredientes_receita.reduce((s, i) => s + Number(i.quantidade) * Number(i.custo_unitario), 0)
    const custoUn = rec.rendimento > 0 ? custoIngr / rec.rendimento : 0
    return custoUn / (1 - rec.margem_pct / 100)
  }

  function getItensCalculados(): ItemEncomenda[] {
    return itens
      .filter(i => i.receita_id && i.quantidade)
      .map(i => {
        const rec = receitas.find(r => r.id === i.receita_id)
        if (!rec) return null
        const preco = calcularPrecoUnitario(rec)
        const qtd = parseFloat(i.quantidade)
        return { receita_id: rec.id, produto: rec.nome, quantidade: qtd, preco_unitario: preco, total: preco * qtd }
      })
      .filter(Boolean) as ItemEncomenda[]
  }

  const itensCalculados = getItensCalculados()
  const totalEncomenda = itensCalculados.reduce((s, i) => s + i.total, 0)

  // Ingredientes necessários para a encomenda
  function getIngredientesNecessarios() {
    const mapa: Record<string, { produto: string; quantidade: number; unidade: string }> = {}
    itens.filter(i => i.receita_id && i.quantidade).forEach(item => {
      const rec = receitas.find(r => r.id === item.receita_id)
      if (!rec) return
      const fator = parseFloat(item.quantidade) / rec.rendimento
      rec.ingredientes_receita.forEach(ing => {
        const chave = `${ing.produto}|${ing.unidade}`
        if (!mapa[chave]) mapa[chave] = { produto: ing.produto, quantidade: 0, unidade: ing.unidade }
        mapa[chave].quantidade += Number(ing.quantidade) * fator
      })
    })
    return Object.values(mapa)
  }

  const ingredientesNecessarios = getIngredientesNecessarios()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (itensCalculados.length === 0) return alert('Adicione pelo menos um produto.')
    setLoading(true)

    const { data: enc } = await supabase.from('encomendas').insert({
      cliente, data_entrega: dataEntrega, observacoes,
      total: totalEncomenda, status: 'pendente'
    }).select().single()

    if (enc) {
      await supabase.from('itens_encomenda').insert(itensCalculados.map(i => ({ ...i, encomenda_id: enc.id })))
    }

    setCliente(''); setDataEntrega(''); setObservacoes('')
    setItens([{ receita_id: '', quantidade: '' }])
    setShowForm(false)
    setLoading(false)
    fetchTudo()
  }

  async function marcarEntregue(id: string) {
    await supabase.from('encomendas').update({ status: 'entregue' }).eq('id', id)
    fetchTudo()
  }

  async function deleteEncomenda(id: string) {
    if (!confirm('Excluir esta encomenda?')) return
    await supabase.from('itens_encomenda').delete().eq('encomenda_id', id)
    await supabase.from('encomendas').delete().eq('id', id)
    fetchTudo()
  }

  const fmt = (v: number) => `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
  const pendentes = encomendas.filter(e => e.status === 'pendente')
  const entregues = encomendas.filter(e => e.status === 'entregue')

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <ShoppingBag className="w-6 h-6 text-amber-700" />
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Calculadora de Encomendas</h1>
            <p className="text-sm text-gray-400">Calcule ingredientes e preço de qualquer encomenda</p>
          </div>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="bg-amber-700 text-white px-4 py-2 rounded-lg text-sm hover:bg-amber-800 flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nova encomenda
        </button>
      </div>

      {/* Formulário */}
      {showForm && (
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <h2 className="font-semibold text-gray-800 mb-4">Nova encomenda</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600">Cliente</label>
                <input value={cliente} onChange={e => setCliente(e.target.value)} required placeholder="Nome do cliente"
                  className="w-full border rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-amber-500" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Data de entrega</label>
                <input type="date" value={dataEntrega} onChange={e => setDataEntrega(e.target.value)} required
                  className="w-full border rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-amber-500" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-gray-600">Produtos</label>
                <button type="button" onClick={() => setItens([...itens, { receita_id: '', quantidade: '' }])}
                  className="text-xs text-amber-700 hover:underline flex items-center gap-1">
                  <Plus className="w-3 h-3" /> Adicionar produto
                </button>
              </div>
              <div className="space-y-2">
                {itens.map((item, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <select value={item.receita_id} onChange={e => { const n = [...itens]; n[i].receita_id = e.target.value; setItens(n) }}
                      className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500">
                      <option value="">Selecione o produto</option>
                      {receitas.map(r => <option key={r.id} value={r.id}>{r.nome}</option>)}
                    </select>
                    <input type="number" value={item.quantidade} onChange={e => { const n = [...itens]; n[i].quantidade = e.target.value; setItens(n) }}
                      placeholder="Qtd" className="w-20 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500" />
                    {itens.length > 1 && (
                      <button type="button" onClick={() => setItens(itens.filter((_, idx) => idx !== i))} className="text-gray-300 hover:text-red-400">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600">Observações</label>
              <input value={observacoes} onChange={e => setObservacoes(e.target.value)} placeholder="Ex: sem açúcar, entrega no endereço X"
                className="w-full border rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>

            {/* Cálculo em tempo real */}
            {itensCalculados.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3">
                <div>
                  <p className="text-xs font-medium text-amber-800 uppercase tracking-wide mb-2">Resumo da encomenda</p>
                  {itensCalculados.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-gray-700">{item.produto} × {item.quantidade}</span>
                      <span className="font-medium">{fmt(item.total)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-sm font-bold mt-2 pt-2 border-t border-amber-200">
                    <span>Total</span>
                    <span className="text-green-700">{fmt(totalEncomenda)}</span>
                  </div>
                </div>

                {ingredientesNecessarios.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-amber-800 uppercase tracking-wide mb-2">Ingredientes necessários</p>
                    {ingredientesNecessarios.map((ing, i) => (
                      <div key={i} className="flex justify-between text-sm text-gray-600">
                        <span>{ing.produto}</span>
                        <span>{ing.quantidade.toFixed(2)} {ing.unidade}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 border border-gray-300 text-gray-600 py-2.5 rounded-lg text-sm hover:bg-gray-50">Cancelar</button>
              <button type="submit" disabled={loading} className="flex-1 bg-amber-700 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-amber-800 disabled:opacity-50">
                {loading ? 'Salvando...' : 'Salvar encomenda'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Encomendas pendentes */}
      {pendentes.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2"><Clock className="w-4 h-4 text-orange-500" /> Pendentes ({pendentes.length})</h2>
          {pendentes.map(enc => {
            const aberto = expandido === enc.id
            const diasRestantes = Math.ceil((new Date(enc.data_entrega).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
            return (
              <div key={enc.id} className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50" onClick={() => setExpandido(aberto ? null : enc.id)}>
                  <div className="flex items-center gap-3">
                    {aberto ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    <div>
                      <p className="font-semibold text-gray-800">{enc.cliente}</p>
                      <p className="text-xs text-gray-400">
                        Entrega: {format(new Date(enc.data_entrega + 'T12:00:00'), "dd 'de' MMMM", { locale: ptBR })}
                        {diasRestantes >= 0 ? <span className={`ml-2 font-medium ${diasRestantes <= 1 ? 'text-red-500' : 'text-orange-500'}`}>({diasRestantes === 0 ? 'hoje!' : `${diasRestantes}d`})</span> : <span className="ml-2 text-red-500">(atrasada)</span>}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-700">{fmt(enc.total)}</p>
                  </div>
                </div>
                {aberto && (
                  <div className="border-t px-4 pb-4 pt-3 space-y-3">
                    <div className="space-y-1">
                      {(enc.itens_encomenda || []).map((item, i) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span className="text-gray-700">{item.produto} × {item.quantidade}</span>
                          <span>{fmt(item.total)}</span>
                        </div>
                      ))}
                    </div>
                    {enc.observacoes && <p className="text-xs text-gray-500 italic">&quot;{enc.observacoes}&quot;</p>}
                    <div className="flex gap-2">
                      <button onClick={() => marcarEntregue(enc.id)}
                        className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm hover:bg-green-700 flex items-center justify-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Marcar entregue
                      </button>
                      <button onClick={() => deleteEncomenda(enc.id)} className="px-3 border border-red-200 text-red-400 rounded-lg hover:bg-red-50">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Entregues */}
      {entregues.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-400 flex items-center gap-2"><Check className="w-4 h-4" /> Entregues ({entregues.length})</h2>
          {entregues.slice(0, 5).map(enc => (
            <div key={enc.id} className="bg-gray-50 rounded-xl p-4 flex items-center justify-between opacity-60">
              <div>
                <p className="font-medium text-gray-700 text-sm">{enc.cliente}</p>
                <p className="text-xs text-gray-400">{format(new Date(enc.data_entrega + 'T12:00:00'), "dd/MM/yyyy")}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-600">{fmt(enc.total)}</span>
                <button onClick={() => deleteEncomenda(enc.id)} className="text-gray-300 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {encomendas.length === 0 && !showForm && (
        <div className="text-center py-16 text-gray-400">
          <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Nenhuma encomenda registrada.</p>
          <button onClick={() => setShowForm(true)} className="text-amber-700 hover:underline text-sm mt-1">Criar primeira encomenda →</button>
        </div>
      )}
    </div>
  )
}
