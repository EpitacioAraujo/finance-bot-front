import { Inbox } from 'lucide-react'

export function EmptyState({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
        <Inbox className="size-6 text-muted-foreground" />
      </div>
      <p className="text-sm text-muted-foreground">
        {message ?? 'Nenhuma transação encontrada'}
      </p>
    </div>
  )
}
