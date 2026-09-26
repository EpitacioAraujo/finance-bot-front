import { Fragment, useMemo } from 'react'
import { TransactionType, type TrancheDue } from '../types/transaction'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table'
import { Button } from './ui/button'
import { Trash2, Pencil } from 'lucide-react'
import { formatDate, shortDate } from '../lib/format'

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

/** '2026-10-15' → '15/10' — o ano já está no seletor de mês. */

/** Despesa pesa negativo, receita positivo: o subtotal do grupo é o líquido. */
const signed = (t: TrancheDue): number =>
  t.type === TransactionType.Income ? t.amount : -t.amount

const money = (value: number): string =>
  `${value < 0 ? '- ' : ''}${currency.format(Math.abs(value))}`

interface TrancheTableProps {
  tranches: TrancheDue[]
  onDelete: (transactionId: string) => void
  onEdit?: (transactionId: string) => void
  onOpen?: (transactionId: string) => void
}

/**
 * Agrupada por forma de pagamento, uma linha por parcela dentro do grupo. No
 * cartão o cabeçalho mostra a janela de compras da fatura — o mês selecionado é
 * o ciclo que abre nele, e cada cartão fecha num dia diferente. O subtotal é a
 * fatura inteira daquela janela.
 *
 * O agrupamento acontece aqui e não no banco: a lista vem inteira numa página,
 * e ordenar por coluna de relação quebraria a paginação do TypeORM.
 */
export function TrancheTable({
  tranches,
  onDelete,
  onEdit,
  onOpen,
}: TrancheTableProps) {
  const groups = useMemo(() => {
    const byMethod = new Map<
      string,
      { label: string; period: string | null; rows: TrancheDue[]; total: number }
    >()
    for (const t of tranches) {
      const group = byMethod.get(t.paymentMethod.id) ?? {
        label: t.paymentMethod.description,
        // Um cartão tem um ciclo só por mês, então a janela da primeira linha
        // vale para o grupo inteiro. Sem ciclo não há janela a mostrar.
        period: t.cycle
          ? `${shortDate(t.cycle.startDate)} a ${shortDate(t.cycle.endDate)}`
          : null,
        rows: [],
        total: 0,
      }
      group.rows.push(t)
      group.total += signed(t)
      byMethod.set(t.paymentMethod.id, group)
    }
    for (const group of byMethod.values()) {
      group.rows.sort((a, b) => a.purchaseDate.localeCompare(b.purchaseDate))
    }
    return [...byMethod.values()].sort((a, b) => a.label.localeCompare(b.label))
  }, [tranches])

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Descrição</TableHead>
          <TableHead className="text-right">Valor</TableHead>
          <TableHead className="w-20 text-right">
            <span className="sr-only">Ações</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {groups.map((group) => (
          <Fragment key={group.label}>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableCell className="font-medium">
                {group.label}
                {group.period && (
                  <span className="ml-2 text-xs font-normal text-muted-foreground tabular-nums">
                    {group.period}
                  </span>
                )}
              </TableCell>
              <TableCell
                className={`text-right font-medium tabular-nums ${group.total < 0 ? 'text-red-600' : 'text-emerald-600'}`}
              >
                {money(group.total)}
              </TableCell>
              <TableCell />
            </TableRow>

            {group.rows.map((t) => {
              const isIncome = t.type === TransactionType.Income
              return (
                <TableRow
                  key={t.id}
                  className={onOpen ? 'cursor-pointer' : undefined}
                  onClick={onOpen ? () => onOpen(t.transactionId) : undefined}
                >
                  {/* O recuo é o que diz que a linha pertence ao grupo acima. */}
                  <TableCell className="pl-8">
                    <div className="flex flex-col">
                      <span>
                        {t.description}
                        {t.tranche && (
                          <span className="ml-2 text-xs text-muted-foreground tabular-nums">
                            {t.tranche}
                          </span>
                        )}
                      </span>
                      {/* A forma de pagamento saiu daqui: é o cabeçalho do grupo.
                          O vencimento também: é o do ciclo, igual pra linha toda. */}
                      <span className="text-xs text-muted-foreground">
                        {formatDate(t.purchaseDate)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell
                    className={`text-right font-medium tabular-nums ${isIncome ? 'text-emerald-600' : 'text-red-600'}`}
                  >
                    {isIncome ? '' : '- '}
                    {currency.format(Math.abs(t.amount))}
                  </TableCell>
                  {/* Ações não abrem o detalhe. */}
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    {onEdit && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => onEdit(t.transactionId)}
                        aria-label="Editar compra"
                      >
                        <Pencil className="text-muted-foreground" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => onDelete(t.transactionId)}
                      aria-label="Remover compra"
                    >
                      <Trash2 className="text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </Fragment>
        ))}
      </TableBody>
    </Table>
  )
}
