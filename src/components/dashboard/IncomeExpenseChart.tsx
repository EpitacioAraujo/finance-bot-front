import { formatCurrency } from '@/lib/format'

interface IncomeExpenseChartProps {
  totalIncome: number
  totalExpense: number
  loading?: boolean
}

export function IncomeExpenseChart({ totalIncome, totalExpense, loading }: IncomeExpenseChartProps) {
  if (loading) {
    return <div className="h-56 animate-pulse rounded-lg bg-muted" />
  }

  const max = Math.max(totalIncome, totalExpense, 1)
  const bars = [
    { name: 'Receitas', valor: totalIncome, color: 'var(--color-chart-2)' },
    { name: 'Despesas', valor: totalExpense, color: 'var(--color-chart-5)' },
  ]

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h2 className="text-sm font-medium text-muted-foreground mb-4">
        Receita vs Despesa
      </h2>
      <div className="flex h-56 items-end justify-around gap-8 pt-6">
        {bars.map((bar) => (
          <div key={bar.name} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
            <span className="text-sm font-medium tabular-nums">{formatCurrency(bar.valor)}</span>
            <div
              className="w-full max-w-32 rounded-t transition-[height] duration-500 ease-out"
              style={{ height: `${(bar.valor / max) * 100}%`, backgroundColor: bar.color }}
              title={formatCurrency(bar.valor)}
            />
            <span className="text-sm text-muted-foreground">{bar.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
