'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { BookOpen, Plus, Trash2, RefreshCw, Check, X } from 'lucide-react'

interface Produto {
  id: string
  nome: string
  categoria: 'compra' | 'producao' | 'ambos'
  unidade?: string
}

interface ProdutoImportar {
  nome: string
  unidade: string
  categoria: string
  selecionado: boolean
  vezes: number
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
  const [importando, setImportando] = useState(false)
  const [produtosImportar, setProdutosImportar] = useState<ProdutoImportar[]>([])
  const [loadingImport, setLoadingImport] = useState(false)

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

  async function abrirImportacao() {
    setLoadingImport(true)
    // Busca todos os itens únicos do histórico de compras
    const { data: itens } = await supabase.from('itens_compra').select('produto, apresentacao')
    const nomesExistentes = new Set(produtos.map(p => p.nome.toLowerCase().trim()))

    // Agrupa por produto e conta ocorrências
    const mapa: Record<string, { unidade: string; vezes: number }> = {}
    ;(itens || []).forEach((it: any) => {
      const nome = it.produto?.trim()
      if (!nome) return
      const key = nome.toLowerCase()
      if (!mapa[key]) mapa[key] = { unidade: it.apresentacao || 'un', vezes: 0 }
      mapa[key].vezes++
    })

    // Filtra os que ainda não estão cadastrados
    const novos: ProdutoImportar[] = Object.entries(mapa)
      .filter(([key]) => !nomesExistentes.has(key))
      .map(([, v], i) => {
        // Tenta inferir o nome correto com capitalização
        const nomeOriginal = (itens || []).find((it: any) => it.produto?.toLowerCase().trim() === Object.keys(mapa)[i])?.produto?.trim() || Object.keys(mapa)[i]
        return {
          nome: nomeOriginal,
          unidade: v.unidade,
          categoria: 'compra',
          selecionado: true,
          vezes: v.vezes
        }
      })
      .sort((a, b) => b.vezes - a.vezes)

    // Recalcula nome original corretamente
    const novosCorrigidos: ProdutoImportar[] = Object.entries(mapa)
      .filter(([key]) => !nomesExistentes.has(key))
      .map(([key, v]) => {
        const nomeOriginal = (itens || []).find((it: any) => it.produto?.toLowerCase().trim() === key)?.produto?.trim() || key
        return {
          nome: nomeOriginal,
          unidade: v.unidade,
          categoria: 'compra',
          selecionado: true,
          vezes: v.vezes
        }
      })
      .sort((a, b) => b.vezes - a.vezes)

    setProdutosImportar(novosCorrigidos)
    setImportando(true)
    setLoadingImport(false)
  }

  async function confirmarImportacao() {
    const selecionados = produtosImportar.filter(p => p.selecionado)
    if (selecionados.length === 0) { setImportando(false); return }
    setLoading(true)
    const { error } = await supabase.from('produtos').insert(
      selecionados.map(p => ({ nome: p.nome, categoria: p.categoria, unidade: p.unidade }))
    )
    if (error) alert('Erro: ' + error.message)
    setImportando(false)
    fetchProdutos()
    setLoading(false)
  }

  function toggleImportar(i: number) {
    const novo = [...produtosImportar]
    novo[i].selecionado = !novo[i].selecionado
    setProdutosImportar(novo)
  }

  function updateImportar(i: number, campo: keyof ProdutoImportar, valor: string) {
    const novo = [...produtosImportar]
    ;(novo[i] as any)[campo] = valor
    setProdutosImportar(novo)
  }

  const porCategoria = produtos.reduce((acc, p) => {
    if (!acc[p.categoria]) acc[p.categoria] = []
    acc[p.categoria].push(p)
    return acc
  }, {} as Record<string, Produto[]>)

  const labelCategoria: Record<string, string> = { compra: 'Compras', producao: 'Produção', ambos: 'Compras e Produção' }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <BookOpen className="w-6 h-6 text-amber-700" />
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Cadastro de Produtos</h1>
            <p className="text-sm text-gray-400">Produtos aparecem como opções rápidas ao lançar compras</p>
          </div>
        </div>
        <button onClick={abrirImportacao} disabled={loadingImport}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${loadingImport ? 'animate-spin' : ''}`} />
          {loadingImport ? 'Analisando...' : 'Importar do histórico de compras'}
        </button>
      </div>

      {/* Painel de importação */}
      {importando && (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="p-4 border-b bg-blue-50 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-blue-800">Produtos encontrados no histórico de compras</h2>
              <p className="text-xs text-blue-600 mt-0.5">Revise a lista, ajuste a unidade/categoria e confirme quais deseja cadastrar.</p>
            </div>
            <button onClick={() => setImportando(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
          </div>

          {produtosImportar.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">
              <Check className="w-10 h-10 mx-auto mb-2 text-green-500 opacity-60" />
              <p>Todos os produtos do histórico já estão cadastrados!</p>
            </div>
          ) : (
            <>
              <div className="divide-y max-h-96 overflow-y-auto">
                {produtosImportar.map((p, i) => (
                  <div key={i} className={`flex items-center gap-3 px-4 py-3 ${!p.selecionado ? 'opacity-40' : ''}`}>
                    <input type="checkbox" checked={p.selecionado} onChange={() => toggleImportar(i)}
                      className="w-4 h-4 accent-amber-700 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <input value={p.nome} onChange={e => updateImportar(i, 'nome', e.target.value)}
                        className="font-medium text-gray-800 text-sm border-0 border-b border-dashed border-gray-300 focus:outline-none focus:border-amber-500 bg-transparent w-full" />
                      <p className="text-xs text-gray-400 mt-0.5">Comprado {p.vezes}× no histórico</p>
                    </div>
                    <select value={p.unidade} onChange={e => updateImportar(i, 'unidade', e.target.value)}
                      disabled={!p.selecionado}
                      className="border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 w-20">
                      {unidades.map(u => <option key={u}>{u}</option>)}
                    </select>
                    <select value={p.categoria} onChange={e => updateImportar(i, 'categoria', e.target.value)}
                      disabled={!p.selecionado}
                      className="border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 w-32">
                      {categorias.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>
                ))}
              </div>
              <div className="p-4 border-t bg-gray-50 flex gap-3">
                <button onClick={() => setImportando(false)} className="flex-1 border border-gray-300 text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-100">Cancelar</button>
                <button onClick={confirmarImportacao} disabled={loading || produtosImportar.filter(p => p.selecionado).length === 0}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
                  <Check className="w-4 h-4" /> Cadastrar {produtosImportar.filter(p => p.selecionado).length} produtos
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Formulário manual */}
      <div className="bg-white rounded-xl p-6 shadow-sm border">
        <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2"><Plus className="w-4 h-4" /> Adicionar produto manualmente</h2>
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

      {/* Lista de produtos */}
      {Object.entries(porCategoria).map(([cat, lista]) => (
        <div key={cat} className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
            <h3 className="font-semibold text-gray-700 text-sm">{labelCategoria[cat] || cat}</h3>
            <span className="text-xs text-gray-400 bg-gray-200 px-2 py-0.5 rounded-full">{lista.length}</span>
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
          <p className="text-xs mt-1">Use &quot;Importar do histórico&quot; para preencher automaticamente</p>
        </div>
      )}
    </div>
  )
}
