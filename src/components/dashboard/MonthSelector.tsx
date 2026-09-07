import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface MonthSelectorProps {
  month: string
  onChange: (month: string) => void
}

export function MonthSelector({ month, onChange }: MonthSelectorProps) {
  const [year, monthNum] = month.split('-').map(Number)
  const date = new Date(year, monthNum - 1, 1)

  const label = date.toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  })

  const goToPrev = () => {
    const prev = new Date(year, monthNum - 2, 1)
    const y = prev.getFullYear()
    const m = String(prev.getMonth() + 1).padStart(2, '0')
    onChange(`${y}-${m}`)
  }

  const goToNext = () => {
    const next = new Date(year, monthNum, 1)
    const y = next.getFullYear()
    const m = String(next.getMonth() + 1).padStart(2, '0')
    onChange(`${y}-${m}`)
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="icon-sm" onClick={goToPrev} aria-label="Mes anterior">
        <ChevronLeft className="size-4" />
      </Button>
      <span className="min-w-[140px] text-center text-lg font-medium capitalize">
        {label}
      </span>
      <Button variant="ghost" size="icon-sm" onClick={goToNext} aria-label="Proximo mes">
        <ChevronRight className="size-4" />
      </Button>
    </div>
  )
}
