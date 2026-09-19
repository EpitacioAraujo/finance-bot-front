import { TransactionType, type Transaction } from '../types/transaction'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table'
import { Button } from './ui/button'
import { Checkbox } from './ui/checkbox'
import { Trash2, Pencil } from 'lucide-react'
import { formatDate } from '../lib/format'

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

interface TransactionTableProps {
  transactions: Transaction[]
  selectedIds: Set<string>
  onToggleSelect: (id: string) => void
  onToggleSelectAll: () => void
  onDelete: (id: string) => void
  onEdit?: (id: string) => void
  onOpen?: (id: string) => void
}

export function TransactionTable({
  transactions,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onDelete,
  onEdit,
  onOpen,
}: TransactionTableProps) {
  const allSelected = transactions.length > 0 && transactions.every((t) => selectedIds.has(t.id))
  const someSelected = transactions.some((t) => selectedIds.has(t.id))

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10">
            <Checkbox
              checked={allSelected}
              data-state={allSelected ? 'checked' : someSelected ? 'indeterminate' : 'unchecked'}
              onCheckedChange={onToggleSelectAll}
              aria-label="Selecionar todos"
            />
          </TableHead>
          <TableHead>Data</TableHead>
          <TableHead>Descrição</TableHead>
          <TableHead className="text-right">Valor</TableHead>
          <TableHead className="text-right">
            <span className="sr-only">Ações</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {transactions.map((t) => {
          const isIncome = t.type === TransactionType.Income
          return (
            <TableRow
              key={t.id}
              className={onOpen ? 'cursor-pointer' : undefined}
              onClick={onOpen ? () => onOpen(t.id) : undefined}
            >
              {/* Seleção e ações não abrem o detalhe. */}
              <TableCell onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={selectedIds.has(t.id)}
                  onCheckedChange={() => onToggleSelect(t.id)}
                  aria-label={`Selecionar ${t.description}`}
                />
              </TableCell>
              <TableCell className="text-muted-foreground">
                {formatDate(t.date)}
              </TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <span>{t.description}</span>
                  <span className="text-xs text-muted-foreground">
                    {t.paymentMethod?.description}
                    {t.installments > 1 && (
                      <>
                        {' '}&middot;{' '}
                        {t.paidInstallments}/{t.installments} parcelas pagas
                      </>
                    )}
                  </span>
                </div>
              </TableCell>
              <TableCell className={`text-right font-medium ${isIncome ? 'text-emerald-600' : 'text-red-600'}`}>
                {isIncome ? '' : '- '}{currency.format(Math.abs(t.amount))}
              </TableCell>
              <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                {onEdit && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => onEdit(t.id)}
                    aria-label="Editar transação"
                  >
                    <Pencil className="text-muted-foreground" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => onDelete(t.id)}
                  aria-label="Remover transação"
                >
                  <Trash2 className="text-red-500" />
                </Button>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
