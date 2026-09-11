export interface ReportGroup {
  key: string
  label: string
  total: number
  count: number
}

export interface ReportOutput {
  totalIncome: number
  totalExpense: number
  balance: number
  count: number
  /**
   * Com tags n:n os grupos se sobrepõem: um lançamento com duas tags entra nos
   * dois. A soma dos grupos passa do total, e isso é esperado.
   */
  groups: ReportGroup[]
}

export interface DashboardLine {
  key: string
  label: string
  total: number
}

/** Números do dashboard: despesa é caixa + compromisso, somados no backend. */
export interface DashboardSummary {
  totalIncome: number
  totalExpense: number
  balance: number
  byPaymentMethod: DashboardLine[]
  pendingBills: DashboardLine[]
}
