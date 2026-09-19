import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  period: ReactNode
  actions?: ReactNode
}

/**
 * Desktop: título | período | ações numa linha. Abaixo de md o período desce
 * para uma segunda linha, centralizado, 20px abaixo de título + ações.
 */
export function PageHeader({ title, period, actions }: PageHeaderProps) {
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-y-5 md:grid-cols-[1fr_auto_1fr]">
      <h1 className="text-xl font-semibold">{title}</h1>
      <div className="max-md:order-last max-md:col-span-2 max-md:justify-self-center">
        {period}
      </div>
      <div className="flex items-center justify-end gap-2">{actions}</div>
    </div>
  )
}
