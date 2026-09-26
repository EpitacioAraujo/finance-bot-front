import type { TransactionType } from './transaction'

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
  /** expense = a pagar, income = a receber. */
  type: TransactionType
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

export interface RecurrenceLine {
  /** bill.id — é o que vai na URL de editar e apagar. */
  billId: string
  key: string
  description: string
  /** Em cartão, o dia em que a cobrança cai; fora dele, o vencimento. */
  date: string
  amount: number
  status: 'paid' | 'pending'
  /** Falso no cartão: lá dentro quem paga é a fatura. */
  payable: boolean
}

export interface RecurrenceGroup {
  type: TransactionType
  paymentMethod: { id: string; description: string }
  /** Só crédito: a fatura do mês, que é o que se paga de uma vez. */
  invoice: {
    /** Nulo na fatura que ainda não existe no banco: não há o que fechar. */
    cycleId: string | null
    startDate: string
    endDate: string
    dueDate: string
    total: number
    status: 'paid' | 'pending'
  } | null
  items: RecurrenceLine[]
}

/**
 * Uma tela: a forma de pagamento é o grupo, e num cartão o cabeçalho é a
 * fatura. O backend junta, nivela e soma — aqui só se renderiza.
 */
export interface PayableListResult {
  groups: RecurrenceGroup[]
}

