export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

/** 'YYYY-MM-DD' → '15/08'. */
export function shortDate(date: string): string {
  return `${date.slice(8, 10)}/${date.slice(5, 7)}`
}

/** 'YYYY-MM' do mês corrente, em hora local. */
export function competenciaAtual(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** O backend recebe janela [from, to]; a UI escolhe o mês. */
export function monthRange(month: string): { from: string; to: string } {
  const [year, monthNum] = month.split('-').map(Number)
  const lastDay = new Date(Date.UTC(year, monthNum, 0)).getUTCDate()
  return { from: `${month}-01`, to: `${month}-${String(lastDay).padStart(2, '0')}` }
}
