export const BILL_FREQUENCIES = ['none', 'monthly', 'yearly'] as const
export type BillFrequency = (typeof BILL_FREQUENCIES)[number]

export const BILL_FREQUENCY_LABELS: Record<BillFrequency, string> = {
  none: 'Avulsa (data única)',
  monthly: 'Mensal',
  yearly: 'Anual',
}

/** A conta cadastrada. `GET /bills/:id` devolve isto. */
export interface Bill {
  id: string
  description: string
  predictedAmount: number
  /** Preenchido só quando frequency = none. */
  dueDate: string | null
  /** Preenchido em todas as outras frequency. */
  dueDay: number | null
  frequency: BillFrequency
  paymentMethodId: string
  tagId: string | null
  active: boolean
  notes: string | null
  createdAt: string
}

export interface BillSummary {
  totalPredicted: number
  totalPaid: number
  totalPending: number
}

/** Conta ou fatura de cartão, já niveladas pelo backend. */
export interface PayableItem {
  kind: 'bill' | 'cycle'
  /** bill.id ou cycle.id — é o que vai na URL de pay/edit/delete. */
  id: string
  /** Chave de linha: conta recorrente repete `id` por ocorrência. */
  key: string
  description: string
  dueDate: string
  amount: number
  status: 'paid' | 'pending'
  paymentMethod: { id: string; description: string }
  /** Só cycle: compras na fatura. */
  itemCount: number | null
}

/**
 * A tela de contas a pagar é conta + fatura de cartão. O backend junta, nivela
 * e soma: aqui só se renderiza.
 */
export interface PayableListResult {
  items: PayableItem[]
  summary: BillSummary
}

/** Uma compra que entrou na fatura: à vista no cartão ou parcela. */
export interface ConsolidatedItem {
  id: string
  transactionId: string
  description: string
  amount: number
  /** Data da compra, não do vencimento. */
  date: string
  /** '3/10' quando é parcela; nulo quando foi à vista. */
  installment: string | null
  paidAt: string | null
}
