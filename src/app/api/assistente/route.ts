import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { startOfMonth, endOfMonth, format } from 'date-fns'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const { messages } = await req.json()
  const supabase = await createClient()

  const hoje = new Date()
  const inicioMes = startOfMonth(hoje).toISOString().split('T')[0]
  const fimMes = endOfMonth(hoje).toISOString().split('T')[0]
  const mesRef = format(hoje, 'yyyy-MM')

  const [
    { data: vendas },
    { data: compras },
    { data: producao },
    { data: custosFixos },
    { data: gastosPessoais },
    { data: meta },
    { data: estoqueMinimo },
  ] = await Promise.all([
    supabase.from('vendas').select('*').gte('data', inicioMes).lte('data', fimMes).order('data', { ascending: false }),
    supabase.from('compras').select('*, itens_compra(*)').gte('data', inicioMes).lte('data', fimMes).order('data', { ascending: false }),
    supabase.from('producao').select('*').gte('data', inicioMes).lte('data', fimMes).order('data', { ascending: false }),
    supabase.from('custos_fixos').select('*').eq('mes_referencia', mesRef),
    supabase.from('gastos_pessoais').select('*').gte('data', inicioMes).lte('data', fimMes),
    supabase.from('metas').select('*').eq('mes_referencia', mesRef).single(),
    supabase.from('estoque_minimo').select('*'),
  ])

  const contexto = montarContexto({ vendas, compras, producao, custosFixos, gastosPessoais, meta, estoqueMinimo, mesRef })

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: `Você é um assistente especialista em gestão de padarias e negócios alimentícios no Brasil.
Responda sempre em português brasileiro, de forma prática e objetiva.
Foque em sugestões concretas e acionáveis para melhorar o negócio.

Abaixo estão os dados reais da padaria referentes ao mês atual (${mesRef}). Use esses números para embasar suas respostas — nunca invente valores que não estejam aqui. Se faltar algum dado para responder com precisão, diga isso ao usuário em vez de supor.

${contexto}`,
    messages: messages.map((m: any) => ({ role: m.role, content: m.content }))
  })

  const content = response.content[0].type === 'text' ? response.content[0].text : ''
  return NextResponse.json({ content })
}

function montarContexto({ vendas, compras, producao, custosFixos, gastosPessoais, meta, estoqueMinimo, mesRef }: any) {
  const listaVendas = vendas || []
  const listaCompras = compras || []
  const listaProducao = producao || []
  const listaCustosFixos = custosFixos || []
  const listaGastos = gastosPessoais || []
  const listaEstoqueMinimo = estoqueMinimo || []

  const totalVendas = listaVendas.reduce((s: number, v: any) => s + Number(v.total || 0), 0)
  const totalDinheiro = listaVendas.reduce((s: number, v: any) => s + Number(v.dinheiro || 0), 0)
  const totalDebito = listaVendas.reduce((s: number, v: any) => s + Number(v.debito || 0), 0)
  const totalCredito = listaVendas.reduce((s: number, v: any) => s + Number(v.credito || 0), 0)
  const totalPix = listaVendas.reduce((s: number, v: any) => s + Number(v.pix || 0), 0)
  const totalSaidas = listaVendas.reduce((s: number, v: any) => s + Number(v.saidas || 0), 0)

  const totalCompras = listaCompras.reduce((s: number, c: any) => {
    const itens = c.itens_compra || []
    return s + itens.reduce((si: number, it: any) => si + Number(it.total || 0), 0)
  }, 0)

  const totalProduzido = listaProducao.reduce((s: number, p: any) => s + Number(p.produzido || 0), 0)
  const totalDescartado = listaProducao.reduce((s: number, p: any) => s + Number(p.descartado || 0), 0)
  const pctDesperdicio = (totalProduzido + totalDescartado) > 0 ? (totalDescartado / (totalProduzido + totalDescartado)) * 100 : 0

  const totalCustosFixos = listaCustosFixos.reduce((s: number, c: any) => s + Number(c.valor || 0), 0)
  const totalGastosPessoais = listaGastos.reduce((s: number, g: any) => s + Number(g.valor || 0), 0)

  const itensBaixoEstoque = listaEstoqueMinimo.filter((e: any) => Number(e.quantidade_atual) <= Number(e.quantidade_minima))

  const vendasPorDiaSemana: Record<string, number> = {}
  listaVendas.forEach((v: any) => {
    const dia = new Date(v.data + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long' })
    vendasPorDiaSemana[dia] = (vendasPorDiaSemana[dia] || 0) + Number(v.total || 0)
  })

  return `
VENDAS (${mesRef}):
- Total do mês: R$ ${totalVendas.toFixed(2)} (${listaVendas.length} lançamentos)
- Por forma de pagamento: Dinheiro R$ ${totalDinheiro.toFixed(2)}, Débito R$ ${totalDebito.toFixed(2)}, Crédito R$ ${totalCredito.toFixed(2)}, Pix R$ ${totalPix.toFixed(2)}
- Saídas de caixa no mês: R$ ${totalSaidas.toFixed(2)}
- Vendas por dia da semana: ${Object.entries(vendasPorDiaSemana).map(([d, v]) => `${d}: R$ ${(v as number).toFixed(2)}`).join(', ') || 'sem dados'}
${meta ? `- Meta de vendas do mês: R$ ${Number(meta.meta_vendas).toFixed(2)} (${((totalVendas / Number(meta.meta_vendas)) * 100).toFixed(1)}% atingido)` : '- Nenhuma meta de vendas definida para este mês'}

COMPRAS (${mesRef}):
- Total gasto em compras: R$ ${totalCompras.toFixed(2)} (${listaCompras.length} compras)
${meta ? `- Meta de compras do mês: R$ ${Number(meta.meta_compras).toFixed(2)}` : ''}

PRODUÇÃO E DESPERDÍCIO (${mesRef}):
- Total produzido: ${totalProduzido} unidades
- Total descartado: ${totalDescartado} unidades
- Percentual de desperdício: ${pctDesperdicio.toFixed(1)}%
${meta ? `- Meta de desperdício: até ${meta.meta_desperdicio_pct}%` : ''}

CUSTOS (${mesRef}):
- Custos fixos do mês: R$ ${totalCustosFixos.toFixed(2)}
- Gastos pessoais do mês: R$ ${totalGastosPessoais.toFixed(2)}

ESTOQUE:
${itensBaixoEstoque.length > 0 ? `- Itens abaixo do mínimo: ${itensBaixoEstoque.map((e: any) => `${e.produto} (atual: ${e.quantidade_atual}, mínimo: ${e.quantidade_minima})`).join(', ')}` : '- Nenhum item abaixo do estoque mínimo'}
`.trim()
}
