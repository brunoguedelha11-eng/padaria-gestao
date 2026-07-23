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
<title>${titulo} — ${periodo}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #1f2937; background: #f9fafb; }

  .page { max-width: 960px; margin: 0 auto; padding: 32px 24px; }

  /* Cabeçalho */
  .header { background: linear-gradient(135deg, #78350f 0%, #92400e 100%); color: white; border-radius: 12px; padding: 24px 28px; margin-bottom: 28px; display: flex; align-items: center; justify-content: space-between; }
  .header-left h1 { font-size: 20px; font-weight: 700; letter-spacing: -0.3px; }
  .header-left p { font-size: 12px; color: #fde68a; margin-top: 4px; }
  .header-right { text-align: right; }
  .header-right .periodo { font-size: 14px; font-weight: 600; color: #fef3c7; text-transform: capitalize; }
  .header-right .exportado { font-size: 10px; color: #d97706; margin-top: 2px; }

  /* Seções */
  .secao { background: white; border-radius: 10px; border: 1px solid #e5e7eb; margin-bottom: 20px; overflow: hidden; page-break-inside: avoid; }
  .secao-titulo { background: #fef3c7; border-bottom: 2px solid #78350f; padding: 10px 16px; font-size: 12px; font-weight: 700; color: #78350f; display: flex; align-items: center; gap: 8px; }
  .secao-titulo::before { content: ''; display: inline-block; width: 4px; height: 14px; background: #78350f; border-radius: 2px; }

  /* Tabelas */
  table { width: 100%; border-collapse: collapse; }
  thead tr { background: #78350f; }
  th { padding: 8px 12px; text-align: left; font-size: 10px; font-weight: 600; color: white; letter-spacing: 0.5px; text-transform: uppercase; }
  td { padding: 7px 12px; border-bottom: 1px solid #f3f4f6; color: #374151; }
  tbody tr:last-child td { border-bottom: none; }
  tbody tr:nth-child(even) td { background: #fffbeb; }
  tbody tr:hover td { background: #fef9c3; }

  /* Total */
  .total-row { background: #fef3c7; border-top: 2px solid #78350f; padding: 10px 16px; text-align: right; font-size: 12px; font-weight: 700; color: #78350f; }

  /* Vazio */
  .vazio { padding: 20px; text-align: center; color: #9ca3af; font-size: 11px; }

  /* Footer */
  .footer { margin-top: 28px; padding-top: 16px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; }
  .footer-logo { font-weight: 700; color: #78350f; font-size: 12px; }
  .footer-info { font-size: 10px; color: #9ca3af; }

  @media print {
    body { background: white; }
    .page { padding: 16px; }
    .secao { page-break-inside: avoid; }
    .header { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    thead tr { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    tbody tr:nth-child(even) td { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .secao-titulo { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .total-row { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="header-left">
      <h1>🍞 ${titulo}</h1>
      <p>Relatório gerado automaticamente pela plataforma</p>
    </div>
    <div class="header-right">
      <div class="periodo">${periodo}</div>
      <div class="exportado">Exportado em ${new Date().toLocaleString('pt-BR')}</div>
    </div>
  </div>

  ${secoes.map(s => `
  <div class="secao">
    <div class="secao-titulo">${s.titulo}</div>
    ${s.linhas.length === 0 ? `<div class="vazio">Nenhum dado registrado neste período</div>` : `
    <table>
      <thead>
        <tr>${s.colunas.map(c => `<th>${c}</th>`).join('')}</tr>
      </thead>
      <tbody>
        ${s.linhas.map(l => `<tr>${l.map(v => `<td>${v !== null && v !== undefined && v !== '' ? v : '—'}</td>`).join('')}</tr>`).join('')}
      </tbody>
    </table>
    ${s.total ? `<div class="total-row">${s.total}</div>` : ''}
    `}
  </div>`).join('')}

  <div class="footer">
    <div class="footer-logo">🍞 Gestão Padaria</div>
    <div class="footer-info">padaria-gestao-delta.vercel.app · ${new Date().toLocaleDateString('pt-BR')}</div>
  </div>
</div>
</body>
</html>`

  const w = window.open('', '_blank')
  if (!w) { alert('Permita pop-ups para exportar PDF'); return }
  w.document.write(html)
  w.document.close()
  w.focus()
  setTimeout(() => { w.print(); w.close() }, 600)
}
