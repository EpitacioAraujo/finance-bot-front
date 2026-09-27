import type { PaymentMethodKind } from './payment-method'

export interface MonthLine {
  key: string
  description: string
  date: string
  amount: number
  status: 'paid' | 'pending'
  billId: string | null
  transactionId: string | null
  paymentMethod: string
  /** '8/10' em parcela. */
  tranche: string | null
  /** Só na linha de fatura: o ciclo que o Pagar fecha. */
  cycleId: string | null
  /** Só nas contas pagas. */
  paidDate: string | null
}

/** Previsto e efetivo têm as mesmas linhas; o que não se aplica vem 0. */
export interface MonthTotals {
  income: number
  bills: number
  recurring: number
  entries: number
  invoices: number
  expense: number
  balance: number
}

export interface MonthGroup {
  paymentMethod: { id: string; description: string; kind: PaymentMethodKind }
  /** Soma dos lançamentos. */
  total: number
  /** Soma das recorrências cobradas nesta forma. */
  recurring: number
  /** Só cartão: a janela do ciclo que abre no mês. */
  invoice: { startDate: string; endDate: string; dueDate: string } | null
  items: MonthLine[]
}

/** Espelha o `MonthOutput` do backend (`GET /month`). */
export interface MonthOutput {
  totals: { planned: MonthTotals; actual: MonthTotals }
  /** `payable` inclui a fatura do ciclo anterior de cada cartão. */
  bills: { payable: MonthLine[]; receivable: MonthLine[] }
  recurring: MonthLine[]
  groups: MonthGroup[]
}
