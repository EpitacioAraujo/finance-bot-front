import { post, patch, del } from '@/lib/api'
import type { TransactionType } from '@/types/transaction'

export function createTransaction(data: {
  description: string
  amount: number
  type: TransactionType
  paymentMethodId: string
  date: string
  installments?: number
}): Promise<void> {
  return post('/transactions', data)
}

export function updateTransaction(
  id: string,
  data: { description?: string; amount?: number },
): Promise<void> {
  return patch(`/transactions/${id}`, data)
}

export function deleteTransaction(id: string): Promise<void> {
  return del(`/transactions/${id}`)
}
