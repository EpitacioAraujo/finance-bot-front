import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
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
import { listPayables, deleteBill, payBill, payConsolidated } from '@/api/bills'
import type { PayableItem } from '@/types/bill'
import { TransactionType } from '@/types/transaction'
import { competenciaAtual, formatCurrency, monthRange } from '@/lib/format'
import { Plus } from 'lucide-react'
import { FilterSheet } from '@/components/FilterSheet'
import { MonthSelector } from '@/components/MonthSelector'
import { PageHeader } from '@/components/PageHeader'
import { CycleItemsDialog } from './CycleItemsDialog'
import { BillsSection } from './BillsSection'
import { BILL_LABELS } from './labels'
import { toast } from 'sonner'

const todayISO = () => new Date().toISOString().split('T')[0]

const STATUS_OPTIONS = { all: 'Todos', pending: 'Pendente', paid: 'Quitado' }

export function PlanningPage() {
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
      .then((payables) => setItems(payables.items))
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

  // O tipo do item diz o vocabulário do diálogo (pagar × receber).
  const payLabels = payTarget && BILL_LABELS[payTarget.type]

  const handleConfirmPay = async () => {
    if (!payTarget || !payLabels || !payTarget.id) return
    setPaying(true)
    try {
      if (payTarget.kind === 'bill') {
        await payBill(payTarget.id, {
          amount: Number(payAmount) || undefined,
          date: payDate,
        })
        toast.success(`Conta ${payLabels.doneFem}`)
      } else {
        // Fechar a fatura é só o ciclo; valor e data saem das transações dele.
        await payConsolidated(payTarget.id)
        toast.success('Fatura paga')
      }
      setPayTarget(null)
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Erro ao ${payLabels.verb.toLowerCase()}`)
    } finally {
      setPaying(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Compromissos"
        period={
          <div className="flex items-center gap-2">
            <MonthSelector
              month={competencia}
              onChange={(v) => setFilter('competencia', v)}
            />
            {statusFilter !== 'all' && (
              <span className="text-sm text-muted-foreground">
                · {statusFilter === 'paid' ? 'quitadas' : 'pendentes'}
              </span>
            )}
          </div>
        }
        actions={
          <>
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
                  items={STATUS_OPTIONS}
                  value={statusFilter}
                  onValueChange={(v) => setFilter('status', v === 'all' ? '' : (v ?? ''))}
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_OPTIONS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </FilterSheet>

            <Button size="icon" aria-label="Nova conta" onClick={() => navigate('/planejamento/nova')}>
              <Plus className="size-4" />
            </Button>
          </>
        }
      />

      {loading ? (
        <div className="bg-card rounded-lg border border-border">
          <LoadingState />
        </div>
      ) : (
        [TransactionType.Expense, TransactionType.Income].map((type) => (
          <BillsSection
            key={type}
            type={type}
            items={items.filter((item) => item.type === type)}
            onPay={openPayModal}
            onDelete={setDeleteId}
            onOpenCycle={setOpenCycle}
          />
        ))
      )}

      {openCycle && (
        <CycleItemsDialog
          cycle={openCycle}
          onClose={() => {
            setOpenCycle(null)
            // Dá para apagar uma conta de dentro do diálogo; a lista atrás
            // ficaria com o valor velho da fatura.
            load()
          }}
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

      {payTarget && payLabels && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-lg bg-card p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold">
              {payTarget.kind === 'bill'
                ? `${payLabels.verb} conta`
                : `${payLabels.verb} ${payTarget.description}`}
            </h3>

            <div className="flex flex-col gap-4">
              {payTarget.kind === 'bill' ? (
                <>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="payAmount">Valor {payLabels.done}</Label>
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
                    <Label htmlFor="payDate">{payLabels.dateLabel}</Label>
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
