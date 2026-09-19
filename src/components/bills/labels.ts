import { TransactionType } from '@/types/transaction'

/** A pagar e a receber são a mesma tabela; só o vocabulário muda. */
export const BILL_LABELS = {
  [TransactionType.Expense]: {
    title: 'Contas a Pagar',
    empty: 'Nenhuma conta a pagar nesta competência.',
    verb: 'Pagar',
    done: 'Pago',
    doneFem: 'paga',
    dateLabel: 'Data do Pagamento',
  },
  [TransactionType.Income]: {
    title: 'Contas a Receber',
    empty: 'Nenhuma conta a receber nesta competência.',
    verb: 'Receber',
    done: 'Recebido',
    doneFem: 'recebida',
    dateLabel: 'Data do Recebimento',
  },
} as const
