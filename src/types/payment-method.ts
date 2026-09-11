export const PAYMENT_METHOD_KINDS = [
  'cash',
  'debit',
  'credit',
  'pix',
  'transfer',
] as const

export type PaymentMethodKind = (typeof PAYMENT_METHOD_KINDS)[number]

export const PAYMENT_METHOD_KIND_LABELS: Record<PaymentMethodKind, string> = {
  cash: 'Dinheiro',
  debit: 'Débito',
  credit: 'Crédito',
  pix: 'Pix',
  transfer: 'Transferência',
}

export interface PaymentMethod {
  id: string
  description: string
  /** É aqui que "no crédito" vive — não na transação. */
  kind: PaymentMethodKind
  /** Só faz sentido em `credit`. */
  closingDay: number | null
  dueDay: number | null
  showInBills: boolean
  active: boolean
  createdAt: string
}
