import { get } from '@/lib/api'
import type { DashboardSummary } from '@/types/dashboard'

export function getDashboardSummary(month: string): Promise<DashboardSummary> {
  return get<DashboardSummary>(`/dashboard/summary?month=${month}`)
}
