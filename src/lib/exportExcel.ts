import * as XLSX from 'xlsx'

interface Sheet {
  nome: string
  dados: Record<string, unknown>[]
}

export function exportToExcel(sheets: Sheet[], nomeArquivo = 'padaria-gestao') {
  const wb = XLSX.utils.book_new()
  sheets.forEach(({ nome, dados }) => {
    if (dados.length === 0) return
    const ws = XLSX.utils.json_to_sheet(dados)
    const cols = Object.keys(dados[0]).map(k => ({ wch: Math.max(k.length, 14) }))
    ws['!cols'] = cols
    XLSX.utils.book_append_sheet(wb, ws, nome.slice(0, 31))
  })
  XLSX.writeFile(wb, `${nomeArquivo}.xlsx`)
}
