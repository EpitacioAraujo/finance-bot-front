import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchTransactions, deleteTransaction } from './api/transactions'
import type { Transaction } from './types/transaction'
import { TransactionTable } from './components/TransactionTable'
import { LoadingState } from './components/LoadingState'
import { EmptyState } from './components/EmptyState'
import { ErrorState } from './components/ErrorState'
import { ConfirmDialog } from './components/ConfirmDialog'
import { Loader2 } from 'lucide-react'

type PageState =
  | { status: 'loading' }
  | { status: 'error'; message?: string }
  | { status: 'empty' }
  | { status: 'loaded'; data: Transaction[]; cursor?: string }
  | { status: 'loading-more'; data: Transaction[]; cursor?: string }

export function App() {
  const [state, setState] = useState<PageState>({ status: 'loading' })
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const loaderRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchTransactions()
      .then((result) => {
        if (result.data.length === 0) {
          setState({ status: 'empty' })
        } else {
          setState({ status: 'loaded', data: result.data, cursor: result.nextCursor })
        }
      })
      .catch((err: Error) => {
        setState({ status: 'error', message: err.message })
      })
  }, [])

  const loadMore = useCallback(() => {
    if (state.status !== 'loaded' && state.status !== 'loading-more') return
    const cursor = state.status === 'loaded' ? state.cursor : state.cursor
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
          const currentData = prev.status === 'loaded' || prev.status === 'loading-more' ? prev.data : []
          const merged = [...currentData, ...result.data]
          setState({ status: 'loaded', data: merged, cursor: result.nextCursor })
          return { status: 'loaded', data: merged, cursor: result.nextCursor }
        })
      })
      .catch(() => {
        setState((prev) => {
          const currentData = prev.status === 'loaded' || prev.status === 'loading-more' ? prev.data : []
          return { status: 'loaded', data: currentData, cursor: undefined }
        })
      })
  }, [state])

  const handleDelete = useCallback((id: string) => {
    setDeleteError(null)
    setConfirmDeleteId(id)
  }, [])

  const handleConfirmDelete = useCallback(async () => {
    if (!confirmDeleteId) return
    setDeleting(true)
    setDeleteError(null)

    try {
      await deleteTransaction(confirmDeleteId)
      setState((prev) => {
        if (prev.status !== 'loaded' && prev.status !== 'loading-more') return prev
        const filtered = prev.data.filter((t) => t.id !== confirmDeleteId)
        return filtered.length === 0
          ? { status: 'empty' }
          : { ...prev, data: filtered }
      })
      setConfirmDeleteId(null)
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Erro ao remover transação')
    } finally {
      setDeleting(false)
    }
  }, [confirmDeleteId])

  const handleCancelDelete = useCallback(() => {
    setConfirmDeleteId(null)
    setDeleteError(null)
  }, [])

  const confirmTransaction = confirmDeleteId
    ? state.status === 'loaded' || state.status === 'loading-more'
      ? state.data.find((t) => t.id === confirmDeleteId)
      : undefined
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
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <h1 className="text-lg font-semibold text-foreground">Finance Bot</h1>
          <p className="text-sm text-muted-foreground">Transações</p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="bg-card rounded-lg border border-border">
          {state.status === 'loading' && <LoadingState />}
          {state.status === 'error' && <ErrorState message={state.message} />}
          {state.status === 'empty' && <EmptyState />}
          {(state.status === 'loaded' || state.status === 'loading-more') && (
            <>
              {deleteError && (
                <div className="px-4 py-3 bg-destructive/10 border-b border-destructive/20">
                  <p className="text-sm text-destructive">{deleteError}</p>
                </div>
              )}
              <TransactionTable
                transactions={state.data}
                selectedIds={new Set()}
                onToggleSelect={() => {}}
                onToggleSelectAll={() => {}}
                onDelete={handleDelete}
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
      </main>

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
    </div>
  )
}
