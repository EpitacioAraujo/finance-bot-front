import { get, post, put, del } from '@/lib/api'
import type { PaymentMethod } from '@/types/payment-method'

export function listPaymentMethods(): Promise<PaymentMethod[]> {
  return get<PaymentMethod[]>('/payment-methods')
}

export function createPaymentMethod(
  data: Pick<PaymentMethod, 'description' | 'cycleFrequency'> & {
    cycleCloseDay?: number | null
    showInBills?: boolean
  },
): Promise<PaymentMethod> {
  return post<PaymentMethod>('/payment-methods', data)
}

export function updatePaymentMethod(
  id: string,
  data: Partial<
    Pick<PaymentMethod, 'description' | 'cycleFrequency'> & {
      cycleCloseDay: number | null
      showInBills: boolean
    }
  >,
): Promise<PaymentMethod> {
  return put<PaymentMethod>(`/payment-methods/${id}`, data)
}

export function deletePaymentMethod(id: string): Promise<void> {
  return del(`/payment-methods/${id}`)
}
