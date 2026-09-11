export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

// O backend manda tanto 'YYYY-MM-DD' quanto ISO completo (as datas que saem de
// query crua vêm como timestamp UTC). Cortar em 10 e ler como hora local evita
// que meia-noite UTC vire o dia anterior no fuso de cá.
export function formatDate(date: string | Date): string {
  const d =
    typeof date === 'string' ? new Date(date.slice(0, 10) + 'T00:00:00') : date
  return new Intl.DateTimeFormat('pt-BR').format(d)
}

export function formatInputDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date + 'T00:00:00') : date
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function parseCurrency(value: string): number {
  const cleaned = value
    .replace(/R\$\s?/i, '')
    .replace(/\./g, '')
    .replace(',', '.')
    .trim()
  return Number(cleaned)
}

/** O backend recebe janela [from, to]; a UI escolhe o mês. */
export function monthRange(month: string): { from: string; to: string } {
  const [year, monthNum] = month.split('-').map(Number)
  const lastDay = new Date(Date.UTC(year, monthNum, 0)).getUTCDate()
  return { from: `${month}-01`, to: `${month}-${String(lastDay).padStart(2, '0')}` }
}
