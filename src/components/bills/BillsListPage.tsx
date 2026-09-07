import { useCallback, useEffect, useState } from 'react'
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
import { fetchBills, fetchConsolidated, deleteBill, payBill, payConsolidated } from '@/api/bills'
import type { Bill, ConsolidatedItem } from '@/types/bill'
import { Plus, Pencil, Trash2, Check, ChevronDown, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'

const todayISO = () => new Date().toISOString().split('T')[0]

function competenciaAtual(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

type MergedRow =
  | { kind: 'bill'; data: Bill }
  | { kind: 'consolidated'; data: ConsolidatedItem }

export function BillsListPage() {
  const navigate = useNavigate()
  const [competencia, setCompetencia] = useState(competenciaAtual())
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [bills, setBills] = useState<Bill[]>([])
  const [consolidated, setConsolidated] = useState<ConsolidatedItem[]>([])
  const [summary, setSummary] = useState({ totalPrevisto: 0, totalPago: 0, totalPendente: 0 })
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [expandedKey, setExpandedKey] = useState<string | null>(null)
  const [payModal, setPayModal] = useState<{ kind: string; id?: string; predicted?: number; pmId?: string; cycleStart?: string } | null>(null)
  const [payAmount, setPayAmount] = useState('')
  const [payDate, setPayDate] = useState(todayISO())
  const [paying, setPaying] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([
      fetchBills(competencia, statusFilter === 'all' ? undefined : statusFilter),
      fetchConsolidated(competencia),
    ])
      .then(([billResult, consolidatedResult]) => {
        setBills(billResult.bills)
        setSummary(billResult.summary)
        setConsolidated(consolidatedResult.items)
      })
      .catch(() => toast.error('Erro ao carregar contas'))
      .finally(() => setLoading(false))
  }, [competencia, statusFilter])

  useEffect(load, [load])

  const merged: MergedRow[] = [
    ...bills.map((b) => ({ kind: 'bill' as const, data: b })),
    ...consolidated.map((c) => ({ kind: 'consolidated' as const, data: c })),
  ]

  const handleDelete = (id: string) => {
    setDeleteId(id)
  }

  const handleConfirmDelete = async () => {
    if (!deleteId) return
    try {
      await deleteBill(deleteId)
      setBills((prev) => prev.filter((b) => b.id !== deleteId))
      toast.success('Conta removida')
    } catch {
      toast.error('Erro ao remover')
    } finally {
      setDeleteId(null)
    }
  }

  const openPayModal = (row: MergedRow) => {
    if (row.kind === 'bill') {
      setPayAmount(String(row.data.predictedAmount))
      setPayModal({ kind: 'bill', id: row.data.id, predicted: row.data.predictedAmount })
    } else {
      setPayModal({
        kind: 'consolidated',
        pmId: row.data.paymentMethodId,
        cycleStart: row.data.cycleStart,
      })
    }
    setPayDate(todayISO())
  }

  const handleConfirmPay = async () => {
    if (!payModal) return
    setPaying(true)
    try {
      if (payModal.kind === 'bill' && payModal.id) {
        await payBill(payModal.id, Number(payAmount), payDate)
        toast.success('Conta paga')
      } else if (payModal.kind === 'consolidated' && payModal.pmId && payModal.cycleStart) {
        await payConsolidated(payModal.pmId, payModal.cycleStart, payDate)
        toast.success('Fatura paga')
      }
      setPayModal(null)
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao pagar')
    } finally {
      setPaying(false)
    }
  }

  const format = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

  const formatDate = (d: string | null) => {
    if (!d) return '—'
    const [y, m, day] = d.split('-')
    return `${day}/${m}/${y}`
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Contas a Pagar</h1>
          <p className="text-sm text-muted-foreground">Controle suas obrigacoes financeiras</p>
        </div>
        <Button onClick={() => navigate('/contas-a-pagar/nova')}>
          <Plus className="size-4" /> Nova Conta
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="comp">Competencia</Label>
          <Input
            id="comp"
            type="month"
            value={competencia}
            onChange={(e) => setCompetencia(e.target.value)}
            className="w-44"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="status">Status</Label>
            <Select items={{ all: 'Todos', pending: 'Pendente', paid: 'Pago' }} value={statusFilter} onValueChange={(v) => v && setStatusFilter(v)}>
            <SelectTrigger id="status" className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="paid">Pago</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border bg-card p-3 text-center">
          <div className="text-xs text-muted-foreground">Total Previsto</div>
          <div className="text-lg font-semibold">{format(summary.totalPrevisto)}</div>
        </div>
        <div className="rounded-lg border bg-card p-3 text-center">
          <div className="text-xs text-muted-foreground">Total Pago</div>
          <div className="text-lg font-semibold text-green-600">{format(summary.totalPago)}</div>
        </div>
        <div className="rounded-lg border bg-card p-3 text-center">
          <div className="text-xs text-muted-foreground">Total Pendente</div>
          <div className="text-lg font-semibold text-red-600">{format(summary.totalPendente)}</div>
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border">
        {loading ? (
          <LoadingState />
        ) : merged.length === 0 ? (
          <EmptyState message="Nenhuma conta a pagar nesta competencia." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descricao</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Forma de Pagamento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[120px] sr-only">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {merged.map((row) => {
                if (row.kind === 'bill') {
                  const bill = row.data
                  const dueDisplay = bill.frequency === 'none' ? formatDate(bill.dueDate) : `Dia ${bill.dueDay}`
                  return (
                    <TableRow key={bill.id}>
                      <TableCell className="font-medium">{bill.description}</TableCell>
                      <TableCell>{dueDisplay}</TableCell>
                      <TableCell>{format(bill.predictedAmount)}</TableCell>
                      <TableCell>{bill.paymentMethod.description}</TableCell>
                      <TableCell>
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            bill.status === 'paid'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                          }`}
                        >
                          {bill.status === 'paid' ? 'Pago' : 'Pendente'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {bill.status === 'pending' && (
                            <Button variant="ghost" size="icon-xs" onClick={() => openPayModal(row)}>
                              <Check className="size-3 text-green-600" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => navigate(`/contas-a-pagar/${bill.id}/editar`)}
                          >
                            <Pencil className="size-3" />
                          </Button>
                          <Button variant="ghost" size="icon-xs" onClick={() => handleDelete(bill.id)}>
                            <Trash2 className="size-3 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                } else {
                  const item = row.data
                  const key = `${item.paymentMethodId}-${item.cycleStart}`
                  const isExpanded = expandedKey === key
                  return (
                    <>
                      <TableRow
                        key={key}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setExpandedKey(isExpanded ? null : key)}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-1">
                            {isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                            {item.paymentMethodDescription}
                          </div>
                        </TableCell>
                        <TableCell>{formatDate(item.cycleEnd)}</TableCell>
                        <TableCell>{format(item.totalAmount)}</TableCell>
                        <TableCell>—</TableCell>
                        <TableCell>
                          <span
                            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                              item.allPaid
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                            }`}
                          >
                            {item.allPaid ? 'Pago' : 'Pendente'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {!item.allPaid && (
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  openPayModal(row)
                                }}
                              >
                                <Check className="size-3 text-green-600" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                      {isExpanded &&
                        item.splits.map((split) => (
                          <TableRow key={split.id} className="bg-muted/30">
                            <TableCell className="pl-10 text-sm text-muted-foreground">
                              {split.transactionDescription || `Parcela ${split.number}`}
                            </TableCell>
                            <TableCell>{split.paidAt ? `Pago ${formatDate(split.paidAt)}` : '—'}</TableCell>
                            <TableCell>{format(split.amount)}</TableCell>
                            <TableCell>—</TableCell>
                            <TableCell>—</TableCell>
                            <TableCell>—</TableCell>
                          </TableRow>
                        ))}
                    </>
                  )
                }
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <ConfirmDialog
        open={deleteId !== null}
        title="Remover conta"
        message="Tem certeza que deseja remover esta conta?"
        loading={false}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteId(null)}
      />

      {payModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-lg bg-card p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold">
              {payModal.kind === 'bill' ? 'Pagar Conta' : 'Pagar Fatura'}
            </h3>

            <div className="flex flex-col gap-4">
              {payModal.kind === 'bill' && (
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
              )}

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="payDate">Data do Pagamento</Label>
                <Input
                  id="payDate"
                  type="date"
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setPayModal(null)} disabled={paying}>
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
