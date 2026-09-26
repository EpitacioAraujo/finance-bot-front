import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { EmptyState } from '@/components/EmptyState'
import { useIsMobile } from '@/hooks/use-mobile'
import type { PayableItem } from '@/types/bill'
import type { TransactionType } from '@/types/transaction'
import { formatCurrency, formatDate, shortDate } from '@/lib/format'
import { Pencil, Trash2, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BILL_LABELS } from './labels'

interface BillsSectionProps {
  type: TransactionType
  items: PayableItem[]
  onPay: (item: PayableItem) => void
  onDelete: (id: string) => void
  onOpenCycle: (item: PayableItem) => void
}

/** Uma seção de Compromissos: título + lista de um tipo de conta. Tabela no desktop, cards no mobile. */
export function BillsSection({ type, items, onPay, onDelete, onOpenCycle }: BillsSectionProps) {
  const L = BILL_LABELS[type]
  const navigate = useNavigate()
  const isMobile = useIsMobile()

  const status = (item: PayableItem) => (
    <span
      className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${
        item.status === 'paid'
          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
          : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
      }`}
    >
      {item.status === 'paid' ? L.done : 'Pendente'}
    </span>
  )

  const actions = (item: PayableItem) => {
    // Const, não `item.id` direto: dentro dos callbacks a narrowing do `&&`
    // não sobrevive a uma propriedade mutável.
    const id = item.id

    return (
    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
      {/* Sem id é fatura que ainda não existe no banco: não há o que pagar. */}
      {item.status === 'pending' && id && (
        <Button variant="outline" size="sm" onClick={() => onPay(item)}>
          <Check className="size-3.5 text-green-600" />
          {L.verb}
        </Button>
      )}
      {/* Fatura não é entidade editável: só a conta tem edit/delete. */}
      {item.kind === 'bill' && id && (
        <>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => navigate(`/planejamento/${id}/editar`)}
          >
            <Pencil className="size-3" />
          </Button>
          <Button variant="ghost" size="icon-xs" onClick={() => onDelete(id)}>
            <Trash2 className="size-3 text-red-500" />
          </Button>
        </>
      )}
    </div>
    )
  }

  // Só a fatura abre detalhe: a conta não tem o que expandir. A virtual abre
  // igual — dentro dela estão as contas previstas, que é onde se mexe nelas.
  const openCycle = (item: PayableItem) =>
    item.kind === 'cycle' ? () => onOpenCycle(item) : undefined

  // O vencimento não diz o que a fatura cobra: quem paga dia 20/09 está pagando
  // as compras de 15/08 a 14/09. Conta não tem janela e cai fora daqui.
  const detail = (item: PayableItem) =>
    [
      item.period && `${shortDate(item.period.startDate)} a ${shortDate(item.period.endDate)}`,
      item.itemCount !== null && `${item.itemCount} lançamento${item.itemCount > 1 ? 's' : ''}`,
    ]
      .filter(Boolean)
      .join(' · ')

  let body
  if (items.length === 0) {
    body = (
      <div className="bg-card rounded-lg border border-border">
        <EmptyState message={L.empty} />
      </div>
    )
  } else if (isMobile) {
    body = (
      <div className="flex flex-col gap-2">
        {items.map((item) => (
          <div
            key={item.key}
            onClick={openCycle(item)}
            className={cn(
              'flex flex-col gap-2 rounded-lg border bg-card p-3',
              item.kind === 'cycle' && 'cursor-pointer',
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-medium">{item.description}</div>
                <div className="text-xs text-muted-foreground">
                  {[formatDate(item.dueDate), item.paymentMethod.description, detail(item)]
                    .filter(Boolean)
                    .join(' · ')}
                </div>
              </div>
              {status(item)}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold tabular-nums">{formatCurrency(item.amount)}</span>
              {actions(item)}
            </div>
          </div>
        ))}
      </div>
    )
  } else {
    body = (
      <div className="bg-card rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Descrição</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Forma de Pagamento</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[120px]">
                <span className="sr-only">Ações</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow
                key={item.key}
                onClick={openCycle(item)}
                className={cn(item.kind === 'cycle' && 'cursor-pointer')}
              >
                <TableCell className="font-medium whitespace-normal">
                  {item.description}
                  {detail(item) && (
                    <span className="ml-2 text-xs text-muted-foreground">{detail(item)}</span>
                  )}
                </TableCell>
                <TableCell>{formatDate(item.dueDate)}</TableCell>
                <TableCell>{formatCurrency(item.amount)}</TableCell>
                <TableCell>{item.paymentMethod.description}</TableCell>
                <TableCell>{status(item)}</TableCell>
                <TableCell>{actions(item)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-base font-semibold">{L.title}</h2>
      {body}
    </section>
  )
}
