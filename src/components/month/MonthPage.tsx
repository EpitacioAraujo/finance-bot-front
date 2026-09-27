import { Fragment, useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Check, CreditCard, Moon, Plus, Receipt, Scale, Sun, Undo2, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { MonthSelector } from '@/components/MonthSelector'
import { getMonth } from '@/api/month'
import { createBill, deleteBill, payBill, payConsolidated, updateBill } from '@/api/bills'
import { createTransaction, deleteTransaction, updateTransaction } from '@/api/transactions'
import { createPaymentMethod, updatePaymentMethod } from '@/api/payment-methods'
import { useTheme } from '@/hooks/use-theme'
import type { MonthGroup, MonthLine, MonthOutput } from '@/types/month'
import { PAYMENT_METHOD_KIND_LABELS, type PaymentMethodKind } from '@/types/payment-method'
import { TransactionType } from '@/types/transaction'
import { competenciaAtual, formatCurrency, monthRange, shortDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Cell, FormModal, type FormSpec } from './SheetCells'

/** Pix primeiro: é o padrão do select de nova forma de pagamento. */
const KIND_ORDER: PaymentMethodKind[] = ['pix', 'credit', 'debit', 'cash', 'transfer']

/** Ação de cada linha de conta: rótulo do botão, estado feito e o que desfazer apaga. */
const ACTIONS = {
  pay: { verb: 'Pagar', done: 'pago', undo: 'o pagamento', back: 'a conta volta a ficar pendente' },
  receive: { verb: 'Receber', done: 'recebido', undo: 'o recebimento', back: 'a conta volta a ficar pendente' },
  // Recorrência: lançar registra a cobrança no cartão, e é ela que cria a fatura.
  launch: { verb: 'Lançar', done: 'lançado', undo: 'o lançamento', back: 'a recorrência volta a ficar prevista' },
} as const
type LineAction = keyof typeof ACTIONS

/** Abaixo de `lg` a tela vira abas: os três cards não cabem lado a lado. */
const MOBILE = '(max-width: 1023px)'

const TABS = [
  ['bills', 'Contas', Receipt],
  ['entries', 'Lançamentos', CreditCard],
  ['balance', 'Balanço', Scale],
] as const
type Tab = (typeof TABS)[number][0]

/** No celular a linha não edita na célula: um toque abre o menu dela. */
function useMobile() {
  const [mobile, setMobile] = useState(() => window.matchMedia(MOBILE).matches)
  useEffect(() => {
    const query = window.matchMedia(MOBILE)
    const update = () => setMobile(query.matches)
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])
  return mobile
}

/** Hoje em hora local: `toISOString()` é UTC e vira o dia seguinte depois das 21h. */
const todayISO = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * A aplicação inteira, no formato da planilha: contas e recorrências à
 * esquerda, lançamentos agrupados pela forma de pagamento no meio, balanço à
 * direita. Descrição e valor se editam na própria célula; criar e pagar abrem
 * um modal.
 *
 * Conta e lançamento são coisas diferentes por trás: na conta o valor é o
 * previsto de todo mês; o do mês nasce no pagamento.
 */
export function MonthPage() {
  const { theme, toggle } = useTheme()
  const [searchParams, setSearchParams] = useSearchParams()
  const competencia = searchParams.get('competencia') ?? competenciaAtual()
  const range = monthRange(competencia)

  const [month, setMonth] = useState<MonthOutput | null>(null)
  const [form, setForm] = useState<FormSpec | null>(null)
  const mobile = useMobile()
  const [tab, setTab] = useState<Tab>('bills')
  // Balanço no celular: uma coluna por vez. 0 = previsto, 1 = efetivo.
  const [balanceView, setBalanceView] = useState<0 | 1>(0)

  const load = useCallback(() => {
    getMonth(monthRange(competencia))
      .then(setMonth)
      .catch(() => toast.error('Erro ao carregar o mês'))
  }, [competencia])

  useEffect(load, [load])

  /** Toda escrita recarrega o mês: os totais saem do backend, não daqui. */
  const run = async (write: Promise<unknown>) => {
    await write
    load()
  }

  // Lançamento novo nasce hoje quando hoje é deste mês; senão no começo dele.
  const today = todayISO()
  const defaultDate = (start: string) => (today >= range.from && today <= range.to ? today : start)

  const methodOptions = (credit: boolean) =>
    (month?.groups ?? [])
      .filter((group) => (group.paymentMethod.kind === 'credit') === credit)
      .map((group) => ({ value: group.paymentMethod.id, label: group.paymentMethod.description }))
  const cashMethods = methodOptions(false)
  const creditMethods = methodOptions(true)

  const newBill = () =>
    setForm({
      title: 'Nova conta',
      fields: [
        { key: 'description', label: 'Descrição' },
        {
          key: 'type',
          label: 'Tipo',
          half: true,
          options: [
            { value: TransactionType.Expense, label: 'A pagar' },
            { value: TransactionType.Income, label: 'A receber' },
          ],
        },
        { key: 'day', label: 'Dia do vencimento', half: true, initial: '15', inputMode: 'numeric' },
        { key: 'amount', label: 'Valor previsto', half: true, type: 'money' },
        { key: 'paymentMethodId', label: 'Forma de pagamento', half: true, options: cashMethods },
      ],
      onSubmit: (v) =>
        run(
          createBill({
            description: v.description,
            type: v.type as TransactionType,
            predictedAmount: Number(v.amount),
            frequency: 'monthly',
            dueDay: Number(v.day),
            paymentMethodId: v.paymentMethodId,
          }),
        ),
    })

  const newRecurring = () =>
    setForm({
      title: 'Nova recorrência',
      message: 'Cobrança que cai sozinha no cartão todo mês (academia, streaming…).',
      fields: [
        { key: 'description', label: 'Descrição' },
        { key: 'day', label: 'Dia da cobrança', half: true, initial: '10', inputMode: 'numeric' },
        { key: 'amount', label: 'Valor', half: true, type: 'money' },
        { key: 'paymentMethodId', label: 'Cartão', options: creditMethods },
      ],
      onSubmit: (v) =>
        run(
          createBill({
            description: v.description,
            type: TransactionType.Expense,
            predictedAmount: Number(v.amount),
            frequency: 'monthly',
            dueDay: Number(v.day),
            paymentMethodId: v.paymentMethodId,
          }),
        ),
    })

  const newEntry = (g: MonthGroup) =>
    setForm({
      title: `Novo lançamento · ${g.paymentMethod.description}`,
      fields: [
        { key: 'description', label: 'Descrição' },
        { key: 'date', label: 'Data', type: 'date', half: true, initial: defaultDate(g.invoice?.startDate ?? range.from) },
        { key: 'amount', label: 'Valor total', half: true, type: 'money' },
        ...(g.paymentMethod.kind === 'credit'
          ? [{ key: 'installments', label: 'Parcelas', half: true, initial: '1', inputMode: 'numeric' as const }]
          : []),
      ],
      onSubmit: (v) =>
        run(
          createTransaction({
            description: v.description,
            amount: Number(v.amount),
            type: TransactionType.Expense,
            paymentMethodId: g.paymentMethod.id,
            date: v.date,
            installments: Number(v.installments) || undefined,
          }),
        ),
    })

  const newMethod = () =>
    setForm({
      title: 'Nova forma de pagamento',
      message: 'Os lançamentos ficam agrupados por ela.',
      fields: [
        { key: 'description', label: 'Nome (ex.: Nubank PF)' },
        {
          key: 'kind',
          label: 'Tipo',
          options: KIND_ORDER.map((kind) => ({ value: kind, label: PAYMENT_METHOD_KIND_LABELS[kind] })),
        },
        { key: 'closingDay', label: 'Dia do fechamento', half: true, inputMode: 'numeric', hidden: (v) => v.kind !== 'credit' },
        { key: 'dueDay', label: 'Dia do vencimento', half: true, inputMode: 'numeric', hidden: (v) => v.kind !== 'credit' },
      ],
      onSubmit: (v) =>
        run(
          createPaymentMethod({
            description: v.description,
            kind: v.kind as PaymentMethodKind,
            ...(v.kind === 'credit' && { closingDay: Number(v.closingDay), dueDay: Number(v.dueDay) }),
          }),
        ),
    })

  /** O valor do mês pode vir diferente do previsto; na fatura só se confirma o total. */
  const pay = (line: MonthLine, action: LineAction) => {
    const { verb } = ACTIONS[action]
    setForm(
      line.cycleId
        ? {
            title: `Pagar ${line.description}`,
            message: (
              <>
                Quita a fatura inteira:{' '}
                <span className="font-semibold text-foreground">{formatCurrency(line.amount)}</span>
              </>
            ),
            fields: [],
            submitLabel: 'Pagar',
            onSubmit: () => run(payConsolidated(line.cycleId!)),
          }
        : {
            title: `${verb} ${line.description}`,
            fields: [
              { key: 'amount', label: 'Valor', half: true, type: 'money', initial: String(line.amount) },
              // A cobrança da recorrência cai no dia dela; o pagamento, hoje.
              { key: 'date', label: 'Data', type: 'date', half: true, initial: action === 'launch' ? line.date : today },
              {
                hidden: () => action === 'launch',
                key: 'paymentMethod',
                label: 'Forma de pagamento',
                initial: line.paymentMethod,
                // O backend recebe o nome aqui; mandado só quando trocou.
                options: cashMethods.map((option) => ({ value: option.label, label: option.label })),
              },
            ],
            submitLabel: verb,
            onSubmit: (v) =>
              run(
                payBill(line.billId!, {
                  amount: Number(v.amount),
                  date: v.date,
                  occurrenceDate: line.date,
                  paymentMethod:
                    action !== 'launch' && v.paymentMethod !== line.paymentMethod ? v.paymentMethod : undefined,
                }),
              ),
          },
    )
  }

  const addButton = (label: string, onClick: () => void, text?: string) => (
    <Button variant={text ? 'outline' : 'ghost'} size={text ? 'xs' : 'icon-xs'} className="shrink-0" aria-label={label} title={label} onClick={onClick}>
      <Plus className="size-3.5" />
      {/* No celular fica só o +: o texto empurrava a página para o lado. */}
      {text && <span className="max-sm:hidden">{text}</span>}
    </Button>
  )

  /**
   * Uma linha. `bill` é conta recorrente: descrição e valor editam o cadastro
   * (ou o pagamento, se já feito). `kind` põe o botão Pagar/Receber/Lançar;
   * linha com botão e sem conta por trás é a fatura, só leitura. `meta` é o
   * texto miúdo embaixo da descrição (ex.: "dia 10 · Nu PF").
   */
  const row = (line: MonthLine, kind: LineAction | null, meta?: string) => {
    const bill = line.billId !== null && (kind !== null || line.transactionId === null)
    const invoice = kind !== null && line.billId === null
    const pending = line.status === 'pending'
    const sub = meta ?? (line.tranche ? `parcela ${line.tranche}` : kind === null && !line.transactionId ? 'previsto' : null)

    const saveDescription = (description: string) =>
      run(
        bill
          ? updateBill(line.billId!, { description })
          : updateTransaction(line.transactionId!, { description }),
      )

    // Parcela mostra a tranche, mas o valor gravado é o da compra inteira.
    const saveAmount = line.tranche || invoice
      ? undefined
      : (amount: string) =>
          run(
            bill && pending
              ? updateBill(line.billId!, { predictedAmount: Number(amount) })
              : updateTransaction(line.transactionId!, { amount: Number(amount) }),
          )

    const remove = () => {
      const message = bill
        ? `Remover "${line.description}" de todos os meses?`
        : line.tranche
          ? `Remover "${line.description}" e todas as parcelas?`
          : `Remover "${line.description}"?`
      setForm({
        title: 'Remover',
        message,
        fields: [],
        submitLabel: 'Remover',
        destructive: true,
        onSubmit: () => run(bill ? deleteBill(line.billId!) : deleteTransaction(line.transactionId!)),
      })
    }

    const words = kind && ACTIONS[kind]
    const undo = () =>
      words &&
      setForm({
        title: `Desfazer ${words.undo}`,
        message: `${words.undo[0].toUpperCase()}${words.undo.slice(1)} de "${line.description}" (${formatCurrency(line.amount)}) é apagado e ${words.back}.`,
        fields: [],
        submitLabel: 'Desfazer',
        destructive: true,
        onSubmit: () => run(deleteTransaction(line.transactionId!)),
      })

    // Celular: editar, desfazer e remover num menu só, aberto pelo toque na linha.
    const openMenu = () =>
      setForm({
        title: line.description,
        message: sub ?? undefined,
        fields: [
          { key: 'description', label: 'Descrição', initial: line.description },
          ...(saveAmount
            ? [{ key: 'amount', label: bill && pending ? 'Valor previsto (todos os meses)' : 'Valor', type: 'money' as const, initial: String(line.amount) }]
            : []),
        ],
        submitLabel: 'Salvar',
        actions: [
          ...(words && !pending ? [{ label: `Desfazer ${words.undo}`, onClick: undo }] : []),
          { label: 'Remover', onClick: remove },
        ],
        onSubmit: async (v) => {
          if (v.description.trim() && v.description !== line.description) await saveDescription(v.description.trim())
          if (saveAmount && v.amount && Number(v.amount) !== line.amount) await saveAmount(v.amount)
        },
      })

    // Pendente: o botão. Feito: quando, e desfazer (fatura fechada não reabre).
    const action = !words ? null : pending ? (
      // Botão desabilitado não dispara hover: a dica fica no envoltório.
      <span title={invoice && !line.cycleId ? 'Lance as recorrências desta fatura primeiro' : undefined}>
        <Button
          variant="outline"
          size="xs"
          className="w-20 lg:w-24"
          // Fatura sem ciclo é só previsão: ainda não há o que fechar.
          disabled={invoice && !line.cycleId}
          onClick={(e) => {
            e.stopPropagation()
            pay(line, kind!)
          }}
        >
          {words.verb}
        </Button>
      </span>
    ) : (
      <span
        className="flex items-center justify-end gap-1 whitespace-nowrap text-xs text-green-600 lg:w-24 dark:text-green-400"
        title={invoice ? 'Fatura paga' : `${words.done} em ${shortDate(line.paidDate ?? line.date)}`}
      >
        <Check className="size-3.5" />
        {invoice ? 'paga' : shortDate(line.paidDate ?? line.date)}
        {!invoice && !mobile && (
          <button
            aria-label={`Desfazer ${words.undo} de ${line.description}`}
            title={`Desfazer ${words.undo}`}
            className="text-muted-foreground hover:text-foreground"
            onClick={undo}
          >
            <Undo2 className="size-3.5" />
          </button>
        )}
      </span>
    )

    return (
      <div
        key={line.key}
        className={cn('flex min-h-11 items-center gap-2 py-1.5', mobile && !invoice && 'active:bg-muted/50')}
        onClick={mobile && !invoice ? openMenu : undefined}
      >
        <div className="min-w-0 flex-1">
          <Cell value={line.description} onSave={mobile || invoice ? undefined : saveDescription} wrap />
          {sub && <div className="break-words px-1.5 text-xs text-muted-foreground">{sub}</div>}
        </div>
        {/* Celular: valor em cima, botão ou selo embaixo, tudo à direita. */}
        <div className="flex shrink-0 items-center gap-2 max-lg:flex-col max-lg:items-end max-lg:gap-0.5">
          <Cell
            value={line.amount}
            money
            onSave={mobile ? undefined : saveAmount}
            hint={bill && pending ? 'Valor previsto de todos os meses' : undefined}
            className={cn('lg:w-28', invoice && 'text-muted-foreground')}
          />
          {action}
        </div>
        {!mobile &&
          (invoice ? (
            <span className="w-4" />
          ) : (
            <button
              aria-label={`Remover ${line.description}`}
              title="Remover"
              className="w-4 text-muted-foreground/40 hover:text-red-500"
              onClick={remove}
            >
              <X className="size-3.5" />
            </button>
          ))}
      </div>
    )
  }

  /** `empty` nulo: lista vazia não mostra nada (cartão sem compras no celular). */
  const list = (lines: React.ReactNode[], empty: string | null) =>
    lines.length === 0 ? (
      empty && <p className="px-1.5 py-2 text-xs text-muted-foreground">{empty}</p>
    ) : (
      <div className="divide-y divide-border/60">{lines}</div>
    )

  const block = (title: string, total: number | null, action: React.ReactNode, children: React.ReactNode) => (
    <section className="flex min-w-0 flex-col gap-2 rounded-xl border border-border bg-card p-4 text-sm shadow-sm">
      <div className="flex items-center gap-2 pb-1">
        <h2 className="flex-1 text-base font-semibold">{title}</h2>
        {total !== null && <span className="font-semibold tabular-nums">{formatCurrency(total)}</span>}
        {action}
      </div>
      {children}
    </section>
  )

  const heading = (title: React.ReactNode, total: number, action?: React.ReactNode) => (
    <div className="flex items-center gap-2 border-b border-border pb-1.5 pt-2">
      <div className="min-w-0 flex-1 font-medium">{title}</div>
      <span className="font-medium tabular-nums">{formatCurrency(total)}</span>
      {action}
    </div>
  )

  const group = (g: MonthGroup) => (
    <div key={g.paymentMethod.id} className="flex flex-col">
      {heading(
        <div className="flex min-w-0 flex-col">
          <Cell
            value={g.paymentMethod.description}
            onSave={(description) => run(updatePaymentMethod(g.paymentMethod.id, { description }))}
          />
          {g.invoice && (
            <span className="px-1.5 text-xs font-normal text-muted-foreground tabular-nums">
              {shortDate(g.invoice.startDate)} a {shortDate(g.invoice.endDate)} · vence {shortDate(g.invoice.dueDate)}
            </span>
          )}
        </div>,
        g.total,
        addButton(`Novo lançamento em ${g.paymentMethod.description}`, () => newEntry(g)),
      )}
      {list(g.items.map((line) => row(line, null)), mobile ? null : 'Nenhum lançamento neste mês.')}
    </div>
  )

  /** Uma linha do balanço: rótulo, previsto e efetivo. `null` = não se aplica. */
  const line3 = (
    label: string,
    values: [number | null, number | null],
    className = '',
    key = label,
  ) => (
    <Fragment key={key}>
      <dt className={`min-w-0 truncate ${className}`} title={label}>{label}</dt>
      {values.map((value, i) => (
        <dd key={i} className={cn('whitespace-nowrap text-right', className, i !== balanceView && 'max-lg:hidden')}>
          {value === null ? '—' : formatCurrency(value)}
        </dd>
      ))}
    </Fragment>
  )
  const sub3 = 'pl-3 text-xs text-muted-foreground'

  // Celular: fixo no topo com o saldo, que de outro jeito fica no fim da página.
  const header = (
    <header className="flex flex-col gap-1 max-lg:sticky max-lg:top-0 max-lg:z-30 max-lg:-mx-4 max-lg:-mt-4 max-lg:border-b max-lg:border-border max-lg:bg-background/95 max-lg:px-4 max-lg:py-2 max-lg:backdrop-blur">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center">
        <h1 className="truncate text-lg font-semibold max-lg:invisible">Finance Bot</h1>
        <MonthSelector
          month={competencia}
          onChange={(v) => setSearchParams(v ? { competencia: v } : {})}
        />
        <Button variant="ghost" size="icon-sm" className="justify-self-end" onClick={toggle} aria-label="Alternar tema">
          {theme === 'light' ? <Moon className="size-4" /> : <Sun className="size-4" />}
        </Button>
      </div>
      {month && (
        <p className="text-center text-xs text-muted-foreground tabular-nums lg:hidden">
          Saldo previsto{' '}
          <span className={cn('font-semibold', month.totals.planned.balance < 0 ? 'text-expense' : 'text-income')}>
            {formatCurrency(month.totals.planned.balance)}
          </span>{' '}
          · efetivo{' '}
          <span className={cn('font-semibold', month.totals.actual.balance < 0 ? 'text-expense' : 'text-income')}>
            {formatCurrency(month.totals.actual.balance)}
          </span>
        </p>
      )}
    </header>
  )

  const onTab = (key: Tab) => cn(tab !== key && 'max-lg:hidden')

  if (!month) return <div className="flex flex-col gap-5">{header}</div>
  const { planned, actual } = month.totals

  return (
    <div className="flex flex-col gap-5 max-lg:pb-20">
      {header}
        <div className="grid items-start gap-5 lg:grid-cols-3">
          <div className={cn('flex min-w-0 flex-col gap-5', onTab('bills'))}>
            {block(
              'Contas',
              null,
              cashMethods.length > 0 && addButton('Nova conta', newBill, 'Conta'),
              <>
                {cashMethods.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Conta se paga por pix, débito…: crie uma forma de pagamento em Lançamentos.
                  </p>
                )}
                {heading('A pagar', month.totals.planned.bills)}
                {list(
                  month.bills.payable.map((line) => row(line, 'pay')),
                  'Nenhuma conta a pagar.',
                )}
                {heading('A receber', month.totals.planned.income)}
                {list(
                  month.bills.receivable.map((line) =>
                    row(line, line.billId !== null ? 'receive' : null),
                  ),
                  'Nenhuma conta a receber.',
                )}
              </>,
            )}

            {block(
              'Recorrências',
              month.totals.planned.recurring,
              creditMethods.length > 0 && addButton('Nova recorrência', newRecurring, 'Recorrência'),
              creditMethods.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Recorrência cai num cartão: crie um cartão de crédito em Lançamentos.
                </p>
              ) : (
                list(
                  month.recurring.map((line) =>
                    row(line, 'launch', `dia ${line.date.slice(8, 10)} · ${line.paymentMethod}`),
                  ),
                  'Nenhuma recorrência.',
                )
              ),
            )}
          </div>

          <div className={cn('min-w-0', onTab('entries'))}>
          {block(
            'Lançamentos',
            month.totals.planned.entries,
            addButton('Nova forma de pagamento', newMethod, 'Forma de pagamento'),
            <div className="flex flex-col gap-4">
              {month.groups.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Crie uma forma de pagamento (Pix, cartão…) para agrupar seus lançamentos.
                </p>
              )}
              {month.groups.map(group)}
            </div>,
          )}
          </div>

          <div className={cn('min-w-0', onTab('balance'))}>
          {block(
            'Balanço',
            null,
            <div className="flex rounded-md border border-border p-0.5 text-xs lg:hidden">
              {(['Previsto', 'Efetivo'] as const).map((label, i) => (
                <button
                  key={label}
                  className={cn('rounded px-2.5 py-1', balanceView === i ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}
                  onClick={() => setBalanceView(i as 0 | 1)}
                >
                  {label}
                </button>
              ))}
            </div>,
            <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1.5 tabular-nums lg:grid-cols-[minmax(0,1fr)_auto_auto]">
              <dt className="max-lg:hidden" />
              <dd className="text-right text-xs font-medium text-muted-foreground max-lg:hidden">Previsto</dd>
              <dd className="text-right text-xs font-medium text-muted-foreground max-lg:hidden">Efetivo</dd>

              {line3('Renda', [planned.income, actual.income], 'text-income')}
              {line3('Contas a pagar', [planned.bills, actual.bills], 'text-muted-foreground')}
              {line3('Recorrências', [planned.recurring, null], 'text-muted-foreground')}
              {month.groups
                .filter((g) => g.recurring > 0)
                .map((g) => line3(`· ${g.paymentMethod.description}`, [g.recurring, null], sub3, `recurring-${g.paymentMethod.id}`))}
              {line3('Lançamentos', [planned.entries, actual.entries], 'text-muted-foreground')}
              {month.groups
                .filter((g) => g.total > 0)
                .map((g) =>
                  line3(
                    `· ${g.paymentMethod.description}`,
                    [g.total, g.paymentMethod.kind === 'credit' ? null : g.total],
                    sub3,
                    `entries-${g.paymentMethod.id}`,
                  ),
                )}
              {line3('Faturas pagas', [null, actual.invoices], 'text-muted-foreground')}
              {line3('Despesa', [planned.expense, actual.expense], 'text-expense')}

              <dt className="border-t border-border pt-2 font-semibold">Saldo</dt>
              {[planned.balance, actual.balance].map((balance, i) => (
                <dd
                  key={i}
                  className={cn(
                    'border-t border-border pt-2 text-right font-semibold',
                    balance < 0 ? 'text-expense' : 'text-income',
                    i !== balanceView && 'max-lg:hidden',
                  )}
                >
                  {formatCurrency(balance)}
                </dd>
              ))}
              <p className="col-span-full pt-2 text-xs text-muted-foreground">
                Efetivo é o que já entrou ou saiu: no cartão, conta quando a fatura é paga.
              </p>
            </dl>,
          )}
          </div>
        </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-3 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        {TABS.map(([key, label, Icon]) => (
          <button
            key={key}
            className={cn(
              'flex flex-col items-center gap-0.5 py-2 text-xs',
              tab === key ? 'font-medium text-primary' : 'text-muted-foreground',
            )}
            onClick={() => {
              setTab(key)
              window.scrollTo({ top: 0 })
            }}
          >
            <Icon className="size-5" />
            {label}
          </button>
        ))}
      </nav>

      {/* A key remonta o modal quando um menu abre outro (Remover, Desfazer). */}
      {form && <FormModal key={form.title} spec={form} onClose={() => setForm(null)} />}
    </div>
  )
}
