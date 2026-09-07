import { NumericFormat, type NumberFormatValues } from 'react-number-format'
import { Input } from '@/components/ui/input'

interface CurrencyInputProps {
  value: number
  onChange: (value: number) => void
  placeholder?: string
  id?: string
  required?: boolean
  className?: string
}

export function CurrencyInput({
  value,
  onChange,
  placeholder = 'R$ 0,00',
  id,
  required,
  className,
}: CurrencyInputProps) {
  return (
    <NumericFormat
      id={id}
      value={value}
      onValueChange={(vs: NumberFormatValues) => onChange(vs.floatValue ?? 0)}
      thousandSeparator="."
      decimalSeparator=","
      prefix="R$ "
      decimalScale={2}
      fixedDecimalScale
      placeholder={placeholder}
      required={required}
      className={className}
      customInput={Input as any}
    />
  )
}
