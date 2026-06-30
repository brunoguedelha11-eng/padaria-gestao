interface SecaoPdf {
  titulo: string
  colunas: string[]
  linhas: (string | number)[][]
  total?: string
}

export function exportToPdf(titulo: string, secoes: SecaoPdf[], periodo: string) {
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>${titulo}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #333; padding: 24px; }
  h1 { font-size: 18px; color: #78350f; margin-bottom: 4px; }
  .periodo { font-size: 12px; color: #888; margin-bottom: 24px; }
  .secao { margin-bottom: 28px; page-break-inside: avoid; }
  h2 { font-size: 13px; color: #78350f; border-bottom: 2px solid #78350f; padding-bottom: 4px; margin-bottom: 10px; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #78350f; color: white; padding: 6px 8px; text-align: left; font-size: 10px; }
  td { padding: 5px 8px; border-bottom: 1px solid #eee; }
  tr:nth-child(even) td { background: #fef3c7; }
  .total { font-weight: bold; background: #fef3c7; padding: 6px 8px; text-align: right; border-top: 2px solid #78350f; margin-top: 4px; }
  .footer { margin-top: 32px; font-size: 10px; color: #aaa; text-align: right; }
  @media print { body { padding: 12px; } }
</style>
</head>
<body>
<h1>🍞 ${titulo}</h1>
<p class="periodo">${periodo} · Exportado em ${new Date().toLocaleString('pt-BR')}</p>
${secoes.map(s => `
<div class="secao">
  <h2>${s.titulo}</h2>
  <table>
    <thead><tr>${s.colunas.map(c => `<th>${c}</th>`).join('')}</tr></thead>
    <tbody>${s.linhas.map(l => `<tr>${l.map(v => `<td>${v ?? '-'}</td>`).join('')}</tr>`).join('')}</tbody>
  </table>
  ${s.total ? `<div class="total">${s.total}</div>` : ''}
</div>`).join('')}
<div class="footer">Gestão Padaria · padaria-gestao-delta.vercel.app</div>
</body>
</html>`

  const w = window.open('', '_blank')
  if (!w) { alert('Permita pop-ups para exportar PDF'); return }
  w.document.write(html)
  w.document.close()
  w.focus()
  setTimeout(() => { w.print(); w.close() }, 500)
}
