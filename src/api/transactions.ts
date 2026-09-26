import { get, post, patch, del, query } from '@/lib/api'
import type {
  Transaction,
  TransactionListResult,
  TransactionType,
  TrancheDueListResult,
} from '@/types/transaction'

export interface ListTransactionsParams {
  from?: string
  to?: string
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

/** A mesma janela, ancorada no vencimento da tranche em vez da data da compra. */
export function listTranchesDue(
  params: ListTransactionsParams,
): Promise<TrancheDueListResult> {
  return get<TrancheDueListResult>(`/tranches?${query({ ...params })}`)
}

export function getTransaction(id: string): Promise<Transaction> {
  return get<Transaction>(`/transactions/${id}`)
}

export interface CreateTransactionData {
  description: string
  amount: number
  type: TransactionType
  paymentMethodId: string
  date?: string
  tagIds?: string[]
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
