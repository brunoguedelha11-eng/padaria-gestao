'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react'
import MonthNav from '@/components/MonthNav'
import { exportToExcel } from '@/lib/exportExcel'
import { exportToPdf } from '@/lib/exportPdf'

const fmtMoeda = (v: number) => `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
const fmtData = (d: string) => d ? format(new Date(d + 'T12:00:00'), 'dd/MM/yyyy') : '-'

export default function ExportarPage() {
  const supabase = createClient()
  const [mes, setMes] = useState(new Date())
  const [loading, setLoading] = useState<'excel' | 'pdf' | null>(null)

  async function fetchTudo() {
    const inicio = startOfMonth(mes).toISOString().split('T')[0]
    const fim = endOfMonth(mes).toISOString().split('T')[0]
    const mesRef = format(mes, 'yyyy-MM')

    const [
      { data: vendas },
      { data: compras },
      { data: custosFixos },
      { data: custosVar },
      { data: gastosPessoais },
      { data: producao },
    ] = await Promise.all([
      supabase.from('vendas').select('*').gte('data', inicio).lte('data', fim).order('data'),
      supabase.from('compras').select('*, itens_compra(*)').gte('data', inicio).lte('data', fim).order('data'),
      supabase.from('custos_fixos').select('*').eq('mes_referencia', mesRef),
      supabase.from('custos_variaveis').select('*').gte('data', inicio).lte('data', fim).order('data'),
      supabase.from('gastos_pessoais').select('*').gte('data', inicio).lte('data', fim).order('data'),
      supabase.from('producao').select('*').gte('data', inicio).lte('data', fim).order('data'),
    ])

    return { vendas, compras, custosFixos, custosVar, gastosPessoais, producao }
  }

  async function handleExcel() {
    setLoading('excel')
    const { vendas, compras, custosFixos, custosVar, gastosPessoais, producao } = await fetchTudo()
    const periodo = format(mes, 'MMMM-yyyy')

    exportToExcel([
      {
        nome: 'Vendas',
        dados: (vendas || []).map(v => ({
          Data: fmtData(v.data), Dinheiro: v.dinheiro, Débito: v.debito, Crédito: v.credito,
          Pix: v.pix, Saídas: v.saidas, Total: v.total, Observações: v.obs || ''
        }))
      },
      {
        nome: 'Compras',
        dados: (compras || []).flatMap((c: any) => (c.itens_compra || []).map((i: any) => ({
          Data: fmtData(c.data), Fornecedor: c.fornecedor, Produto: i.produto,
          Quantidade: i.quantidade, Unidade: i.apresentacao,
          'Valor Unit.': i.valor_unitario, Total: i.total,
          Pagamento: c.forma_pagamento, Vencimento: c.data_vencimento ? fmtData(c.data_vencimento) : '-',
          Pago: c.pago ? 'Sim' : 'Não'
        })))
      },
      {
        nome: 'Custos Fixos',
        dados: (custosFixos || []).map(c => ({ Categoria: c.categoria, Descrição: c.descricao || '', Valor: c.valor }))
      },
      {
        nome: 'Custos Variáveis',
        dados: (custosVar || []).map(c => ({ Data: fmtData(c.data), Categoria: c.categoria, Descrição: c.descricao || '', Valor: c.valor }))
      },
      {
        nome: 'Gastos Pessoais',
        dados: (gastosPessoais || []).map(g => ({ Data: fmtData(g.data), Descrição: g.descricao, Valor: g.valor }))
      },
      {
        nome: 'Produção',
        dados: (producao || []).map(p => ({
          Data: fmtData(p.data), Produto: p.produto, Produzido: p.produzido,
          Descartado: p.descartado, 'Taxa (%)': p.produzido > 0 ? ((p.descartado / p.produzido) * 100).toFixed(1) : '0',
          'Custo Desperdício': p.custo_estimado
        }))
      },
    ], `padaria-gestao-${periodo}`)

    setLoading(null)
  }

  async function handlePdf() {
    setLoading('pdf')
    const { vendas, compras, custosFixos, custosVar, gastosPessoais, producao } = await fetchTudo()
    const periodo = format(mes, 'MMMM \'de\' yyyy', { locale: require('date-fns/locale/pt-BR').ptBR })

    const totalVendas = (vendas || []).reduce((s: number, v: any) => s + v.total, 0)
    const totalCompras = (compras || []).reduce((s: number, c: any) => s + (c.itens_compra || []).reduce((si: number, i: any) => si + Number(i.total), 0), 0)
    const totalCF = (custosFixos || []).reduce((s: number, c: any) => s + c.valor, 0)
    const totalCV = (custosVar || []).reduce((s: number, c: any) => s + c.valor, 0)
    const totalGP = (gastosPessoais || []).reduce((s: number, g: any) => s + g.valor, 0)
    const resultado = totalVendas - totalCompras - totalCF - totalCV - totalGP

    exportToPdf('Relatório Completo da Padaria', [
      {
        titulo: `Vendas — Total: ${fmtMoeda(totalVendas)}`,
        colunas: ['Data', 'Dinheiro', 'Débito', 'Crédito', 'Pix', 'Saídas', 'Total'],
        linhas: (vendas || []).map((v: any) => [fmtData(v.data), fmtMoeda(v.dinheiro), fmtMoeda(v.debito), fmtMoeda(v.credito), fmtMoeda(v.pix), fmtMoeda(v.saidas), fmtMoeda(v.total)]),
        total: `Total do mês: ${fmtMoeda(totalVendas)}`
      },
      {
        titulo: `Compras — Total: ${fmtMoeda(totalCompras)}`,
        colunas: ['Data', 'Fornecedor', 'Produto', 'Qtd', 'Un', 'Valor', 'Total', 'Pagamento', 'Pago'],
        linhas: (compras || []).flatMap((c: any) => (c.itens_compra || []).map((i: any) => [fmtData(c.data), c.fornecedor, i.produto, i.quantidade, i.apresentacao, fmtMoeda(i.valor_unitario), fmtMoeda(i.total), c.forma_pagamento, c.pago ? 'Sim' : 'Não'])),
        total: `Total do mês: ${fmtMoeda(totalCompras)}`
      },
      {
        titulo: `Custos Fixos — Total: ${fmtMoeda(totalCF)}`,
        colunas: ['Categoria', 'Descrição', 'Valor'],
        linhas: (custosFixos || []).map((c: any) => [c.categoria, c.descricao || '-', fmtMoeda(c.valor)]),
        total: `Total: ${fmtMoeda(totalCF)}`
      },
      {
        titulo: `Custos Variáveis — Total: ${fmtMoeda(totalCV)}`,
        colunas: ['Data', 'Categoria', 'Descrição', 'Valor'],
        linhas: (custosVar || []).map((c: any) => [fmtData(c.data), c.categoria, c.descricao || '-', fmtMoeda(c.valor)]),
        total: `Total: ${fmtMoeda(totalCV)}`
      },
      {
        titulo: `Gastos Pessoais — Total: ${fmtMoeda(totalGP)}`,
        colunas: ['Data', 'Descrição', 'Valor'],
        linhas: (gastosPessoais || []).map((g: any) => [fmtData(g.data), g.descricao, fmtMoeda(g.valor)]),
        total: `Total: ${fmtMoeda(totalGP)}`
      },
      {
        titulo: 'Produção e Desperdício',
        colunas: ['Data', 'Produto', 'Produzido', 'Descartado', 'Taxa %', 'Custo Desperdício'],
        linhas: (producao || []).map((p: any) => [fmtData(p.data), p.produto, p.produzido, p.descartado, p.produzido > 0 ? ((p.descartado / p.produzido) * 100).toFixed(1) + '%' : '0%', fmtMoeda(p.custo_estimado)]),
      },
      {
        titulo: 'Resultado do Mês',
        colunas: ['Item', 'Valor'],
        linhas: [
          ['Receita (vendas)', fmtMoeda(totalVendas)],
          ['Compras', `- ${fmtMoeda(totalCompras)}`],
          ['Custos fixos', `- ${fmtMoeda(totalCF)}`],
          ['Custos variáveis', `- ${fmtMoeda(totalCV)}`],
          ['Gastos pessoais', `- ${fmtMoeda(totalGP)}`],
        ],
        total: `Resultado líquido: ${fmtMoeda(resultado)}`
      },
    ], periodo)

    setLoading(null)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Download className="w-6 h-6 text-amber-700" />
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Exportar Dados</h1>
          <p className="text-sm text-gray-400">Baixe todas as informações da plataforma em PDF ou Excel</p>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
        💡 <strong>Dica:</strong> Exporte regularmente para ter um backup dos seus dados. O Excel é ideal para planilhas e o PDF para arquivo ou impressão.
      </div>

      <div className="bg-white rounded-xl p-5 shadow-sm border">
        <p className="text-sm font-medium text-gray-700 mb-3">Selecione o mês:</p>
        <MonthNav mes={mes} onChange={setMes} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl p-6 shadow-sm border text-center space-y-4">
          <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center mx-auto">
            <FileSpreadsheet className="w-7 h-7 text-green-700" />
          </div>
          <div>
            <h2 className="font-bold text-gray-800">Excel (.xlsx)</h2>
            <p className="text-xs text-gray-400 mt-1">Todas as abas: vendas, compras, custos, produção</p>
          </div>
          <button onClick={handleExcel} disabled={loading !== null}
            className="w-full bg-green-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {loading === 'excel' ? <><Loader2 className="w-4 h-4 animate-spin" /> Gerando...</> : <><Download className="w-4 h-4" /> Baixar Excel</>}
          </button>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border text-center space-y-4">
          <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mx-auto">
            <FileText className="w-7 h-7 text-red-700" />
          </div>
          <div>
            <h2 className="font-bold text-gray-800">PDF</h2>
            <p className="text-xs text-gray-400 mt-1">Relatório completo formatado para impressão</p>
          </div>
          <button onClick={handlePdf} disabled={loading !== null}
            className="w-full bg-red-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {loading === 'pdf' ? <><Loader2 className="w-4 h-4 animate-spin" /> Gerando...</> : <><Download className="w-4 h-4" /> Baixar PDF</>}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl p-5 shadow-sm border">
        <h3 className="font-semibold text-gray-800 text-sm mb-3">O que está incluído na exportação:</h3>
        <ul className="space-y-1.5 text-sm text-gray-600">
          {[
            'Vendas diárias (dinheiro, débito, crédito, pix, saídas)',
            'Compras com itens, fornecedor, forma de pagamento e status',
            'Custos fixos e variáveis',
            'Gastos pessoais',
            'Produção e desperdício',
            'Resultado líquido do mês',
          ].map(item => (
            <li key={item} className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
