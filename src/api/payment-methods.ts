import { get, post, patch, del } from '@/lib/api'
import type { PaymentMethod, PaymentMethodKind } from '@/types/payment-method'

export function listPaymentMethods(): Promise<PaymentMethod[]> {
  return get<PaymentMethod[]>('/payment-methods')
}

export function getPaymentMethod(id: string): Promise<PaymentMethod> {
  return get<PaymentMethod>(`/payment-methods/${id}`)
}

export interface CreatePaymentMethodData {
  description: string
  kind: PaymentMethodKind
  /** Só aceitos em `credit`. */
  closingDay?: number
  dueDay?: number
  showInBills?: boolean
}

export function createPaymentMethod(
  data: CreatePaymentMethodData,
): Promise<PaymentMethod> {
  return post<PaymentMethod>('/payment-methods', data)
}

export type UpdatePaymentMethodData = Partial<CreatePaymentMethodData> & {
  active?: boolean
}

export function updatePaymentMethod(
  id: string,
  data: UpdatePaymentMethodData,
): Promise<PaymentMethod> {
  return patch<PaymentMethod>(`/payment-methods/${id}`, data)
}

export function deletePaymentMethod(id: string): Promise<void> {
  return del(`/payment-methods/${id}`)
}
