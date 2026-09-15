import { get, post, patch, del, query } from '@/lib/api'
import type {
  Bill,
  BillFrequency,
  ConsolidatedItem,
  PayableListResult,
} from '@/types/bill'
import type { Transaction } from '@/types/transaction'

/** Conta e fatura numa lista só, já niveladas e somadas pelo backend. */
export function listPayables(params: {
  from: string
  to: string
  status?: 'paid' | 'pending'
}): Promise<PayableListResult> {
  return get<PayableListResult>(`/payables?${query({ ...params })}`)
}

export function getBill(id: string): Promise<Bill> {
  return get<Bill>(`/bills/${id}`)
}

export interface CreateBillData {
  description: string
  predictedAmount: number
  frequency: BillFrequency
  paymentMethodId: string
  dueDate?: string
  dueDay?: number
  tagId?: string
  notes?: string
  active?: boolean
}

export function createBill(data: CreateBillData): Promise<Bill> {
  return post<Bill>('/bills', data)
}

export function updateBill(
  id: string,
  data: Partial<CreateBillData>,
): Promise<Bill> {
  return patch<Bill>(`/bills/${id}`, data)
}

export function deleteBill(id: string): Promise<void> {
  return del(`/bills/${id}`)
}

/** Pagar gera a transação da conta; sem `amount` vale o previsto. */
export function payBill(
  id: string,
  data: { amount?: number; date?: string; paymentMethod?: string },
): Promise<Transaction> {
  return post<Transaction>(`/bills/${id}/pay`, data)
}

/** As compras que compõem a fatura — à vista no cartão e parcelas. */
export function listConsolidatedItems(
  cycleId: string,
): Promise<ConsolidatedItem[]> {
  return get<ConsolidatedItem[]>(`/consolidated/${cycleId}/items`)
}

export function payConsolidated(cycleId: string): Promise<unknown> {
  return post(`/consolidated/${cycleId}/pay`)
}
