import { Fragment, useCallback, useEffect, useState } from 'react'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { LoadingState } from '@/components/LoadingState'
import { EmptyState } from '@/components/EmptyState'
import { MonthSelector } from '@/components/MonthSelector'
import { PageHeader } from '@/components/PageHeader'
import { listPayables, deleteBill, payBill, payConsolidated } from '@/api/bills'
import type { RecurrenceGroup, RecurrenceLine } from '@/types/bill'
import { TransactionType } from '@/types/transaction'
import { competenciaAtual, formatCurrency, formatDate, monthRange, shortDate } from '@/lib/format'
import { Plus, Pencil, Trash2, Check } from 'lucide-react'
import { toast } from 'sonner'
import { BILL_LABELS } from './labels'

const todayISO = () => new Date().toISOString().split('T')[0]

/** O que o diálogo de pagar está quitando: uma fatura inteira ou uma conta. */
type PayTarget =
  | { kind: 'invoice'; cycleId: string; description: string; amount: number }
  | { kind: 'bill'; line: RecurrenceLine; type: TransactionType }

/**
 * A tela: o que eu pago e o que eu recebo neste mês, agrupado por onde passa.
 *
 * Num cartão o cabeçalho do grupo **é a fatura** — valor do mês, vencimento e
 * um botão que quita tudo. As contas debaixo dele não têm botão: o dinheiro
 * delas sai pela fatura, e dois botões fariam pagar o mesmo valor duas vezes.
 * Fora do cartão não há fatura, então cada conta tem o seu.
 */
export function RecurrencesPage() {
  const navigate = useNavigate()
  // Filtro na URL: a competência é o que a tela inteira enxerga, então tem que
  // sobreviver a recarregar e a compartilhar o link.
  const [searchParams, setSearchParams] = useSearchParams()
  const competencia = searchParams.get('competencia') ?? competenciaAtual()

  const [loading, setLoading] = useState(true)
  const [groups, setGroups] = useState<RecurrenceGroup[]>([])
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [payTarget, setPayTarget] = useState<PayTarget | null>(null)
  const [payAmount, setPayAmount] = useState('')
  const [payDate, setPayDate] = useState(todayISO())
  const [paying, setPaying] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    listPayables(monthRange(competencia))
      .then((result) => setGroups(result.groups))
      .catch(() => toast.error('Erro ao carregar recorrências'))
      .finally(() => setLoading(false))
  }, [competencia])

  useEffect(load, [load])

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await deleteBill(deleteId)
      toast.success('Recorrência removida')
      load()
    } catch {
      toast.error('Erro ao remover')
    } finally {
      setDeleteId(null)
    }
  }

  const openPay = (target: PayTarget) => {
    setPayAmount(String(target.kind === 'bill' ? target.line.amount : target.amount))
    setPayDate(todayISO())
    setPayTarget(target)
  }

  const labels = payTarget
    ? BILL_LABELS[payTarget.kind === 'bill' ? payTarget.type : TransactionType.Expense]
    : null

  const confirmPay = async () => {
    if (!payTarget || !labels) return
    setPaying(true)
    try {
      if (payTarget.kind === 'bill') {
        await payBill(payTarget.line.billId, {
          amount: Number(payAmount) || undefined,
          date: payDate,
        })
        toast.success(`Conta ${labels.doneFem}`)
      } else {
        // Fechar a fatura é só o ciclo; valor e data saem das transações dele.
        await payConsolidated(payTarget.cycleId)
        toast.success('Fatura paga')
      }
      setPayTarget(null)
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não deu para pagar')
    } finally {
      setPaying(false)
    }
  }

  const badge = (status: 'paid' | 'pending', type: TransactionType) => (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
        status === 'paid'
          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
          : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
      }`}
    >
      {status === 'paid' ? BILL_LABELS[type].done : 'Pendente'}
    </span>
  )

  const section = (type: TransactionType) => {
    const rows = groups.filter((group) => group.type === type)
    const L = BILL_LABELS[type]

    return (
      <section key={type} className="flex flex-col gap-2">
        <h2 className="text-base font-semibold">{L.title}</h2>

        {rows.length === 0 ? (
          <div className="bg-card rounded-lg border border-border">
            <EmptyState message={L.empty} />
          </div>
        ) : (
          <div className="bg-card rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="w-28 text-right">
                    <span className="sr-only">Ações</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((group) => {
                  const invoice = group.invoice

                  return (
                    <Fragment key={`${group.type}-${group.paymentMethod.id}`}>
                      <TableRow className="bg-muted/50 hover:bg-muted/50">
                        <TableCell className="font-medium whitespace-normal">
                          <div className="flex flex-wrap items-center gap-2">
                            <span>{group.paymentMethod.description}</span>
                            {invoice && (
                              <>
                                <span className="text-xs font-normal text-muted-foreground tabular-nums">
                                  {shortDate(invoice.startDate)} a{' '}
                                  {shortDate(invoice.endDate)}
                                </span>
                                {badge(invoice.status, group.type)}
                              </>
                            )}
                          </div>
                          {invoice && (
                            <div className="text-xs font-normal text-muted-foreground">
                              fatura vence {formatDate(invoice.dueDate)}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {invoice && formatCurrency(invoice.total)}
                        </TableCell>
                        <TableCell className="text-right">
                          {/* Sem cycleId a fatura ainda não existe no banco:
                              não há o que fechar. */}
                          {invoice?.status === 'pending' && invoice.cycleId && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                openPay({
                                  kind: 'invoice',
                                  cycleId: invoice.cycleId!,
                                  description: group.paymentMethod.description,
                                  amount: invoice.total,
                                })
                              }
                            >
                              <Check className="size-3.5 text-green-600" />
                              Pagar fatura
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>

                      {group.items.map((line) => (
                        <TableRow
                          key={line.key}
                          className="cursor-pointer"
                          onClick={() =>
                            navigate(`/recorrencias/${line.billId}/editar`)
                          }
                        >
                          <TableCell className="pl-8 whitespace-normal">
                            <div className="flex flex-wrap items-center gap-2">
                              <span>{line.description}</span>
                              {badge(line.status, group.type)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {line.payable ? 'vence' : 'cobra'}{' '}
                              {formatDate(line.date)}
                            </div>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatCurrency(line.amount)}
                          </TableCell>
                          <TableCell
                            className="text-right"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex justify-end gap-1">
                              {line.payable && line.status === 'pending' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    openPay({ kind: 'bill', line, type: group.type })
                                  }
                                >
                                  <Check className="size-3.5 text-green-600" />
                                  {L.verb}
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                aria-label="Editar recorrência"
                                onClick={() =>
                                  navigate(`/recorrencias/${line.billId}/editar`)
                                }
                              >
                                <Pencil className="size-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                aria-label="Remover recorrência"
                                onClick={() => setDeleteId(line.billId)}
                              >
                                <Trash2 className="size-3 text-red-500" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </Fragment>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Recorrências"
        period={
          <MonthSelector
            month={competencia}
            onChange={(v) => setSearchParams(v ? { competencia: v } : {})}
          />
        }
        actions={
          <Button
            size="icon"
            aria-label="Nova recorrência"
            onClick={() => navigate('/recorrencias/nova')}
          >
            <Plus className="size-4" />
          </Button>
        }
      />

      {loading ? (
        <div className="bg-card rounded-lg border border-border">
          <LoadingState />
        </div>
      ) : (
        [TransactionType.Expense, TransactionType.Income].map(section)
      )}

      <ConfirmDialog
        open={deleteId !== null}
        title="Remover recorrência"
        message="Tem certeza que deseja remover esta recorrência?"
        loading={false}
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />

      {payTarget && labels && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-lg bg-card p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold">
              {payTarget.kind === 'invoice'
                ? `Pagar fatura ${payTarget.description}`
                : `${labels.verb} ${payTarget.line.description}`}
            </h3>

            <div className="flex flex-col gap-4">
              {payTarget.kind === 'bill' ? (
                <>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="payAmount">Valor {labels.done}</Label>
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
                    <Label htmlFor="payDate">{labels.dateLabel}</Label>
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
                  Quita a fatura inteira —{' '}
                  <span className="font-medium text-foreground">
                    {formatCurrency(payTarget.amount)}
                  </span>
                  .
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setPayTarget(null)}
                  disabled={paying}
                >
                  Cancelar
                </Button>
                <Button onClick={confirmPay} disabled={paying}>
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
