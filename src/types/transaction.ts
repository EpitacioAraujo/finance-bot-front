export interface SplitInfo {
  id: string
  amount: number
  number: number
  paidAt: string | null
  paymentMethod: {
    id: string
    description: string
  }
}

export interface Transaction {
  id: string
  amount: number
  type: 'income' | 'expense'
  date: string
  description: string
  createdAt: string
  splits: SplitInfo[]
}

export interface TransactionListResult {
  data: Transaction[]
  nextCursor?: string
}

export interface BulkDeleteResult {
  deletedCount: number
  notFound: string[]
}
