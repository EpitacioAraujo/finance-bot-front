import { useCallback, useEffect, useState } from 'react'
import { listTranchesDue, deleteTransaction } from '@/api/transactions'
import { ApiError } from '@/lib/api'
import { listPaymentMethods } from '@/api/payment-methods'
import { listTags } from '@/api/tags'
import type { PaymentMethod } from '@/types/payment-method'
import type { Tag } from '@/types/tag'
import { TransactionType } from '@/types/transaction'
import { competenciaAtual, monthRange } from '@/lib/format'
import { MonthSelector } from '@/components/MonthSelector'
import { FilterSheet } from '@/components/FilterSheet'
import { PageHeader } from '@/components/PageHeader'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { TrancheDue } from '@/types/transaction'
import { TrancheTable } from '@/components/TrancheTable'
import { LoadingState } from '@/components/LoadingState'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import {
  Outlet,
  useLocation,
  useNavigate,
  useSearchParams,
} from 'react-router-dom'

type PageState =
  | { status: 'loading' }
  | { status: 'error'; message?: string }
  | { status: 'loaded'; data: TrancheDue[]; total: number }

/**
 * Um mês de parcelas cabe numa página; o rodapé avisa se não couber.
 * ponytail: teto de 200, vira scroll infinito se alguém passar disso.
 */
const LIMIT = 200

export function TransactionListPage() {
  const navigate = useNavigate()
  const [state, setState] = useState<PageState>({ status: 'loading' })
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const location = useLocation()
  // A lista fica montada atrás do modal do formulário, então salvar não a
  // remonta mais: o form avisa por state e isto recarrega.
  const savedAt = (location.state as { saved?: number } | null)?.saved

  // O filtro mora na URL — é o que faz o link vindo de Contas a Pagar chegar
  // aqui já filtrado, e o que sobrevive a abrir e fechar os modais.
  const [searchParams, setSearchParams] = useSearchParams()
  const paymentMethodId = searchParams.get('paymentMethodId') ?? ''
  const tagId = searchParams.get('tagId') ?? ''
  const type = searchParams.get('type') ?? ''
  const currentMonth = competenciaAtual()
  const competencia = searchParams.get('competencia') ?? currentMonth
  // O mês é navegação, não filtro: entra na contagem da sheet mas não na faixa.
  const fieldFilters = [paymentMethodId, tagId, type].filter(Boolean).length
  const activeFilters = fieldFilters + (competencia !== currentMonth ? 1 : 0)

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [tags, setTags] = useState<Tag[]>([])

  useEffect(() => {
    Promise.all([listPaymentMethods(), listTags()])
      .then(([pms, tgs]) => {
        setPaymentMethods(pms)
        setTags(tgs)
      })
      .catch(() => undefined)
  }, [])

  // Cada controle escreve direto na URL: sem estado paralelo, sem botão de
  // aplicar, e o link que vem de Contas a Pagar já cai filtrado.
  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value)
    else next.delete(key)
    setSearchParams(next)
  }

  const query = {
    ...monthRange(competencia),
    paymentMethodId: paymentMethodId || undefined,
    tagId: tagId || undefined,
    type: (type || undefined) as TransactionType | undefined,
  }

  useEffect(() => {
    setState({ status: 'loading' })
    listTranchesDue({ ...query, limit: LIMIT, offset: 0 })
      .then((result) =>
        setState({ status: 'loaded', data: result.items, total: result.total }),
      )
      .catch((err: Error) => setState({ status: 'error', message: err.message }))
  }, [savedAt, competencia, paymentMethodId, tagId, type])

  /** Tira da tela toda linha das compras removidas — inclusive as irmãs. */
  const dropTransactions = useCallback((ids: string[]) => {
    const gone = new Set(ids)
    setState((prev) =>
      prev.status === 'loaded'
        ? {
            ...prev,
            data: prev.data.filter((t) => !gone.has(t.transactionId)),
            total: prev.data.filter((t) => !gone.has(t.transactionId)).length,
          }
        : prev,
    )
  }, [])

  const handleDelete = useCallback((transactionId: string) => {
    setDeleteError(null)
    setConfirmDeleteId(transactionId)
  }, [])

  const handleEdit = useCallback(
    (id: string) => {
      navigate({ pathname: `/transactions/${id}`, search: location.search })
    },
    [navigate, location.search],
  )

  const handleOpen = useCallback(
    (id: string) => {
      navigate({
        pathname: `/transactions/${id}/details`,
        search: location.search,
      })
    },
    [navigate, location.search],
  )

  const handleConfirmDelete = useCallback(async () => {
    if (!confirmDeleteId) return
    setDeleting(true)
    setDeleteError(null)

    try {
      await deleteTransaction(confirmDeleteId)
    } catch (err) {
      // 404 é "já sumiu" (o bot apagou antes): some da lista do mesmo jeito.
      if (!(err instanceof ApiError && err.status === 404)) {
        setDeleteError(err instanceof Error ? err.message : 'Erro ao remover transação')
        setDeleting(false)
        return
      }
    }
    dropTransactions([confirmDeleteId])
    setConfirmDeleteId(null)
    setDeleting(false)
  }, [confirmDeleteId, dropTransactions])

  const handleCancelDelete = useCallback(() => {
    setConfirmDeleteId(null)
    setDeleteError(null)
  }, [])

  const confirmTranche =
    confirmDeleteId && state.status === 'loaded'
      ? state.data.find((t) => t.transactionId === confirmDeleteId)
      : undefined

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Transações"
        period={
          <MonthSelector
            month={competencia}
            onChange={(v) => setFilter('competencia', v)}
          />
        }
        actions={
          <>
            <FilterSheet
              active={activeFilters}
              onClear={() => setSearchParams({})}
            >
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="f-type">Tipo</Label>
                <Select
                  items={{ '': 'Todos', [TransactionType.Expense]: 'Despesas', [TransactionType.Income]: 'Receitas' }}
                  value={type}
                  onValueChange={(v) => setFilter('type', v ?? '')}
                >
                  <SelectTrigger id="f-type">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos</SelectItem>
                    <SelectItem value={TransactionType.Expense}>Despesas</SelectItem>
                    <SelectItem value={TransactionType.Income}>Receitas</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="f-pm">Forma de pagamento</Label>
                <Select
                  items={[
                    { value: '', label: 'Todas' },
                    ...paymentMethods.map((pm) => ({
                      value: pm.id,
                      label: pm.description,
                    })),
                  ]}
                  value={paymentMethodId}
                  onValueChange={(v) => setFilter('paymentMethodId', v ?? '')}
                >
                  <SelectTrigger id="f-pm">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todas</SelectItem>
                    {paymentMethods.map((pm) => (
                      <SelectItem key={pm.id} value={pm.id}>
                        {pm.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="f-tag">Tag</Label>
                <Select
                  items={[
                    { value: '', label: 'Todas' },
                    ...tags.map((tag) => ({
                      value: tag.id,
                      label: tag.description,
                    })),
                  ]}
                  value={tagId}
                  onValueChange={(v) => setFilter('tagId', v ?? '')}
                >
                  <SelectTrigger id="f-tag">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todas</SelectItem>
                    {tags.map((tag) => (
                      <SelectItem key={tag.id} value={tag.id}>
                        {tag.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="f-comp">Mês</Label>
                <Input
                  id="f-comp"
                  type="month"
                  value={competencia}
                  onChange={(e) => setFilter('competencia', e.target.value)}
                />
              </div>
            </FilterSheet>

            <Button
              size="icon"
              aria-label="Nova transação"
              onClick={() =>
                navigate({ pathname: '/transactions/new', search: location.search })
              }
            >
              <Plus className="size-4" />
            </Button>
          </>
        }
      />

      {fieldFilters > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm">
          <span className="text-muted-foreground">Filtrado por</span>
          {[
            paymentMethods.find((pm) => pm.id === paymentMethodId)?.description,
            tags.find((tag) => tag.id === tagId)?.description,
            type ? (type === TransactionType.Income ? 'Receitas' : 'Despesas') : undefined,
          ]
            .filter(Boolean)
            .map((label) => (
              <span key={label} className="font-medium">
                {label}
              </span>
            ))}
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto"
            onClick={() => setSearchParams({})}
          >
            Limpar filtro
          </Button>
        </div>
      )}

      <div className="bg-card rounded-lg border border-border">
        {state.status === 'loading' && <LoadingState />}
        {state.status === 'error' && <ErrorState message={state.message} />}
        {state.status === 'loaded' && state.data.length === 0 && (
          <EmptyState
            message={
              activeFilters > 0
                ? 'Nada vence neste mês com os filtros atuais.'
                : 'Nada vence neste mês.'
            }
          />
        )}
        {state.status === 'loaded' && state.data.length > 0 && (
          <>
            {deleteError && (
              <div className="px-4 py-3 bg-destructive/10 border-b border-destructive/20">
                <p className="text-sm text-destructive">{deleteError}</p>
              </div>
            )}
            <TrancheTable
              tranches={state.data}
              onDelete={handleDelete}
              onEdit={handleEdit}
              onOpen={handleOpen}
            />
            {state.total > state.data.length && (
              <p className="px-4 py-3 text-sm text-muted-foreground">
                Mostrando {state.data.length} de {state.total}.
              </p>
            )}
          </>
        )}
      </div>

      <ConfirmDialog
        open={confirmDeleteId !== null}
        title="Remover transação"
        message={
          confirmTranche
            ? `Remover "${confirmTranche.description}"? A compra inteira sai${
                confirmTranche.installments > 1
                  ? `, com as ${confirmTranche.installments} parcelas`
                  : ''
              }.`
            : 'Tem certeza que deseja remover esta transação?'
        }
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />

      {/* O formulário é rota filha: abre como modal por cima desta lista. */}
      <Outlet />
    </div>
  )
}
