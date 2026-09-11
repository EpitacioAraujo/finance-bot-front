import { useEffect, useState } from 'react'
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
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { LoadingState } from '@/components/LoadingState'
import { EmptyState } from '@/components/EmptyState'
import { listPaymentMethods, deletePaymentMethod } from '@/api/payment-methods'
import {
  PAYMENT_METHOD_KIND_LABELS,
  type PaymentMethod,
} from '@/types/payment-method'
import { Plus, Pencil, Trash2 } from 'lucide-react'

export function PaymentMethodListPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState<PaymentMethod[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    listPaymentMethods()
      .then(setItems)
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const handleConfirmDelete = async () => {
    if (!deleteId) return
    try {
      await deletePaymentMethod(deleteId)
      setItems((prev) => prev.filter((p) => p.id !== deleteId))
    } catch {
    } finally {
      setDeleteId(null)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Formas de Pagamento</h1>
          <p className="text-sm text-muted-foreground">Gerencie seus metodos de pagamento</p>
        </div>
        <Button onClick={() => navigate('/payment-methods/new')}>
          <Plus className="size-4" /> Nova
        </Button>
      </div>

      <div className="bg-card rounded-lg border border-border">
        {loading ? (
          <LoadingState />
        ) : items.length === 0 ? (
          <EmptyState message="Nenhuma forma de pagamento cadastrada." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descricao</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Fechamento</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead className="w-[80px]">
                  <span className="sr-only">Ações</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((pm) => (
                <TableRow key={pm.id}>
                  <TableCell>{pm.description}</TableCell>
                  <TableCell>{PAYMENT_METHOD_KIND_LABELS[pm.kind] ?? pm.kind}</TableCell>
                  <TableCell>{pm.closingDay ?? '—'}</TableCell>
                  <TableCell>{pm.dueDay ?? '—'}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon-xs" onClick={() => navigate(`/payment-methods/${pm.id}/edit`)}>
                        <Pencil className="size-3" />
                      </Button>
                      <Button variant="ghost" size="icon-xs" onClick={() => setDeleteId(pm.id)}>
                        <Trash2 className="size-3 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <ConfirmDialog
        open={deleteId !== null}
        title="Remover forma de pagamento"
        message="Tem certeza que deseja remover esta forma de pagamento?"
        loading={false}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}
