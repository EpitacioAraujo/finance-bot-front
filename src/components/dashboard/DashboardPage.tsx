import { useEffect, useState } from 'react'
import { getDashboardSummary } from '@/api/dashboard'
import { MonthSelector } from './MonthSelector'
import { SummaryCards } from './SummaryCards'
import { IncomeExpenseChart } from './IncomeExpenseChart'
import { ErrorState } from '@/components/ErrorState'
import type { DashboardSummary } from '@/types/dashboard'

export default function DashboardPage() {
  const currentMonth = new Date().toISOString().slice(0, 7)
  const [month, setMonth] = useState(currentMonth)
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    getDashboardSummary(month)
      .then(setSummary)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [month])

  if (error) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex justify-center">
          <MonthSelector month={month} onChange={setMonth} />
        </div>
        <ErrorState message={error} />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-center">
        <MonthSelector month={month} onChange={setMonth} />
      </div>

      <SummaryCards
        totalIncome={summary?.totalIncome ?? 0}
        totalExpense={summary?.totalExpense ?? 0}
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
