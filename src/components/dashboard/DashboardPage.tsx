import { useEffect, useState } from 'react'
import { getDashboard } from '@/api/reports'
import { MonthSelector } from '@/components/MonthSelector'
import { PageHeader } from '@/components/PageHeader'
import { SummaryCards } from './SummaryCards'
import { IncomeExpenseChart } from './IncomeExpenseChart'
import { ExpenseBreakdown } from './ExpenseBreakdown'
import { ErrorState } from '@/components/ErrorState'
import type { DashboardSummary } from '@/types/report'
import { monthRange } from '@/lib/format'

export default function DashboardPage() {
  const currentMonth = new Date().toISOString().slice(0, 7)
  const [month, setMonth] = useState(currentMonth)
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    getDashboard(monthRange(month))
      .then(setSummary)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [month])

  if (error) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader
          title="Dashboard"
          period={<MonthSelector month={month} onChange={setMonth} />}
        />
        <ErrorState message={error} />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Dashboard"
        period={<MonthSelector month={month} onChange={setMonth} />}
      />

      <SummaryCards
        totalIncome={summary?.totalIncome ?? 0}
        totalExpense={summary?.totalExpense ?? 0}
        balance={summary?.balance ?? 0}
        loading={loading}
      />

      <ExpenseBreakdown
        byPaymentMethod={summary?.byPaymentMethod ?? []}
        pendingBills={summary?.pendingBills ?? []}
        loading={loading}
      />

      <IncomeExpenseChart
        totalIncome={summary?.totalIncome ?? 0}
        totalExpense={summary?.totalExpense ?? 0}
        loading={loading}
      />
    </div>
  )
}
