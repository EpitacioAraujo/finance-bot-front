import { useCallback, useEffect, useRef, useState } from 'react'
import { listTransactions, deleteTransaction, deleteTransactions } from '@/api/transactions'
import { ApiError } from '@/lib/api'
import { listPaymentMethods } from '@/api/payment-methods'
import { listTags } from '@/api/tags'
import type { PaymentMethod } from '@/types/payment-method'
import type { Tag } from '@/types/tag'
import { competenciaAtual, monthRange } from '@/lib/format'
import { MonthSelector } from '@/components/MonthSelector'
import { FilterSheet } from '@/components/FilterSheet'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Transaction } from '@/types/transaction'
import { TransactionTable } from '@/components/TransactionTable'
import { LoadingState } from '@/components/LoadingState'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Plus, Trash2 } from 'lucide-react'
import {
  Outlet,
  useLocation,
  useNavigate,
  useSearchParams,
} from 'react-router-dom'
import { Loader2 } from 'lucide-react'

type PageState =
  | { status: 'loading' }
  | { status: 'error'; message?: string }
  | { status: 'empty' }
  | { status: 'loaded'; data: Transaction[]; total: number }
  | { status: 'loading-more'; data: Transaction[]; total: number }

const PAGE_SIZE = 20

export function TransactionListPage() {
  const navigate = useNavigate()
  const [state, setState] = useState<PageState>({ status: 'loading' })
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [bulkDeleteError, setBulkDeleteError] = useState<string | null>(null)
  const loaderRef = useRef<HTMLDivElement>(null)
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
    type: (type || undefined) as 'income' | 'expense' | undefined,
  }

  useEffect(() => {
    listTransactions({ ...query, limit: PAGE_SIZE, offset: 0 })
      .then((result) => {
        if (result.items.length === 0) {
          setState({ status: 'empty' })
        } else {
          setState({
            status: 'loaded',
            data: result.items,
            total: result.total,
          })
        }
      })
      .catch((err: Error) => {
        setState({ status: 'error', message: err.message })
      })
  }, [savedAt, competencia, paymentMethodId, tagId, type])

  const loadMore = useCallback(() => {
    if (state.status !== 'loaded') return
    if (state.data.length >= state.total) return

    const offset = state.data.length
    setState({ status: 'loading-more', data: state.data, total: state.total })

    listTransactions({ ...query, limit: PAGE_SIZE, offset })
      .then((result) => {
        setState((prev) => {
          const currentData =
            prev.status === 'loaded' || prev.status === 'loading-more'
              ? prev.data
              : []
          return {
            status: 'loaded',
            data: [...currentData, ...result.items],
            total: result.total,
          }
        })
      })
      .catch(() => {
        setState((prev) => {
          if (prev.status !== 'loading-more') return prev
          // Sem mais páginas: `total` vira o que já está em tela e o observer para.
          return { status: 'loaded', data: prev.data, total: prev.data.length }
        })
      })
  }, [state, competencia, paymentMethodId, tagId, type])

  const handleDelete = useCallback((id: string) => {
    setDeleteError(null)
    setConfirmDeleteId(id)
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
    setState((prev) => {
      if (prev.status !== 'loaded' && prev.status !== 'loading-more')
        return prev
      const filtered = prev.data.filter((t) => t.id !== confirmDeleteId)
      return filtered.length === 0
        ? { status: 'empty' }
        : { ...prev, data: filtered, total: prev.total - 1 }
    })
    setConfirmDeleteId(null)
    setDeleting(false)
  }, [confirmDeleteId])

  const handleCancelDelete = useCallback(() => {
    setConfirmDeleteId(null)
    setDeleteError(null)
  }, [])

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const handleToggleSelectAll = useCallback(() => {
    if (state.status !== 'loaded' && state.status !== 'loading-more') return
    const allSelected = state.data.every((t) => selectedIds.has(t.id))
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(state.data.map((t) => t.id)))
    }
  }, [state, selectedIds])

  const handleBulkDelete = useCallback(() => {
    setBulkDeleteError(null)
    setBulkDeleteOpen(true)
  }, [])

  const handleConfirmBulkDelete = useCallback(async () => {
    if (selectedIds.size === 0) return
    setBulkDeleting(true)
    setBulkDeleteError(null)

    const ids = Array.from(selectedIds)
    try {
      await deleteTransactions(ids)
      setSelectedIds(new Set())
      setBulkDeleteOpen(false)
      setState((prev) => {
        if (prev.status !== 'loaded' && prev.status !== 'loading-more')
          return prev
        const idSet = new Set(ids)
        const filtered = prev.data.filter((t) => !idSet.has(t.id))
        return filtered.length === 0
          ? { status: 'empty' }
          : { ...prev, data: filtered, total: prev.total - ids.length }
      })
    } catch (err) {
      setBulkDeleteError(
        err instanceof Error ? err.message : 'Erro ao remover transações',
      )
    } finally {
      setBulkDeleting(false)
    }
  }, [selectedIds])

  const handleCancelBulkDelete = useCallback(() => {
    setBulkDeleteOpen(false)
    setBulkDeleteError(null)
  }, [])

  const confirmTransaction =
    confirmDeleteId && (state.status === 'loaded' || state.status === 'loading-more')
      ? state.data.find((t) => t.id === confirmDeleteId)
      : undefined

  useEffect(() => {
    const el = loaderRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore()
      },
      { threshold: 0.1 },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [loadMore])

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center">
        <h1 className="text-xl font-semibold">Transações</h1>
        <MonthSelector
          month={competencia}
          onChange={(v) => setFilter('competencia', v)}
        />
        <div className="flex items-center justify-end gap-2">
          <FilterSheet
            active={activeFilters}
            onClear={() => setSearchParams({})}
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="f-type">Tipo</Label>
              <Select
                items={{ '': 'Todos', expense: 'Despesas', income: 'Receitas' }}
                value={type}
                onValueChange={(v) => setFilter('type', v ?? '')}
              >
                <SelectTrigger id="f-type">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  <SelectItem value="expense">Despesas</SelectItem>
                  <SelectItem value="income">Receitas</SelectItem>
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
              <Label htmlFor="f-comp">Competência</Label>
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
        </div>
      </div>

      {fieldFilters > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm">
          <span className="text-muted-foreground">Filtrado por</span>
          {[
            paymentMethods.find((pm) => pm.id === paymentMethodId)?.description,
            tags.find((tag) => tag.id === tagId)?.description,
            type ? (type === 'income' ? 'Receitas' : 'Despesas') : undefined,
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
        {state.status === 'empty' && (
          <EmptyState
            message={
              activeFilters > 0
                ? 'Nenhuma transação com os filtros atuais.'
                : undefined
            }
          />
        )}
        {(state.status === 'loaded' || state.status === 'loading-more') && (
          <>
            {selectedIds.size > 0 && (
              <div className="px-4 py-2 bg-accent border-b border-border flex items-center justify-between">
                <span className="text-sm font-medium">
                  {selectedIds.size} selecionada{selectedIds.size > 1 ? 's' : ''}
                </span>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBulkDelete}
                  disabled={bulkDeleting}
                >
                  <Trash2 className="size-4" />
                  Remover selecionada{selectedIds.size > 1 ? 's' : ''}
                </Button>
              </div>
            )}
            {bulkDeleteError && (
              <div className="px-4 py-3 bg-destructive/10 border-b border-destructive/20">
                <p className="text-sm text-destructive">{bulkDeleteError}</p>
              </div>
            )}
            {deleteError && (
              <div className="px-4 py-3 bg-destructive/10 border-b border-destructive/20">
                <p className="text-sm text-destructive">{deleteError}</p>
              </div>
            )}
            <TransactionTable
              transactions={state.data}
              selectedIds={selectedIds}
              onToggleSelect={handleToggleSelect}
              onToggleSelectAll={handleToggleSelectAll}
              onDelete={handleDelete}
              onEdit={handleEdit}
              onOpen={handleOpen}
            />
            {state.data.length < state.total && (
              <div ref={loaderRef} className="py-6">
                {state.status === 'loading-more' && (
                  <div className="flex justify-center">
                    <Loader2 className="size-6 animate-spin text-muted-foreground" />
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <ConfirmDialog
        open={confirmDeleteId !== null}
        title="Remover transação"
        message={
          confirmTransaction
            ? `Tem certeza que deseja remover "${confirmTransaction.description}" (${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(confirmTransaction.amount))})?`
            : 'Tem certeza que deseja remover esta transação?'
        }
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />

      <ConfirmDialog
        open={bulkDeleteOpen}
        title="Remover transações"
        message={`Tem certeza que deseja remover ${selectedIds.size} transação${selectedIds.size > 1 ? 'ões' : ''}?`}
        loading={bulkDeleting}
        onConfirm={handleConfirmBulkDelete}
        onCancel={handleCancelBulkDelete}
      />

      {/* O formulário é rota filha: abre como modal por cima desta lista. */}
      <Outlet />
    </div>
  )
}
