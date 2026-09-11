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

/**
 * Uma ocorrência da conta dentro da janela — a lista expande recorrência, então
 * o mesmo `id` aparece em várias linhas com `occurrenceDate` diferente.
 */
export interface BillView {
  id: string
  description: string
  predictedAmount: number
  occurrenceDate: string
  frequency: string
  paid: boolean
  paidTransactionId: string | null
  paidAmount: number | null
  paymentMethod: { id: string; description: string }
  tag: { id: string; description: string } | null
  notes: string | null
}

export interface BillSummary {
  totalPredicted: number
  totalPaid: number
  totalPending: number
}

export interface BillListResult {
  items: BillView[]
  /** Cobre a janela inteira; o filtro de status só corta `items`. */
  summary: BillSummary
}

/**
 * A tela de contas a pagar é conta + fatura de cartão. O backend junta e soma:
 * aqui só se renderiza.
 */
export interface PayableListResult {
  bills: BillView[]
  cycles: ConsolidatedView[]
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

/** A fatura fechada do cartão, agregada por ciclo. */
export interface ConsolidatedView {
  cycleId: string
  paymentMethod: { id: string; description: string }
  /** '2026-03' */
  referenceMonth: string
  /** ISO completo: vem de query crua, não da entidade. */
  dueDate: string
  total: number
  itemCount: number
  closedAt: string | null
}
