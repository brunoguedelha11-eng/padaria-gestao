export interface ChartData {
  vendasPorDia: { label: string; valor: number }[]
  formasPagamento: { label: string; valor: number; cor: string }[]
  resumo: { totalVendas: number; totalCompras: number; totalCustos: number; resultado: number }
}

export interface SecaoPdf {
  titulo: string
  colunas: string[]
  linhas: (string | number)[][]
  total?: string
}

function fmtR(v: number) {
  return `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
}

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function barChartSvg(data: { label: string; valor: number }[], width = 820, height = 200): string {
  if (data.length === 0) return '<p style="text-align:center;color:#9ca3af;font-size:12px;padding:20px">Sem dados no período</p>'
  const max = Math.max(...data.map(d => d.valor), 1)
  const padL = 70, padB = 28, padT = 10, padR = 10
  const chartW = width - padL - padR
  const chartH = height - padB - padT
  const barGap = chartW / data.length
  const barW = Math.max(4, barGap - 4)

  const gridLines = [0, 0.25, 0.5, 0.75, 1].map(pct => {
    const val = pct * max
    const y = padT + chartH - pct * chartH
    const label = val >= 1000 ? `R$${(val / 1000).toFixed(1)}k` : `R$${val.toFixed(0)}`
    return `<line x1="${padL}" y1="${y.toFixed(1)}" x2="${width - padR}" y2="${y.toFixed(1)}" stroke="#e5e7eb" stroke-width="1"/>
    <text x="${padL - 5}" y="${(y + 4).toFixed(1)}" text-anchor="end" font-size="9" fill="#6b7280">${label}</text>`
  }).join('')

  const bars = data.map((d, i) => {
    const barH = Math.max(2, (d.valor / max) * chartH)
    const x = padL + i * barGap + (barGap - barW) / 2
    const y = padT + chartH - barH
    return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${barH.toFixed(1)}" rx="3" fill="#b45309"/>`
  }).join('')

  const step = data.length > 20 ? 5 : data.length > 14 ? 3 : data.length > 7 ? 2 : 1
  const xLabels = data.map((d, i) => {
    if (i % step !== 0) return ''
    const x = padL + i * barGap + barGap / 2
    return `<text x="${x.toFixed(1)}" y="${height - 5}" text-anchor="middle" font-size="9" fill="#6b7280">${d.label}</text>`
  }).join('')

  return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    ${gridLines}${bars}${xLabels}
    <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${padT + chartH}" stroke="#d1d5db" stroke-width="1"/>
    <line x1="${padL}" y1="${padT + chartH}" x2="${width - padR}" y2="${padT + chartH}" stroke="#d1d5db" stroke-width="1"/>
  </svg>`
}

function donutChartSvg(data: { label: string; valor: number; cor: string }[]): string {
  const total = data.reduce((s, d) => s + d.valor, 0)
  if (total === 0) return '<p style="text-align:center;color:#9ca3af;font-size:12px;padding:20px">Sem dados no período</p>'

  const cx = 110, cy = 110, r = 85, ri = 52
  let angle = -90
  const slices = data.filter(d => d.valor > 0).map(d => {
    const sweep = (d.valor / total) * 360
    const start = angle
    const end = angle + sweep
    const op1 = polar(cx, cy, r, start)
    const op2 = polar(cx, cy, r, end)
    const ip1 = polar(cx, cy, ri, end)
    const ip2 = polar(cx, cy, ri, start)
    const lg = sweep > 180 ? 1 : 0
    const path = `M${op1.x.toFixed(2)},${op1.y.toFixed(2)} A${r},${r} 0 ${lg},1 ${op2.x.toFixed(2)},${op2.y.toFixed(2)} L${ip1.x.toFixed(2)},${ip1.y.toFixed(2)} A${ri},${ri} 0 ${lg},0 ${ip2.x.toFixed(2)},${ip2.y.toFixed(2)} Z`
    angle = end
    return { path, cor: d.cor, label: d.label, pct: (d.valor / total * 100).toFixed(1), val: d.valor }
  })

  const legend = slices.map((s, i) => {
    const y = 40 + i * 28
    return `<rect x="230" y="${y}" width="14" height="14" rx="3" fill="${s.cor}"/>
    <text x="250" y="${y + 11}" font-size="11" fill="#374151" font-weight="600">${s.label}</text>
    <text x="250" y="${y + 24}" font-size="10" fill="#6b7280">${fmtR(s.val)} (${s.pct}%)</text>`
  }).join('')

  return `<svg width="420" height="220" xmlns="http://www.w3.org/2000/svg">
    ${slices.map(s => `<path d="${s.path}" fill="${s.cor}" stroke="white" stroke-width="3"/>`).join('')}
    <circle cx="${cx}" cy="${cy}" r="35" fill="white"/>
    <text x="${cx}" y="${cy - 6}" text-anchor="middle" font-size="10" fill="#6b7280">Total</text>
    <text x="${cx}" y="${cy + 10}" text-anchor="middle" font-size="11" font-weight="700" fill="#1f2937">${fmtR(total)}</text>
    ${legend}
  </svg>`
}

export function exportToPdf(titulo: string, secoes: SecaoPdf[], periodo: string, chartData?: ChartData) {
  const hasChart = chartData && chartData.vendasPorDia.length > 0

  const resumoHtml = chartData ? (() => {
    const { totalVendas, totalCompras, totalCustos, resultado } = chartData.resumo
    const positivo = resultado >= 0
    return `
    <div class="resumo-cards">
      <div class="card card-green">
        <p class="card-label">Receita de Vendas</p>
        <p class="card-value">${fmtR(totalVendas)}</p>
      </div>
      <div class="card card-orange">
        <p class="card-label">Total de Compras</p>
        <p class="card-value">${fmtR(totalCompras)}</p>
      </div>
      <div class="card card-red">
        <p class="card-label">Custos do Mês</p>
        <p class="card-value">${fmtR(totalCustos)}</p>
      </div>
      <div class="card ${positivo ? 'card-resultado-pos' : 'card-resultado-neg'}">
        <p class="card-label">Resultado Líquido</p>
        <p class="card-value">${fmtR(resultado)}</p>
      </div>
    </div>`
  })() : ''

  const chartsHtml = hasChart ? `
    <div class="secao">
      <div class="secao-titulo">📊 Vendas diárias — ${periodo}</div>
      <div class="chart-wrap">${barChartSvg(chartData.vendasPorDia)}</div>
    </div>
    <div class="secao dois-col">
      <div class="chart-half">
        <div class="secao-titulo">💳 Formas de pagamento</div>
        <div class="chart-wrap">${donutChartSvg(chartData.formasPagamento)}</div>
      </div>
    </div>
  ` : ''

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>${titulo} — ${periodo}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #1f2937; background: #f3f4f6; }
  .page { max-width: 980px; margin: 0 auto; padding: 28px 24px; }

  /* Cabeçalho */
  .header { background: linear-gradient(135deg, #78350f 0%, #92400e 50%, #b45309 100%); color: white; border-radius: 14px; padding: 26px 30px; margin-bottom: 24px; display: flex; align-items: center; justify-content: space-between; }
  .header-left h1 { font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
  .header-left p { font-size: 12px; color: #fde68a; margin-top: 5px; }
  .header-right .periodo { font-size: 16px; font-weight: 700; color: #fef3c7; text-transform: capitalize; }
  .header-right .exportado { font-size: 10px; color: #d97706; margin-top: 3px; }

  /* Cards de resumo */
  .resumo-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
  .card { border-radius: 10px; padding: 14px 16px; }
  .card-label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; opacity: 0.8; }
  .card-value { font-size: 16px; font-weight: 800; }
  .card-green { background: #dcfce7; color: #15803d; }
  .card-orange { background: #fff7ed; color: #c2410c; }
  .card-red { background: #fef2f2; color: #b91c1c; }
  .card-resultado-pos { background: #1d4ed8; color: white; }
  .card-resultado-neg { background: #dc2626; color: white; }

  /* Seções */
  .secao { background: white; border-radius: 10px; border: 1px solid #e5e7eb; margin-bottom: 18px; overflow: hidden; page-break-inside: avoid; }
  .secao-titulo { background: linear-gradient(90deg, #fef3c7, #fffbeb); border-bottom: 2px solid #b45309; padding: 10px 16px; font-size: 12px; font-weight: 700; color: #78350f; display: flex; align-items: center; gap: 8px; }

  /* Charts */
  .chart-wrap { padding: 16px 12px 8px; overflow: hidden; }
  .dois-col { display: grid; grid-template-columns: 1fr 1fr; gap: 0; }
  .chart-half { border-right: 1px solid #f3f4f6; }
  .chart-half:last-child { border-right: none; }

  /* Tabelas */
  table { width: 100%; border-collapse: collapse; }
  thead tr { background: linear-gradient(90deg, #78350f, #92400e); }
  th { padding: 8px 12px; text-align: left; font-size: 10px; font-weight: 600; color: white; letter-spacing: 0.5px; text-transform: uppercase; }
  td { padding: 7px 12px; border-bottom: 1px solid #f3f4f6; color: #374151; }
  tbody tr:last-child td { border-bottom: none; }
  tbody tr:nth-child(even) td { background: #fffbeb; }
  .total-row { background: #fef3c7; border-top: 2px solid #b45309; padding: 10px 16px; text-align: right; font-size: 13px; font-weight: 800; color: #78350f; }
  .vazio { padding: 24px; text-align: center; color: #9ca3af; font-size: 11px; }

  /* Footer */
  .footer { margin-top: 24px; padding-top: 14px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; }
  .footer-logo { font-weight: 800; color: #78350f; font-size: 13px; }
  .footer-info { font-size: 10px; color: #9ca3af; }

  @media print {
    body { background: white; }
    .page { padding: 12px; }
    .secao, .header, .resumo-cards { page-break-inside: avoid; }
    .header, thead tr, tbody tr:nth-child(even) td, .secao-titulo, .total-row, .card { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="header-left">
      <h1>🍞 ${titulo}</h1>
      <p>Relatório gerado automaticamente pela plataforma de gestão</p>
    </div>
    <div class="header-right">
      <div class="periodo">${periodo}</div>
      <div class="exportado">Exportado em ${new Date().toLocaleString('pt-BR')}</div>
    </div>
  </div>

  ${resumoHtml}
  ${chartsHtml}

  ${secoes.map(s => `
  <div class="secao">
    <div class="secao-titulo">${s.titulo}</div>
    ${s.linhas.length === 0
      ? `<div class="vazio">Nenhum dado registrado neste período</div>`
      : `<table>
      <thead><tr>${s.colunas.map(c => `<th>${c}</th>`).join('')}</tr></thead>
      <tbody>${s.linhas.map(l => `<tr>${l.map(v => `<td>${v !== null && v !== undefined && v !== '' ? v : '—'}</td>`).join('')}</tr>`).join('')}</tbody>
    </table>
    ${s.total ? `<div class="total-row">${s.total}</div>` : ''}`}
  </div>`).join('')}

  <div class="footer">
    <div class="footer-logo">🍞 Gestão Padaria</div>
    <div class="footer-info">padaria-gestao-delta.vercel.app &nbsp;·&nbsp; ${new Date().toLocaleDateString('pt-BR')}</div>
  </div>
</div>
</body>
</html>`

  const w = window.open('', '_blank')
  if (!w) { alert('Permita pop-ups para exportar PDF'); return }
  w.document.write(html)
  w.document.close()
  w.focus()
  setTimeout(() => { w.print(); w.close() }, 800)
}
