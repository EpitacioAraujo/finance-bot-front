import { get, query } from '@/lib/api'
import type { DashboardSummary, ReportOutput } from '@/types/report'
import type { TransactionType } from '@/types/transaction'

export function getReport(params: {
  from: string
  to: string
  groupBy: 'tag' | 'payment_method' | 'none'
  type?: TransactionType
}): Promise<ReportOutput> {
  return get<ReportOutput>(`/reports?${query({ ...params })}`)
}

export function getDashboard(params: {
  from: string
  to: string
}): Promise<DashboardSummary> {
  return get<DashboardSummary>(`/dashboard?${query({ ...params })}`)
}
