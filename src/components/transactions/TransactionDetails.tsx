import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
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
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Loader2, Pencil, Trash2 } from 'lucide-react'
import { deleteTransaction, getTransaction } from '@/api/transactions'
import type { Transaction } from '@/types/transaction'
import { formatCurrency, formatDate } from '@/lib/format'
import { toast } from 'sonner'

export function TransactionDetails() {
  const navigate = useNavigate()
  const { search } = useLocation()
  const { id } = useParams<{ id: string }>()
  const [transaction, setTransaction] = useState<Transaction | null>(null)
  const [loading, setLoading] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!id) return
    getTransaction(id)
      .then(setTransaction)
      .catch(() => toast.error('Erro ao carregar transação'))
      .finally(() => setLoading(false))
  }, [id])

  // O filtro da lista vive na query: sair do modal não pode perdê-lo.
  const close = () => navigate({ pathname: '/transactions', search })

  const handleDelete = async () => {
    if (!transaction) return
    setDeleting(true)
    try {
      await deleteTransaction(transaction.id)
      toast.success('Transação removida')
      // `saved` faz a lista atrás recarregar sem a linha apagada.
      navigate(
        { pathname: '/transactions', search },
        { state: { saved: Date.now() } },
      )
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao remover')
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  const splits = [...(transaction?.splits ?? [])].sort((a, b) => a.number - b.number)
  const paid = splits.filter((split) => split.paidAt).length

  return (
    <Dialog open onOpenChange={(open) => !open && close()}>
      <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto md:max-w-lg max-md:inset-0 max-md:h-full max-md:max-h-none max-md:w-full max-md:max-w-none max-md:translate-x-0 max-md:translate-y-0 max-md:rounded-none">
        <DialogHeader>
          <DialogTitle>{transaction?.description ?? 'Transação'}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="size-6 animate-spin" />
          </div>
        ) : !transaction ? null : (
          <div className="flex flex-col gap-4">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div>
                <dt className="text-muted-foreground text-xs">Valor</dt>
                <dd className="font-medium tabular-nums">
                  {formatCurrency(transaction.amount)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">Data</dt>
                <dd className="font-medium">{formatDate(transaction.date)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">Tipo</dt>
                <dd className="font-medium">
                  {transaction.type === 'income' ? 'Receita' : 'Despesa'}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">Forma de pagamento</dt>
                <dd className="font-medium">
                  {transaction.paymentMethod?.description ?? '—'}
                </dd>
              </div>
              {transaction.tags && transaction.tags.length > 0 && (
                <div className="col-span-2">
                  <dt className="text-muted-foreground text-xs">Tags</dt>
                  <dd className="flex flex-wrap gap-1 pt-1">
                    {transaction.tags.map((tag) => (
                      <span
                        key={tag.id}
                        className="rounded-full border border-border px-2 py-0.5 text-xs"
                      >
                        {tag.description}
                      </span>
                    ))}
                  </dd>
                </div>
              )}
              {transaction.notes && (
                <div className="col-span-2">
                  <dt className="text-muted-foreground text-xs">Observação</dt>
                  <dd>{transaction.notes}</dd>
                </div>
              )}
            </dl>

            {splits.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Compra à vista — sem parcelas.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="flex items-baseline justify-between">
                  <h3 className="text-sm font-medium">Parcelas</h3>
                  <span className="text-xs text-muted-foreground">
                    {paid}/{splits.length} paga{splits.length > 1 ? 's' : ''}
                  </span>
                </div>
                <div className="rounded-lg border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">#</TableHead>
                        <TableHead>Vencimento</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {splits.map((split) => (
                        <TableRow key={split.id}>
                          <TableCell className="text-muted-foreground">
                            {split.number}
                          </TableCell>
                          <TableCell>{formatDate(split.dueDate)}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatCurrency(split.amount)}
                          </TableCell>
                          <TableCell>
                            <span
                              className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                split.paidAt
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                  : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                              }`}
                            >
                              {split.paidAt ? 'Paga' : 'Em aberto'}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button
                variant="destructive"
                className="mr-auto"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="size-4" />
                Remover
              </Button>
              <Button variant="outline" onClick={close}>
                Fechar
              </Button>
              <Button
                onClick={() =>
                  navigate({ pathname: `/transactions/${transaction.id}`, search })
                }
              >
                <Pencil className="size-4" />
                Editar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>

      <ConfirmDialog
        open={confirmDelete}
        title="Remover transação"
        message={
          transaction
            ? `Remover "${transaction.description}" (${formatCurrency(transaction.amount)})?${
                splits.length > 0
                  ? ` As ${splits.length} parcelas somem junto.`
                  : ''
              }`
            : 'Remover esta transação?'
        }
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </Dialog>
  )
}
