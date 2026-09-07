export interface PaymentMethod {
  id: string
  description: string
  cycleFrequency: 'daily' | 'weekly' | 'monthly'
  cycleCloseDay: number | null
  showInBills: boolean
  createdAt: string
}
