import * as React from 'react'
import { cn } from '@/lib/utils'

interface CheckboxProps {
  checked?: boolean
  onCheckedChange?: () => void
  'data-state'?: 'checked' | 'unchecked' | 'indeterminate'
  'aria-label'?: string
  className?: string
}

export function Checkbox({
  checked,
  onCheckedChange,
  'data-state': dataState,
  'aria-label': ariaLabel,
  className,
}: CheckboxProps) {
  const ref = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (ref.current) {
      ref.current.indeterminate = dataState === 'indeterminate'
    }
  }, [dataState])

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={onCheckedChange}
      data-state={dataState ?? (checked ? 'checked' : 'unchecked')}
      aria-label={ariaLabel}
      className={cn(
        'size-4 shrink-0 rounded border border-input ring-offset-background',
        'accent-primary cursor-pointer',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        className,
      )}
    />
  )
}
