import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CurrencyInput } from '@/components/ui/currency-input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Loader2, CreditCard } from 'lucide-react'
import {
  createTransaction,
  getTransaction,
  updateTransaction,
} from '@/api/transactions'
import { listPaymentMethods } from '@/api/payment-methods'
import { listTags } from '@/api/tags'
import type { PaymentMethod } from '@/types/payment-method'
import type { Tag } from '@/types/tag'
import { toast } from 'sonner'

export function TransactionForm() {
  const navigate = useNavigate()
  const { search } = useLocation()
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)

  const [type, setType] = useState<'income' | 'expense'>('expense')
  const [amount, setAmount] = useState(0)
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [paymentMethodId, setPaymentMethodId] = useState('')
  const [installments, setInstallments] = useState('1')
  const [tagIds, setTagIds] = useState<string[]>([])
  const [notes, setNotes] = useState('')

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(isEdit)

  useEffect(() => {
    Promise.all([listPaymentMethods(), listTags()])
      .then(([pms, tgs]) => {
        setPaymentMethods(pms)
        setTags(tgs)
      })
      .catch(() => toast.error('Erro ao carregar dados'))
  }, [])

  useEffect(() => {
    if (!id) return
    getTransaction(id)
      .then((tx) => {
        setType(tx.type)
        setAmount(tx.amount)
        setDescription(tx.description)
        setDate(tx.date)
        setPaymentMethodId(tx.paymentMethodId)
        setInstallments(String(tx.installments))
        setTagIds((tx.tags ?? []).map((tag) => tag.id))
        setNotes(tx.notes ?? '')
      })
      .catch(() => toast.error('Erro ao carregar transação'))
      .finally(() => setLoading(false))
  }, [id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      if (isEdit && id) {
        await updateTransaction(id, {
          description,
          amount,
          date,
          paymentMethodId,
          tagIds,
          notes: notes || undefined,
        })
        toast.success('Transação atualizada')
      } else {
        // O backend resolve forma de pagamento e tags por texto, não por id.
        const method = paymentMethods.find((pm) => pm.id === paymentMethodId)
        const tagNames = tagIds
          .map((tagId) => tags.find((tag) => tag.id === tagId)?.description)
          .filter((name): name is string => Boolean(name))

        await createTransaction({
          description,
          amount,
          type,
          paymentMethod: method?.description ?? '',
          date,
          tags: tagNames.length > 0 ? tagNames : undefined,
          installments: Number(installments) || 1,
          notes: notes || undefined,
        })
        toast.success('Transação criada')
      }
      navigate(
        { pathname: '/transactions', search },
        { state: { saved: Date.now() } },
      )
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) =>
        !open && navigate({ pathname: '/transactions', search })
      }
    >
      {/* Modal no desktop; abaixo de md ocupa a tela inteira. */}
      <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto md:max-w-lg max-md:inset-0 max-md:h-full max-md:max-h-none max-md:w-full max-md:max-w-none max-md:translate-x-0 max-md:translate-y-0 max-md:rounded-none">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Editar transação' : 'Nova transação'}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="size-6 animate-spin" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="type">Tipo</Label>
              {/* O backend não aceita trocar o tipo depois de criada. */}
              <Select
                items={{ expense: 'Despesa', income: 'Receita' }}
                value={type}
                onValueChange={(v) => setType(v as 'income' | 'expense')}
                disabled={isEdit}
              >
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">Despesa</SelectItem>
                  <SelectItem value="income">Receita</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="amount">Valor</Label>
              <CurrencyInput id="amount" value={amount} onChange={setAmount} required />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="description">Descrição</Label>
              <Input
                id="description"
                placeholder="Ex: Supermercado"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="txdate">Data</Label>
              <Input
                id="txdate"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pm">Forma de pagamento</Label>
              <Select
                items={paymentMethods.map((pm) => ({ value: pm.id, label: pm.description }))}
                value={paymentMethodId}
                onValueChange={(v) => v && setPaymentMethodId(v)}
                required
              >
                <SelectTrigger id="pm">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((pm) => (
                    <SelectItem key={pm.id} value={pm.id}>
                      {pm.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {paymentMethods.length === 0 && (
                <div className="flex flex-col gap-2 rounded-lg border border-dashed border-border bg-muted/30 p-3">
                  <p className="text-sm text-muted-foreground">
                    Nenhuma forma de pagamento cadastrada.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/payment-methods/new')}
                  >
                    <CreditCard className="size-4" />
                    Cadastrar forma de pagamento
                  </Button>
                </div>
              )}
            </div>

            {!isEdit && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="installments">Parcelas</Label>
                {/* O backend gera as parcelas; aqui só entra a quantidade. */}
                <Input
                  id="installments"
                  type="number"
                  min={1}
                  max={99}
                  value={installments}
                  onChange={(e) => setInstallments(e.target.value)}
                />
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Label>Tags (opcional)</Label>
              <div className="flex flex-wrap gap-1">
                {tags.map((tag) => {
                  const selected = tagIds.includes(tag.id)
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() =>
                        setTagIds((prev) =>
                          selected
                            ? prev.filter((t) => t !== tag.id)
                            : [...prev, tag.id],
                        )
                      }
                      className={`rounded-full px-3 py-1 text-xs border transition-colors ${
                        selected
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background border-border hover:bg-muted'
                      }`}
                    >
                      {tag.description}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="notes">Observação (opcional)</Label>
              <Input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate({ pathname: '/transactions', search })}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="size-4 mr-1 animate-spin" />}
                {isEdit ? 'Salvar' : 'Criar'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
