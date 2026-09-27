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
