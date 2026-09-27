import { get, query } from '@/lib/api'
import type { MonthOutput } from '@/types/month'

export function getMonth(params: { from: string; to: string }): Promise<MonthOutput> {
  return get<MonthOutput>(`/month?${query({ ...params })}`)
}
