import { useState } from 'react'
import { Check, X } from 'lucide-react'
import { NumericFormat } from 'react-number-format'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/format'

const input =
  'h-7 w-full rounded border border-input bg-background px-1.5 text-sm outline-none focus:ring-1 focus:ring-ring'

/**
 * Campo de dinheiro com máscara R$ 1.234,56. `value` e `onChange` trocam o
 * número cru ('1234.56'): a máscara é só da tela.
 */
export function MoneyInput({
  value,
  onChange,
  className,
  ...rest
}: {
  value: string
  onChange: (value: string) => void
  className?: string
  autoFocus?: boolean
  onBlur?: () => void
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void
}) {
  return (
    <NumericFormat
      {...rest}
      value={value}
      valueIsNumericString
      onValueChange={(v) => onChange(v.value)}
      thousandSeparator="."
      decimalSeparator=","
      prefix="R$ "
      decimalScale={2}
      fixedDecimalScale
      allowNegative={false}
      inputMode="decimal"
      placeholder="R$ 0,00"
      className={cn('tabular-nums', className)}
    />
  )
}

/**
 * Célula da planilha: mostra o valor, clicou vira input. Enter ou sair do campo
 * salva; Esc desiste. Sem `onSave` é só leitura.
 */
export function Cell({
  value,
  onSave,
  money,
  className,
  hint,
  wrap,
}: {
  value: string | number
  onSave?: (value: string) => Promise<unknown>
  money?: boolean
  className?: string
  /** Dica no hover; sem ela, o próprio valor (útil quando o texto corta). */
  hint?: string
  wrap?: boolean
}) {
  const shown = money ? formatCurrency(Number(value)) : String(value)
  const raw = String(value)
  const [draft, setDraft] = useState<string | null>(null)

  const save = async () => {
    if (draft === null) return
    const next = draft.trim()
    setDraft(null)
    if (!next || next === raw || !onSave) return
    try {
      await onSave(next)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não deu para salvar')
    }
  }

  const keys = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') e.currentTarget.blur()
    if (e.key === 'Escape') setDraft(null)
  }

  if (draft !== null && money) {
    return (
      <MoneyInput
        autoFocus
        className={cn(input, 'text-right', className)}
        value={draft}
        onChange={setDraft}
        onBlur={save}
        onKeyDown={keys}
      />
    )
  }

  if (draft !== null) {
    return (
      <input
        autoFocus
        className={cn(input, money && 'text-right tabular-nums', className)}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={keys}
      />
    )
  }

  return (
    <span
      className={cn(
        'block rounded px-1.5 py-0.5',
        // Valor nunca corta; quem cede espaço é a descrição.
        money ? 'text-right tabular-nums whitespace-nowrap' : wrap ? 'break-words' : 'truncate',
        onSave && 'cursor-text hover:bg-muted',
        className,
      )}
      // Texto cortado pelo `truncate` aparece inteiro no hover.
      title={hint ?? shown}
      onClick={() => onSave && setDraft(raw)}
    >
      {shown}
    </span>
  )
}

export interface FormField {
  key: string
  label: string
  initial?: string
  /** Com opções vira select; sem `initial`, o primeiro valor é o padrão. */
  options?: { value: string; label: string }[]
  /** `money`: máscara R$; o valor sai como número cru ('1234.56'). */
  type?: 'text' | 'date' | 'money'
  inputMode?: 'numeric'
  /** Ocupa uma coluna só (dia, valor); o resto ocupa a linha inteira. */
  half?: boolean
  /** Some conforme o que já foi escolhido (ex.: dias só no cartão). */
  hidden?: (values: Record<string, string>) => boolean
}

export interface FormSpec {
  title: string
  message?: React.ReactNode
  fields: FormField[]
  submitLabel?: string
  destructive?: boolean
  /** Botões à esquerda do rodapé (Desfazer, Remover…): cada um abre o próprio modal. */
  actions?: { label: string; onClick: () => void }[]
  onSubmit: (values: Record<string, string>) => Promise<unknown>
}

const field =
  'h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/50'

/**
 * Todo cadastro e todo pagamento passam por aqui: título, campos com rótulo,
 * Cancelar e confirmar. Enter confirma, Esc ou clicar fora fecha.
 */
export function FormModal({ spec, onClose }: { spec: FormSpec; onClose: () => void }) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      spec.fields.map((f) => [f.key, f.initial ?? f.options?.[0]?.value ?? '']),
    ),
  )
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    setSaving(true)
    try {
      await spec.onSubmit(values)
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não deu para salvar')
    } finally {
      setSaving(false)
    }
  }

  const set = (key: string, value: string) => setValues({ ...values, [key]: value })

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
      onClick={() => !saving && onClose()}
    >
      <form
        className="flex w-full max-w-md flex-col gap-4 rounded-t-xl bg-card p-5 shadow-xl sm:rounded-xl"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.key === 'Escape' && !saving && onClose()}
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base font-semibold">{spec.title}</h3>
          <button
            type="button"
            aria-label="Fechar"
            className="text-muted-foreground hover:text-foreground"
            onClick={onClose}
          >
            <X className="size-4" />
          </button>
        </div>

        {spec.message && <div className="text-sm text-muted-foreground">{spec.message}</div>}

        {spec.fields.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {spec.fields
              .filter((f) => !f.hidden?.(values))
              .map((f, index) => (
                <label key={f.key} className={cn('flex flex-col gap-1.5', !f.half && 'col-span-2')}>
                  <span className="text-xs font-medium text-muted-foreground">{f.label}</span>
                  {f.options ? (
                    <select
                      className={field}
                      value={values[f.key]}
                      onChange={(e) => set(f.key, e.target.value)}
                    >
                      {f.options.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : f.type === 'money' ? (
                    <MoneyInput
                      autoFocus={index === 0}
                      className={field}
                      value={values[f.key]}
                      onChange={(value) => set(f.key, value)}
                    />
                  ) : (
                    <input
                      autoFocus={index === 0}
                      type={f.type ?? 'text'}
                      inputMode={f.inputMode}
                      className={field}
                      value={values[f.key]}
                      onChange={(e) => set(f.key, e.target.value)}
                    />
                  )}
                </label>
              ))}
          </div>
        )}

        <div className="flex flex-wrap justify-end gap-2 pt-1">
          {spec.actions?.map((action, i) => (
            <button
              key={action.label}
              type="button"
              className={cn('h-9 px-2 text-sm text-red-600 hover:underline', i === 0 && 'mr-auto')}
              disabled={saving}
              onClick={action.onClick}
            >
              {action.label}
            </button>
          ))}
          <button
            type="button"
            className="h-9 rounded-md border border-input px-4 text-sm hover:bg-muted"
            disabled={saving}
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className={cn(
              'flex h-9 items-center gap-1.5 rounded-md px-4 text-sm font-medium hover:opacity-90 disabled:opacity-50',
              spec.destructive ? 'bg-red-600 text-white' : 'bg-primary text-primary-foreground',
            )}
            disabled={saving}
          >
            {!spec.destructive && <Check className="size-4" />}
            {saving ? 'Salvando…' : (spec.submitLabel ?? 'Adicionar')}
          </button>
        </div>
      </form>
    </div>
  )
}
