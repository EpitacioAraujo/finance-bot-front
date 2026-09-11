import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency } from '@/lib/format'
import type { DashboardLine } from '@/types/report'

interface ExpenseBreakdownProps {
  byPaymentMethod: DashboardLine[]
  pendingBills: DashboardLine[]
  loading?: boolean
}

export function ExpenseBreakdown({
  byPaymentMethod,
  pendingBills,
  loading,
}: ExpenseBreakdownProps) {
  if (loading) {
    return <Skeleton className="h-40 rounded-lg" />
  }

  if (byPaymentMethod.length === 0 && pendingBills.length === 0) {
    return null
  }

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h2 className="mb-4 text-sm font-medium text-muted-foreground">
        Despesas por forma de pagamento
      </h2>

      <dl className="flex flex-col">
        {byPaymentMethod.map((line) => (
          <div
            key={line.key}
            className="flex items-baseline justify-between border-b border-border py-2 last:border-0"
          >
            <dt>{line.label}</dt>
            <dd className="font-medium tabular-nums">
              {formatCurrency(line.total)}
            </dd>
          </div>
        ))}
      </dl>

      {pendingBills.length > 0 && (
        <>
          {/* Conta a vencer não pertence a forma de pagamento nenhuma ainda:
              quem escolhe é o pagamento. */}
          <h3 className="mt-4 mb-1 text-xs font-medium text-muted-foreground">
            Contas recorrentes
          </h3>
          <dl className="flex flex-col">
            {pendingBills.map((line) => (
              <div
                key={line.key}
                className="flex items-baseline justify-between border-b border-border py-2 last:border-0"
              >
                <dt>{line.label}</dt>
                <dd className="font-medium tabular-nums">
                  {formatCurrency(line.total)}
                </dd>
              </div>
            ))}
          </dl>
        </>
      )}
    </div>
  )
}
