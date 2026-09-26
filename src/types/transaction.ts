import type { PaymentMethod } from './payment-method'
import type { Tag } from './tag'

export enum TransactionType {
  Income = 'income',
  Expense = 'expense',
}

/**
 * A linha de pagamento: uma fatia da compra com vencimento e estado de pago.
 * Existe sempre — à vista é uma tranche de número 1.
 */
export interface TransactionTranche {
  id: string
  transactionId: string
  number: number
  amount: number
  /** Quando o dinheiro sai. No crédito, é o vencimento da fatura. */
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
  billId: string | null
  /** Quantas tranches a compra tem. 1 = à vista. */
  installments: number
  notes: string | null
  tags?: Tag[]
  /** Nunca vazio; ordenado por `number`. */
  tranches: TransactionTranche[]
  paidTranches: number
  createdAt: string
}

export interface TransactionListResult {
  items: Transaction[]
  total: number
}

/**
 * Uma linha da leitura por vencimento: a tranche, com o que ela precisa da
 * compra para se explicar em tela. `GET /tranches` devolve isto.
 */
export interface TrancheDue {
  /** Id da tranche — chave de linha. As ações são da compra, por `transactionId`. */
  id: string
  transactionId: string
  description: string
  /** Valor da tranche, não da compra. */
  amount: number
  type: TransactionType
  dueDate: string
  purchaseDate: string
  /** '1/10'; nulo quando a compra tem uma tranche só. */
  tranche: string | null
  /** Quantas tranches a compra tem — o que some junto se ela for removida. */
  installments: number
  paymentMethod: { id: string; description: string }
  /** Só crédito: a fatura em que a tranche caiu, com a janela de compras dela. */
  cycle: {
    id: string
    referenceMonth: string
    startDate: string
    endDate: string
  } | null
  paidAt: string | null
}

export interface TrancheDueListResult {
  items: TrancheDue[]
  total: number
}
