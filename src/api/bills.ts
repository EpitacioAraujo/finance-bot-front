import { get, post, put, del } from '@/lib/api'
import type { Bill, BillListResult, ConsolidatedListResult } from '@/types/bill'

export function fetchBills(competencia: string, status?: string, tagId?: string): Promise<BillListResult> {
  const params = new URLSearchParams({ competencia })
  if (status) params.set('status', status)
  if (tagId) params.set('tagId', tagId)
  return get<BillListResult>(`/bills?${params}`)
}

export function fetchConsolidated(competencia: string): Promise<ConsolidatedListResult> {
  return get<ConsolidatedListResult>(`/consolidated?competencia=${competencia}`)
}

export interface CreateBillData {
  description: string
  predictedAmount: number
  dueDate?: string
  dueDay?: number
  frequency: string
  paymentMethodId: string
  tagId?: string
  notes?: string
}

export function createBill(data: CreateBillData): Promise<Bill> {
  return post<Bill>('/bills', data)
}

export interface UpdateBillData {
  description?: string
  predictedAmount?: number
  dueDate?: string
  dueDay?: number
  frequency?: string
  paymentMethodId?: string
  tagId?: string
  notes?: string
  active?: boolean
}

export function updateBill(id: string, data: UpdateBillData): Promise<Bill> {
  return put<Bill>(`/bills/${id}`, data)
}

export function deleteBill(id: string): Promise<void> {
  return del(`/bills/${id}`)
}

export function payBill(id: string, amount: number, paidAt: string): Promise<unknown> {
  return post(`/bills/${id}/pay`, { amount, paidAt })
}

export function payConsolidated(paymentMethodId: string, cycleStart: string, paidAt: string): Promise<{ paidCount: number }> {
  return post('/consolidated/pay', { paymentMethodId, cycleStart, paidAt })
}
