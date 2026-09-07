export interface Bill {
  id: string
  description: string
  predictedAmount: number
  dueDate: string | null
  dueDay: number | null
  frequency: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'
  paymentMethod: { id: string; description: string }
  tag: { id: string; description: string } | null
  notes: string | null
  active: boolean
  status: 'pending' | 'paid'
}

export interface BillListResult {
  bills: Bill[]
  summary: {
    totalPrevisto: number
    totalPago: number
    totalPendente: number
  }
}

export interface ConsolidatedItem {
  paymentMethodId: string
  paymentMethodDescription: string
  cycleStart: string
  cycleEnd: string
  totalAmount: number
  splitCount: number
  allPaid: boolean
  splits: {
    id: string
    amount: number
    number: number
    transactionDescription: string
    paidAt: string | null
  }[]
}

export interface ConsolidatedListResult {
  items: ConsolidatedItem[]
}
