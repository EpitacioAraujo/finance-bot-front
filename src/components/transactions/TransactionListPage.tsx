import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchTransactions, deleteTransaction, bulkDeleteTransactions } from '@/api/transactions'
import type { Transaction } from '@/types/transaction'
import { TransactionTable } from '@/components/TransactionTable'
import { LoadingState } from '@/components/LoadingState'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Plus, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'

type PageState =
  | { status: 'loading' }
  | { status: 'error'; message?: string }
  | { status: 'empty' }
  | { status: 'loaded'; data: Transaction[]; cursor?: string }
  | { status: 'loading-more'; data: Transaction[]; cursor?: string }

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

  useEffect(() => {
    fetchTransactions()
      .then((result) => {
        if (result.data.length === 0) {
          setState({ status: 'empty' })
        } else {
          setState({
            status: 'loaded',
            data: result.data,
            cursor: result.nextCursor,
          })
        }
      })
      .catch((err: Error) => {
        setState({ status: 'error', message: err.message })
      })
  }, [])

  const loadMore = useCallback(() => {
    if (state.status !== 'loaded' && state.status !== 'loading-more') return
    const cursor =
      state.status === 'loaded' ? state.cursor : state.cursor
    if (!cursor) return

    setState((prev) => {
      if (prev.status === 'loaded') {
        return { status: 'loading-more', data: prev.data, cursor: prev.cursor }
      }
      if (prev.status === 'loading-more') return prev
      return prev
    })

    fetchTransactions(cursor)
      .then((result) => {
        setState((prev) => {
          const currentData =
            prev.status === 'loaded' || prev.status === 'loading-more'
              ? prev.data
              : []
          const merged = [...currentData, ...result.data]
          return {
            status: 'loaded',
            data: merged,
            cursor: result.nextCursor,
          }
        })
      })
      .catch(() => {
        setState((prev) => {
          const currentData =
            prev.status === 'loaded' || prev.status === 'loading-more'
              ? prev.data
              : []
          return { status: 'loaded', data: currentData, cursor: undefined }
        })
      })
  }, [state])

  const handleDelete = useCallback((id: string) => {
    setDeleteError(null)
    setConfirmDeleteId(id)
  }, [])

  const handleEdit = useCallback(
    (id: string) => {
      navigate(`/transactions/${id}/edit`)
    },
    [navigate],
  )

  const handleConfirmDelete = useCallback(async () => {
    if (!confirmDeleteId) return
    setDeleting(true)
    setDeleteError(null)

    try {
      await deleteTransaction(confirmDeleteId)
      setState((prev) => {
        if (prev.status !== 'loaded' && prev.status !== 'loading-more')
          return prev
        const filtered = prev.data.filter((t) => t.id !== confirmDeleteId)
        return filtered.length === 0
          ? { status: 'empty' }
          : { ...prev, data: filtered }
      })
      setConfirmDeleteId(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao remover transação'
      if (
        message.includes('não encontrada') ||
        message.includes('not found')
      ) {
        setState((prev) => {
          if (prev.status !== 'loaded' && prev.status !== 'loading-more')
            return prev
          const filtered = prev.data.filter((t) => t.id !== confirmDeleteId)
          return filtered.length === 0
            ? { status: 'empty' }
            : { ...prev, data: filtered }
        })
        setConfirmDeleteId(null)
      } else {
        setDeleteError(message)
      }
    } finally {
      setDeleting(false)
    }
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
      await bulkDeleteTransactions(ids)
      setSelectedIds(new Set())
      setBulkDeleteOpen(false)
      setState((prev) => {
        if (prev.status !== 'loaded' && prev.status !== 'loading-more')
          return prev
        const idSet = new Set(ids)
        const filtered = prev.data.filter((t) => !idSet.has(t.id))
        return filtered.length === 0
          ? { status: 'empty' }
          : { ...prev, data: filtered }
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Transações</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie suas receitas e despesas
          </p>
        </div>
        <Button onClick={() => navigate('/transactions/new')}>
          <Plus className="size-4" />
          Nova Transação
        </Button>
      </div>

      <div className="bg-card rounded-lg border border-border">
        {state.status === 'loading' && <LoadingState />}
        {state.status === 'error' && <ErrorState message={state.message} />}
        {state.status === 'empty' && <EmptyState />}
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
            />
            {state.cursor && (
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
    </div>
  )
}
