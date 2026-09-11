import type { ReactNode } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

interface FilterSheetProps {
  /** Quantos filtros estão fora do padrão — vira o contador no ícone. */
  active: number
  onClear: () => void
  children: ReactNode
}

/**
 * Painel lateral no desktop; abaixo de md ocupa a tela inteira. O Sheet já
 * entra pela direita, só a largura precisa de ajuste no mobile.
 */
export function FilterSheet({ active, onClear, children }: FilterSheetProps) {
  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button variant="outline" size="icon" className="relative" aria-label="Filtros" />
        }
      >
        <SlidersHorizontal className="size-4" />
        {active > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
            {active}
          </span>
        )}
      </SheetTrigger>

      <SheetContent side="right" className="max-md:w-full max-md:max-w-none">
        <SheetHeader>
          <SheetTitle>Filtros</SheetTitle>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4">
          {children}
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={onClear} disabled={active === 0}>
            Limpar filtros
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
