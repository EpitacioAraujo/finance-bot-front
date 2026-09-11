import { get, post, patch, del, query } from '@/lib/api'
import type {
  Transaction,
  TransactionListResult,
  TransactionType,
} from '@/types/transaction'

export interface ListTransactionsParams {
  from: string
  to: string
  type?: TransactionType
  tagId?: string
  paymentMethodId?: string
  limit?: number
  offset?: number
}

export function listTransactions(
  params: ListTransactionsParams,
): Promise<TransactionListResult> {
  return get<TransactionListResult>(`/transactions?${query({ ...params })}`)
}

export function getTransaction(id: string): Promise<Transaction> {
  return get<Transaction>(`/transactions/${id}`)
}

export interface CreateTransactionData {
  description: string
  amount: number
  type: TransactionType
  /** Nome da forma de pagamento: o backend resolve por texto, não por id. */
  paymentMethod: string
  date?: string
  /** Nomes das tags, não ids — o backend cria a que não existir. */
  tags?: string[]
  installments?: number
  notes?: string
}

export function createTransaction(
  data: CreateTransactionData,
): Promise<Transaction> {
  return post<Transaction>('/transactions', data)
}

export interface UpdateTransactionData {
  description?: string
  amount?: number
  date?: string
  paymentMethodId?: string
  tagIds?: string[]
  notes?: string
}

export function updateTransaction(
  id: string,
  data: UpdateTransactionData,
): Promise<Transaction> {
  return patch<Transaction>(`/transactions/${id}`, data)
}

export function deleteTransaction(id: string): Promise<void> {
  return del(`/transactions/${id}`)
}

/** Não existe bulk no backend: N deletes em paralelo. */
export async function deleteTransactions(ids: string[]): Promise<void> {
  await Promise.all(ids.map(deleteTransaction))
}
