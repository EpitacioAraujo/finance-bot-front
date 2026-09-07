import { AlertCircle } from 'lucide-react'

interface ErrorStateProps {
  message?: string
}

export function ErrorState({ message }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-destructive/10">
        <AlertCircle className="size-6 text-destructive" />
      </div>
      <p className="text-sm text-muted-foreground">
        {message ?? 'Não foi possível carregar as transações. Tente novamente mais tarde.'}
      </p>
    </div>
  )
}
