import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { LoadingState } from '@/components/LoadingState'
import { EmptyState } from '@/components/EmptyState'
import { listPayables, deleteBill, payBill, payConsolidated } from '@/api/bills'
import type { BillSummary, PayableItem } from '@/types/bill'
import { competenciaAtual, formatCurrency, formatDate, monthRange } from '@/lib/format'
import { Plus, Pencil, Trash2, Check } from 'lucide-react'
import { FilterSheet } from '@/components/FilterSheet'
import { MonthSelector } from '@/components/MonthSelector'
import { CycleItemsDialog } from './CycleItemsDialog'
import { toast } from 'sonner'

const todayISO = () => new Date().toISOString().split('T')[0]

const EMPTY_SUMMARY: BillSummary = {
  totalPredicted: 0,
  totalPaid: 0,
  totalPending: 0,
}

export function BillsListPage() {
  const navigate = useNavigate()
  // Filtro na URL: a competência é o que a tela inteira enxerga, então tem que
  // sobreviver a recarregar e a compartilhar o link.
  const [searchParams, setSearchParams] = useSearchParams()
  const currentMonth = competenciaAtual()
  const competencia = searchParams.get('competencia') ?? currentMonth
  const statusFilter = searchParams.get('status') ?? 'all'
  const activeFilters =
    (competencia !== currentMonth ? 1 : 0) + (statusFilter !== 'all' ? 1 : 0)

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value)
    else next.delete(key)
    setSearchParams(next)
  }

  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<PayableItem[]>([])
  const [summary, setSummary] = useState<BillSummary>(EMPTY_SUMMARY)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [payTarget, setPayTarget] = useState<PayableItem | null>(null)
  const [openCycle, setOpenCycle] = useState<PayableItem | null>(null)
  const [payAmount, setPayAmount] = useState('')
  const [payDate, setPayDate] = useState(todayISO())
  const [paying, setPaying] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    listPayables({
      ...monthRange(competencia),
      status: statusFilter === 'all' ? undefined : (statusFilter as 'paid' | 'pending'),
    })
      .then((payables) => {
        setItems(payables.items)
        setSummary(payables.summary)
      })
      .catch(() => toast.error('Erro ao carregar contas'))
      .finally(() => setLoading(false))
  }, [competencia, statusFilter])

  useEffect(load, [load])

  const handleConfirmDelete = async () => {
    if (!deleteId) return
    try {
      await deleteBill(deleteId)
      toast.success('Conta removida')
      load()
    } catch {
      toast.error('Erro ao remover')
    } finally {
      setDeleteId(null)
    }
  }

  const openPayModal = (item: PayableItem) => {
    setPayAmount(String(item.amount))
    setPayDate(todayISO())
    setPayTarget(item)
  }

  const handleConfirmPay = async () => {
    if (!payTarget) return
    setPaying(true)
    try {
      if (payTarget.kind === 'bill') {
        await payBill(payTarget.id, {
          amount: Number(payAmount) || undefined,
          date: payDate,
        })
        toast.success('Conta paga')
      } else {
        // Fechar a fatura é só o ciclo; valor e data saem das transações dele.
        await payConsolidated(payTarget.id)
        toast.success('Fatura paga')
      }
      setPayTarget(null)
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao pagar')
    } finally {
      setPaying(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center">
        <h1 className="text-xl font-semibold">Contas a Pagar</h1>
        <div className="flex items-center gap-2">
          <MonthSelector
            month={competencia}
            onChange={(v) => setFilter('competencia', v)}
          />
          {statusFilter !== 'all' && (
            <span className="text-sm text-muted-foreground">
              · {statusFilter === 'paid' ? 'pagas' : 'pendentes'}
            </span>
          )}
        </div>
        <div className="flex items-center justify-end gap-2">
          <FilterSheet
            active={activeFilters}
            onClear={() => setSearchParams({})}
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="comp">Competência</Label>
              <Input
                id="comp"
                type="month"
                value={competencia}
                onChange={(e) => setFilter('competencia', e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="status">Status</Label>
              <Select
                items={{ all: 'Todos', pending: 'Pendente', paid: 'Pago' }}
                value={statusFilter}
                onValueChange={(v) => setFilter('status', v === 'all' ? '' : (v ?? ''))}
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="paid">Pago</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </FilterSheet>

          <Button size="icon" aria-label="Nova conta" onClick={() => navigate('/contas-a-pagar/nova')}>
            <Plus className="size-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border bg-card p-3 text-center">
          <div className="text-xs text-muted-foreground">Total Previsto</div>
          <div className="text-lg font-semibold">{formatCurrency(summary.totalPredicted)}</div>
        </div>
        <div className="rounded-lg border bg-card p-3 text-center">
          <div className="text-xs text-muted-foreground">Total Pago</div>
          <div className="text-lg font-semibold text-green-600">
            {formatCurrency(summary.totalPaid)}
          </div>
        </div>
        <div className="rounded-lg border bg-card p-3 text-center">
          <div className="text-xs text-muted-foreground">Total Pendente</div>
          <div className="text-lg font-semibold text-red-600">
            {formatCurrency(summary.totalPending)}
          </div>
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border">
        {loading ? (
          <LoadingState />
        ) : items.length === 0 ? (
          <EmptyState message="Nenhuma conta a pagar nesta competência." />
        ) : (
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
                  className={item.kind === 'cycle' ? 'cursor-pointer' : undefined}
                  onClick={item.kind === 'cycle' ? () => setOpenCycle(item) : undefined}
                >
                  <TableCell className="font-medium whitespace-normal">
                    {item.description}
                    {item.itemCount !== null && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        {item.itemCount} lançamento{item.itemCount > 1 ? 's' : ''}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>{formatDate(item.dueDate)}</TableCell>
                  <TableCell>{formatCurrency(item.amount)}</TableCell>
                  <TableCell>{item.paymentMethod.description}</TableCell>
                  <TableCell>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        item.status === 'paid'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                      }`}
                    >
                      {item.status === 'paid' ? 'Pago' : 'Pendente'}
                    </span>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-1">
                      {item.status === 'pending' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openPayModal(item)}
                        >
                          <Check className="size-3.5 text-green-600" />
                          Pagar
                        </Button>
                      )}
                      {/* Fatura não é entidade editável: só a conta tem edit/delete. */}
                      {item.kind === 'bill' && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => navigate(`/contas-a-pagar/${item.id}/editar`)}
                          >
                            <Pencil className="size-3" />
                          </Button>
                          <Button variant="ghost" size="icon-xs" onClick={() => setDeleteId(item.id)}>
                            <Trash2 className="size-3 text-red-500" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {openCycle && (
        <CycleItemsDialog
          cycleId={openCycle.id}
          description={openCycle.paymentMethod.description}
          total={openCycle.amount}
          onClose={() => setOpenCycle(null)}
        />
      )}

      <ConfirmDialog
        open={deleteId !== null}
        title="Remover conta"
        message="Tem certeza que deseja remover esta conta?"
        loading={false}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteId(null)}
      />

      {payTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-lg bg-card p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold">
              {payTarget.kind === 'bill'
                ? 'Pagar conta'
                : `Pagar ${payTarget.description}`}
            </h3>

            <div className="flex flex-col gap-4">
              {payTarget.kind === 'bill' ? (
                <>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="payAmount">Valor Pago</Label>
                    <Input
                      id="payAmount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="payDate">Data do Pagamento</Label>
                    <Input
                      id="payDate"
                      type="date"
                      value={payDate}
                      onChange={(e) => setPayDate(e.target.value)}
                    />
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Quita {payTarget.itemCount} lançamento
                  {(payTarget.itemCount ?? 0) > 1 ? 's' : ''} do ciclo —{' '}
                  <span className="font-medium text-foreground">
                    {formatCurrency(payTarget.amount)}
                  </span>
                  .
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setPayTarget(null)} disabled={paying}>
                  Cancelar
                </Button>
                <Button onClick={handleConfirmPay} disabled={paying}>
                  {paying ? 'Confirmando...' : 'Confirmar'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
