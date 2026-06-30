'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Wallet, Check, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'
import { format, startOfMonth, endOfMonth, subDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface FechamentoCaixa {
  id: string
  data: string
  total_vendas: number
  total_compras: number
  total_custos: number
  valor_fisico: number | null
  diferenca: number | null
  observacoes: string
  fechado_em: string
}

const hoje = format(new Date(), 'yyyy-MM-dd')

export default function CaixaPage() {
  const supabase = createClient()
  const [totalVendas, setTotalVendas] = useState(0)
  const [totalCompras, setTotalCompras] = useState(0)
  const [totalCustos, setTotalCustos] = useState(0)
  const [vendas, setVendas] = useState<any[]>([])
  const [fechamentos, setFechamentos] = useState<FechamentoCaixa[]>([])
  const [jaFechou, setJaFechou] = useState(false)
  const [fechamentoHoje, setFechamentoHoje] = useState<FechamentoCaixa | null>(null)
  const [expandido, setExpandido] = useState<string | null>(null)

  const [valorFisico, setValorFisico] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    const inicioMes = startOfMonth(new Date()).toISOString().split('T')[0]
    const fimMes = endOfMonth(new Date()).toISOString().split('T')[0]
    const mesAtual = format(new Date(), 'yyyy-MM')

    const [{ data: v }, { data: comp }, { data: cf }, { data: cv }, { data: fech }] = await Promise.all([
      supabase.from('vendas').select('*').eq('data', hoje),
      supabase.from('itens_compra').select('total, compras(data, pago)').eq('compras.data', hoje).eq('compras.pago', true),
      supabase.from('custos_variaveis').select('valor').eq('data', hoje),
      supabase.from('custos_fixos').select('valor').eq('mes_referencia', mesAtual),
      supabase.from('caixa_diario').select('*').order('data', { ascending: false }).limit(30),
    ])

    const tvend = (v || []).reduce((s: number, vv: any) => s + vv.total, 0)
    const tcomp = (comp || []).reduce((s: number, c: any) => s + Number(c.total), 0)
    const tcv = (cf || []).reduce((s: number, c: any) => s + c.valor, 0)
    // Rateio dos custos fixos do mês pelo número de dias úteis (aproximado: 26 dias)
    const tcf = (cv || []).reduce((s: number, c: any) => s + c.valor, 0) / 26

    setVendas(v || [])
    setTotalVendas(tvend)
    setTotalCompras(tcomp)
    setTotalCustos(tcv + tcf)
    setFechamentos(fech || [])

    const fechHoje = (fech || []).find((f: FechamentoCaixa) => f.data === hoje)
    setJaFechou(!!fechHoje)
    setFechamentoHoje(fechHoje || null)
  }

  async function fecharCaixa(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const vf = parseFloat(valorFisico)
    const resultadoEsperado = totalVendas - totalCompras - totalCustos
    const diferenca = vf - resultadoEsperado

    await supabase.from('caixa_diario').upsert({
      data: hoje,
      total_vendas: totalVendas,
      total_compras: totalCompras,
      total_custos: totalCustos,
      valor_fisico: vf,
      diferenca,
      observacoes,
      fechado_em: new Date().toISOString()
    }, { onConflict: 'data' })

    setLoading(false)
    fetchData()
  }

  const resultadoEsperado = totalVendas - totalCompras - totalCustos
  const vf = parseFloat(valorFisico) || 0
  const diferenca = vf > 0 ? vf - resultadoEsperado : null
  const fmt = (v: number) => `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
  const diaNome = format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Wallet className="w-6 h-6 text-amber-700" />
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Fechamento do Caixa</h1>
          <p className="text-sm text-gray-400 capitalize">{diaNome}</p>
        </div>
      </div>

      {/* Resumo do dia */}
      <div className="bg-white rounded-xl p-5 shadow-sm border">
        <h2 className="font-semibold text-gray-800 mb-4 text-sm">Movimento de hoje</h2>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Total de vendas</span>
            <span className="font-bold text-green-600">{fmt(totalVendas)}</span>
          </div>

          {/* Detalhamento das vendas */}
          {vendas.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500 grid grid-cols-4 gap-2">
              <div className="text-center"><p>Dinheiro</p><p className="font-bold text-gray-700">{fmt(vendas.reduce((s, v) => s + v.dinheiro, 0))}</p></div>
              <div className="text-center"><p>Débito</p><p className="font-bold text-gray-700">{fmt(vendas.reduce((s, v) => s + v.debito, 0))}</p></div>
              <div className="text-center"><p>Crédito</p><p className="font-bold text-gray-700">{fmt(vendas.reduce((s, v) => s + v.credito, 0))}</p></div>
              <div className="text-center"><p>Pix</p><p className="font-bold text-gray-700">{fmt(vendas.reduce((s, v) => s + v.pix, 0))}</p></div>
            </div>
          )}

          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Compras pagas hoje</span>
            <span className="font-bold text-orange-600">- {fmt(totalCompras)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Custos variáveis + rateio fixo</span>
            <span className="font-bold text-red-600">- {fmt(totalCustos)}</span>
          </div>
          <div className="flex justify-between items-center border-t pt-3">
            <span className="font-semibold text-gray-800">Resultado esperado</span>
            <span className={`font-bold text-lg ${resultadoEsperado >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmt(resultadoEsperado)}</span>
          </div>
        </div>
      </div>

      {/* Fechamento */}
      {jaFechou && fechamentoHoje ? (
        <div className={`rounded-xl p-5 border ${fechamentoHoje.diferenca !== null && Math.abs(fechamentoHoje.diferenca) > 1 ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'}`}>
          <div className="flex items-center gap-2 mb-3">
            <Check className="w-5 h-5 text-green-600" />
            <h2 className="font-semibold text-green-800">Caixa fechado hoje às {format(new Date(fechamentoHoje.fechado_em), 'HH:mm')}</h2>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><p className="text-xs text-gray-500">Valor físico contado</p><p className="font-bold text-gray-800">{fmt(fechamentoHoje.valor_fisico || 0)}</p></div>
            <div>
              <p className="text-xs text-gray-500">Diferença</p>
              <p className={`font-bold ${(fechamentoHoje.diferenca || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {(fechamentoHoje.diferenca || 0) >= 0 ? '+' : ''}{fmt(fechamentoHoje.diferenca || 0)}
              </p>
            </div>
          </div>
          {fechamentoHoje.observacoes && <p className="text-xs text-gray-500 mt-2 italic">"{fechamentoHoje.observacoes}"</p>}
          {fechamentoHoje.diferenca !== null && Math.abs(fechamentoHoje.diferenca) > 1 && (
            <div className="mt-3 flex items-start gap-2 text-yellow-800 text-xs">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>Há uma diferença no caixa. Verifique se alguma venda ou gasto não foi lançado.</span>
            </div>
          )}
          <button onClick={() => setJaFechou(false)} className="mt-3 text-xs text-gray-400 hover:text-gray-600 underline">Refazer fechamento</button>
        </div>
      ) : (
        <div className="bg-white rounded-xl p-5 shadow-sm border">
          <h2 className="font-semibold text-gray-800 mb-4 text-sm">Conferência do caixa físico</h2>
          <form onSubmit={fecharCaixa} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Quanto você tem fisicamente no caixa agora? (R$)</label>
              <p className="text-xs text-gray-400 mb-1">Some o dinheiro em espécie + valor recebido em débito/pix/crédito do dia</p>
              <input type="number" step="0.01" value={valorFisico} onChange={e => setValorFisico(e.target.value)} required
                placeholder="Ex: 1250,00"
                className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>

            {diferenca !== null && (
              <div className={`rounded-lg p-3 text-sm font-medium flex items-center gap-2 ${Math.abs(diferenca) <= 0.5 ? 'bg-green-50 text-green-700' : diferenca > 0 ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-700'}`}>
                {Math.abs(diferenca) <= 0.5
                  ? <><Check className="w-4 h-4" /> Caixa conferido! Sem diferença significativa.</>
                  : diferenca > 0
                  ? <><AlertTriangle className="w-4 h-4" /> Sobra de {fmt(diferenca)} — verifique se algum gasto não foi lançado.</>
                  : <><AlertTriangle className="w-4 h-4" /> Falta {fmt(Math.abs(diferenca))} — verifique se alguma venda não foi lançada.</>
                }
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-gray-700">Observações (opcional)</label>
              <input value={observacoes} onChange={e => setObservacoes(e.target.value)}
                placeholder="Ex: Troco dado, dinheiro separado para compra amanhã..."
                className="w-full border rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>

            <button type="submit" disabled={loading}
              className="w-full bg-amber-700 text-white py-3 rounded-lg text-sm font-medium hover:bg-amber-800 disabled:opacity-50">
              {loading ? 'Fechando...' : 'Fechar caixa do dia'}
            </button>
          </form>
        </div>
      )}

      {/* Histórico de fechamentos */}
      {fechamentos.filter(f => f.data !== hoje).length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="p-4 border-b">
            <h2 className="font-semibold text-gray-800 text-sm">Histórico de fechamentos</h2>
          </div>
          <div className="divide-y">
            {fechamentos.filter(f => f.data !== hoje).map(f => {
              const aberto = expandido === f.id
              const temDiferenca = f.diferenca !== null && Math.abs(f.diferenca) > 1
              return (
                <div key={f.id}>
                  <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                    onClick={() => setExpandido(aberto ? null : f.id)}>
                    <div className="flex items-center gap-3">
                      {aberto ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                      <div>
                        <p className="text-sm font-medium text-gray-800 capitalize">{format(new Date(f.data + 'T12:00:00'), "EEEE, dd/MM/yyyy", { locale: ptBR })}</p>
                        {temDiferenca && <p className="text-xs text-yellow-600">Diferença de {fmt(Math.abs(f.diferenca || 0))}</p>}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-green-600">{fmt(f.total_vendas)}</p>
                      <p className="text-xs text-gray-400">vendas</p>
                    </div>
                  </div>
                  {aberto && (
                    <div className="px-4 pb-4 pt-0 grid grid-cols-2 gap-3 text-sm">
                      <div><p className="text-xs text-gray-500">Vendas</p><p className="font-bold text-green-600">{fmt(f.total_vendas)}</p></div>
                      <div><p className="text-xs text-gray-500">Compras</p><p className="font-bold text-orange-600">{fmt(f.total_compras)}</p></div>
                      <div><p className="text-xs text-gray-500">Valor físico</p><p className="font-bold">{f.valor_fisico !== null ? fmt(f.valor_fisico) : '—'}</p></div>
                      <div><p className="text-xs text-gray-500">Diferença</p><p className={`font-bold ${(f.diferenca || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>{f.diferenca !== null ? fmt(f.diferenca) : '—'}</p></div>
                      {f.observacoes && <p className="col-span-2 text-xs text-gray-400 italic">"{f.observacoes}"</p>}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
