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
import { Button } from '@/components/ui/button'
import { Loader2, Pencil, Trash2 } from 'lucide-react'
import { listConsolidatedItems, deleteBill } from '@/api/bills'
import type { ConsolidatedItem, PayableItem } from '@/types/bill'
import { formatCurrency, formatDate } from '@/lib/format'
import { toast } from 'sonner'

export function CycleItemsDialog({
  cycle,
  onClose,
}: {
  cycle: PayableItem
  onClose: () => void
}) {
  const navigate = useNavigate()
  const [items, setItems] = useState<ConsolidatedItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Sem `id` é fatura virtual: não existe ciclo no banco, então quem a
    // identifica é o cartão mais a janela que a lista já calculou.
    listConsolidatedItems(
      cycle.id
        ? { cycleId: cycle.id }
        : {
            paymentMethodId: cycle.paymentMethod.id,
            from: cycle.period?.startDate,
            to: cycle.period?.endDate,
          },
    )
      .then(setItems)
      .catch(() => toast.error('Erro ao carregar a fatura'))
      .finally(() => setLoading(false))
  }, [cycle])

  const remove = async (billId: string) => {
    try {
      await deleteBill(billId)
      toast.success('Conta removida')
      onClose()
    } catch {
      toast.error('Erro ao remover')
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto md:max-w-lg max-md:inset-0 max-md:h-full max-md:max-h-none max-md:w-full max-md:max-w-none max-md:translate-x-0 max-md:translate-y-0 max-md:rounded-none">
        <DialogHeader>
          <DialogTitle>Fatura · {cycle.paymentMethod.description}</DialogTitle>
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
                    <TableHead className="w-[76px]">
                      <span className="sr-only">Ações</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => {
                    const billId = item.billId
                    // A parcela leva à compra que a gerou; a previsão leva à
                    // conta que a prevê. São os dois lugares onde dá para mexer
                    // no que originou a linha.
                    const open = item.transactionId
                      ? () =>
                          navigate(`/transactions/${item.transactionId}/details`)
                      : billId
                        ? () => navigate(`/planejamento/${billId}/editar`)
                        : undefined

                    return (
                      <TableRow
                        key={item.id}
                        className={open ? 'cursor-pointer' : undefined}
                        onClick={open}
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
                          {item.predicted && (
                            <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                              previsto
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatCurrency(item.amount)}
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          {billId && (
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                aria-label="Editar conta"
                                onClick={() =>
                                  navigate(`/planejamento/${billId}/editar`)
                                }
                              >
                                <Pencil className="size-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                aria-label="Remover conta"
                                onClick={() => void remove(billId)}
                              >
                                <Trash2 className="size-3 text-red-500" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-baseline justify-between px-1">
              <span className="text-sm text-muted-foreground">
                {items.length} lançamento{items.length > 1 ? 's' : ''}
              </span>
              <span className="font-medium tabular-nums">
                {formatCurrency(cycle.amount)}
              </span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
