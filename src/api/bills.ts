import { post, patch, del } from '@/lib/api'
import type { TransactionType } from '@/types/transaction'

export function createBill(data: {
  description: string
  type: TransactionType
  predictedAmount: number
  frequency: 'monthly'
  dueDay: number
  paymentMethodId: string
}): Promise<void> {
  return post('/bills', data)
}

export function updateBill(
  id: string,
  data: { description?: string; predictedAmount?: number },
): Promise<void> {
  return patch(`/bills/${id}`, data)
}

export function deleteBill(id: string): Promise<void> {
  return del(`/bills/${id}`)
}

/** Gera a transação do pagamento; sem `paymentMethod`, vale a forma da conta. */
export function payBill(
  id: string,
  data: { amount: number; date: string; occurrenceDate: string; paymentMethod?: string },
): Promise<void> {
  return post(`/bills/${id}/pay`, data)
}

/** Fecha a fatura e quita tudo que está nela. */
export function payConsolidated(cycleId: string): Promise<void> {
  return post(`/consolidated/${cycleId}/pay`)
}
