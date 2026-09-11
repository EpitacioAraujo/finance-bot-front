import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency } from '@/lib/format'

interface SummaryCardsProps {
  totalIncome: number
  totalExpense: number
  loading?: boolean
}

export function SummaryCards({
  totalIncome,
  totalExpense,
  loading,
}: SummaryCardsProps) {
  const balance = totalIncome - totalExpense

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card><CardContent className="p-6"><Skeleton className="h-16" /></CardContent></Card>
        <Card><CardContent className="p-6"><Skeleton className="h-16" /></CardContent></Card>
        <Card><CardContent className="p-6"><Skeleton className="h-16" /></CardContent></Card>
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <TrendingUp className="size-4 text-income" />
            Receitas
          </div>
          <p className="text-2xl font-bold tabular-nums text-income">
            {formatCurrency(totalIncome)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <TrendingDown className="size-4 text-expense" />
            Despesas
          </div>
          <p className="text-2xl font-bold tabular-nums text-expense">
            {formatCurrency(totalExpense)}
          </p>
        </CardContent>
      </Card>

      <Card className="sm:col-span-2 lg:col-span-1">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            {balance > 0 ? <TrendingUp className="size-4 text-income" /> : balance < 0 ? <TrendingDown className="size-4 text-expense" /> : <Minus className="size-4" />}
            Saldo
          </div>
          <p className={`text-2xl font-bold tabular-nums ${balance > 0 ? 'text-income' : balance < 0 ? 'text-expense' : ''}`}>
            {formatCurrency(balance)}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
