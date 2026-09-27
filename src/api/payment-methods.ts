import { post, patch } from '@/lib/api'
import type { PaymentMethodKind } from '@/types/payment-method'

export function createPaymentMethod(data: {
  description: string
  kind: PaymentMethodKind
  /** Só no crédito. */
  closingDay?: number
  dueDay?: number
}): Promise<void> {
  return post('/payment-methods', data)
}

export function updatePaymentMethod(id: string, data: { description: string }): Promise<void> {
  return patch(`/payment-methods/${id}`, data)
}
