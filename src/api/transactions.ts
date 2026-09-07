import { get, post, put, del } from '@/lib/api'
import type { Transaction, TransactionListResult, BulkDeleteResult } from '@/types/transaction'

export async function fetchTransactions(
  cursor?: string,
): Promise<TransactionListResult> {
  const params = new URLSearchParams({ limit: '20' })
  if (cursor) params.set('cursor', cursor)
  return get<TransactionListResult>(`/transactions?${params}`)
}

interface CreateTransactionData {
  amount: number
  type: 'income' | 'expense'
  date: string
  description: string
  splits: { amount: number; number: number; paymentMethodId: string }[]
  tagIds?: string[]
}

export function createTransaction(
  data: CreateTransactionData,
): Promise<Transaction> {
  return post<Transaction>('/transactions', data)
}

interface UpdateTransactionData {
  amount?: number
  type?: 'income' | 'expense'
  description?: string
  date?: string
}

export function updateTransaction(
  id: string,
  data: UpdateTransactionData,
): Promise<Transaction> {
  return put<Transaction>(`/transactions/${id}`, data)
}

export async function deleteTransaction(id: string): Promise<void> {
  return del(`/transactions/${id}`)
}

export async function bulkDeleteTransactions(
  ids: string[],
): Promise<BulkDeleteResult> {
  return post<BulkDeleteResult>('/transactions/bulk-delete', { ids })
}
