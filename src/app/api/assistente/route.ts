import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Quantidade de meses (incluindo o atual) que o assistente enxerga.
// Ex.: 3 = mês atual + 2 meses anteriores.
const MESES_HISTORICO = 3

export async function POST(req: NextRequest) {
  const { messages } = await req.json()
  const supabase = await createClient()

  const hoje = new Date()
  const inicioJanela = startOfMonth(subMonths(hoje, MESES_HISTORICO - 1)).toISOString().split('T')[0]
  const fimJanela = endOfMonth(hoje).toISOString().split('T')[0]
  const mesRefAtual = format(hoje, 'yyyy-MM')
  const mesesRef = Array.from({ length: MESES_HISTORICO }, (_, i) =>
    format(subMonths(hoje, MESES_HISTORICO - 1 - i), 'yyyy-MM')
  )

  const [
    { data: vendas },
    { data: compras },
    { data: producao },
    { data: custosFixos },
    { data: gastosPessoais },
    { data: metas },
    { data: estoqueMinimo },
  ] = await Promise.all([
    supabase.from('vendas').select('*').gte('data', inicioJanela).lte('data', fimJanela).order('data', { ascending: false }),
    supabase.from('compras').select('*, itens_compra(*)').gte('data', inicioJanela).lte('data', fimJanela).order('data', { ascending: false }),
    supabase.from('producao').select('*').gte('data', inicioJanela).lte('data', fimJanela).order('data', { ascending: false }),
    supabase.from('custos_fixos').select('*').in('mes_referencia', mesesRef),
    supabase.from('gastos_pessoais').select('*').gte('data', inicioJanela).lte('data', fimJanela),
    supabase.from('metas').select('*').in('mes_referencia', mesesRef),
    supabase.from('estoque_minimo').select('*'),
  ])

  const contexto = montarContexto({ vendas, compras, producao, custosFixos, gastosPessoais, metas, estoqueMinimo, mesesRef, mesRefAtual })

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: `Você é um assistente especialista em gestão de padarias e negócios alimentícios no Brasil.
Responda sempre em português brasileiro, de forma prática e objetiva.
Foque em sugestões concretas e acionáveis para melhorar o negócio.

Abaixo estão os dados reais da padaria, organizados por mês (mês mais recente = ${mesRefAtual}). Use esses números para embasar suas respostas — nunca invente valores que não estejam aqui. Se o usuário perguntar sobre um mês que não aparece listado abaixo, avise que você não tem esse histórico carregado em vez de supor.

${contexto}`,
    messages: messages.map((m: any) => ({ role: m.role, content: m.content }))
  })

  const content = response.content[0].type === 'text' ? response.content[0].text : ''
  return NextResponse.json({ content })
}

function montarContexto({ vendas, compras, producao, custosFixos, gastosPessoais, metas, estoqueMinimo, mesesRef, mesRefAtual }: any) {
  const listaVendas = vendas || []
  const listaCompras = compras || []
  const listaProducao = producao || []
  const listaCustosFixos = custosFixos || []
  const listaGastos = gastosPessoais || []
  const listaMetas = metas || []
  const listaEstoqueMinimo = estoqueMinimo || []

  const mesDe = (dataStr: string) => dataStr.slice(0, 7)

  const blocosPorMes = mesesRef.map((mesRef: string) => {
    const vendasMes = listaVendas.filter((v: any) => mesDe(v.data) === mesRef)
    const comprasMes = listaCompras.filter((c: any) => mesDe(c.data) === mesRef)
    const producaoMes = listaProducao.filter((p: any) => mesDe(p.data) === mesRef)
    const custosFixosMes = listaCustosFixos.filter((c: any) => c.mes_referencia === mesRef)
    const gastosMes = listaGastos.filter((g: any) => mesDe(g.data) === mesRef)
    const metaMes = listaMetas.find((m: any) => m.mes_referencia === mesRef)

    const totalVendas = vendasMes.reduce((s: number, v: any) => s + Number(v.total || 0), 0)
    const totalDinheiro = vendasMes.reduce((s: number, v: any) => s + Number(v.dinheiro || 0), 0)
    const totalDebito = vendasMes.reduce((s: number, v: any) => s + Number(v.debito || 0), 0)
    const totalCredito = vendasMes.reduce((s: number, v: any) => s + Number(v.credito || 0), 0)
    const totalPix = vendasMes.reduce((s: number, v: any) => s + Number(v.pix || 0), 0)
    const totalSaidas = vendasMes.reduce((s: number, v: any) => s + Number(v.saidas || 0), 0)

    const totalCompras = comprasMes.reduce((s: number, c: any) => {
      const itens = c.itens_compra || []
      return s + itens.reduce((si: number, it: any) => si + Number(it.total || 0), 0)
    }, 0)

    const totalProduzido = producaoMes.reduce((s: number, p: any) => s + Number(p.produzido || 0), 0)
    const totalDescartado = producaoMes.reduce((s: number, p: any) => s + Number(p.descartado || 0), 0)
    const pctDesperdicio = (totalProduzido + totalDescartado) > 0 ? (totalDescartado / (totalProduzido + totalDescartado)) * 100 : 0

    const totalCustosFixos = custosFixosMes.reduce((s: number, c: any) => s + Number(c.valor || 0), 0)
    const totalGastosPessoais = gastosMes.reduce((s: number, g: any) => s + Number(g.valor || 0), 0)

    const vendasPorDiaSemana: Record<string, number> = {}
    vendasMes.forEach((v: any) => {
      const dia = new Date(v.data + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long' })
      vendasPorDiaSemana[dia] = (vendasPorDiaSemana[dia] || 0) + Number(v.total || 0)
    })

    return `### ${mesRef}${mesRef === mesRefAtual ? ' (mês atual)' : ''}
VENDAS: Total R$ ${totalVendas.toFixed(2)} (${vendasMes.length} lançamentos) — Dinheiro R$ ${totalDinheiro.toFixed(2)}, Débito R$ ${totalDebito.toFixed(2)}, Crédito R$ ${totalCredito.toFixed(2)}, Pix R$ ${totalPix.toFixed(2)}. Saídas de caixa: R$ ${totalSaidas.toFixed(2)}.
Por dia da semana: ${Object.entries(vendasPorDiaSemana).map(([d, v]) => `${d}: R$ ${(v as number).toFixed(2)}`).join(', ') || 'sem dados'}
${metaMes ? `Meta de vendas: R$ ${Number(metaMes.meta_vendas).toFixed(2)} (${totalVendas > 0 ? ((totalVendas / Number(metaMes.meta_vendas)) * 100).toFixed(1) : '0.0'}% atingido)` : 'Sem meta de vendas cadastrada'}
COMPRAS: Total R$ ${totalCompras.toFixed(2)} (${comprasMes.length} compras)${metaMes ? `, meta: R$ ${Number(metaMes.meta_compras).toFixed(2)}` : ''}
PRODUÇÃO: ${totalProduzido} unidades produzidas, ${totalDescartado} descartadas (${pctDesperdicio.toFixed(1)}% de desperdício)${metaMes ? `, meta de desperdício: até ${metaMes.meta_desperdicio_pct}%` : ''}
CUSTOS: fixos R$ ${totalCustosFixos.toFixed(2)}, gastos pessoais R$ ${totalGastosPessoais.toFixed(2)}`
  })

  const itensBaixoEstoque = listaEstoqueMinimo.filter((e: any) => Number(e.quantidade_atual) <= Number(e.quantidade_minima))

  return `${blocosPorMes.join('\n\n')}

ESTOQUE (situação atual, não histórica):
${itensBaixoEstoque.length > 0 ? `Itens abaixo do mínimo: ${itensBaixoEstoque.map((e: any) => `${e.produto} (atual: ${e.quantidade_atual}, mínimo: ${e.quantidade_minima})`).join(', ')}` : 'Nenhum item abaixo do estoque mínimo'}`
}
