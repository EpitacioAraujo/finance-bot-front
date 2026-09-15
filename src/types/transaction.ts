import type { PaymentMethod } from './payment-method'
import type { Tag } from './tag'

export const TRANSACTION_TYPES = ['income', 'expense'] as const
export type TransactionType = (typeof TRANSACTION_TYPES)[number]

/** Só existe quando installments > 1. Compra à vista não gera linha. */
export interface TransactionSplit {
  id: string
  transactionId: string
  number: number
  amount: number
  dueDate: string
  cycleId: string | null
  paidAt: string | null
}

export interface Transaction {
  id: string
  description: string
  /** Sempre positivo. O sinal vem de `type`. */
  amount: number
  type: TransactionType
  date: string
  paymentMethodId: string
  paymentMethod?: PaymentMethod
  cycleId: string | null
  billId: string | null
  /** 1 = à vista. */
  installments: number
  notes: string | null
  tags?: Tag[]
  /** Vazio quando à vista; ordenado por `number`. */
  splits: TransactionSplit[]
  paidInstallments: number
  createdAt: string
}

export interface TransactionListResult {
  items: Transaction[]
  total: number
}
