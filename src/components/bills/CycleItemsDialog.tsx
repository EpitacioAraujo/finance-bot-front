import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Loader2 } from 'lucide-react'
import { listConsolidatedItems } from '@/api/bills'
import type { ConsolidatedItem } from '@/types/bill'
import { formatCurrency, formatDate } from '@/lib/format'
import { toast } from 'sonner'

interface CycleItemsDialogProps {
  cycleId: string
  /** Nome do cartão; o total vem do backend, junto da fatura. */
  description: string
  total: number
  onClose: () => void
}

export function CycleItemsDialog({
  cycleId,
  description,
  total,
  onClose,
}: CycleItemsDialogProps) {
  const navigate = useNavigate()
  const [items, setItems] = useState<ConsolidatedItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    listConsolidatedItems(cycleId)
      .then(setItems)
      .catch(() => toast.error('Erro ao carregar a fatura'))
      .finally(() => setLoading(false))
  }, [cycleId])

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto md:max-w-lg max-md:inset-0 max-md:h-full max-md:max-h-none max-md:w-full max-md:max-w-none max-md:translate-x-0 max-md:translate-y-0 max-md:rounded-none">
        <DialogHeader>
          <DialogTitle>Fatura · {description}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="size-6 animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma compra neste ciclo.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Compra</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    // A parcela leva à compra que a gerou, onde estão todas.
                    <TableRow
                      key={item.id}
                      className="cursor-pointer"
                      onClick={() =>
                        navigate(`/transactions/${item.transactionId}/details`)
                      }
                    >
                      <TableCell className="text-muted-foreground">
                        {formatDate(item.date)}
                      </TableCell>
                      <TableCell className="whitespace-normal">
                        {item.description}
                        {item.tranche && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            {item.tranche}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(item.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-baseline justify-between px-1">
              <span className="text-sm text-muted-foreground">
                {items.length} lançamento{items.length > 1 ? 's' : ''}
              </span>
              <span className="font-medium tabular-nums">
                {formatCurrency(total)}
              </span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
