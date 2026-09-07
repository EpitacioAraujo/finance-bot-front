import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Loader2, Plus, X, CreditCard } from 'lucide-react'
import { createTransaction, updateTransaction, fetchTransactions } from '@/api/transactions'
import { listPaymentMethods } from '@/api/payment-methods'
import { listTags } from '@/api/tags'
import type { PaymentMethod } from '@/types/payment-method'
import type { Tag } from '@/types/tag'
import { toast } from 'sonner'

interface SplitState {
  key: number
  amount: number
  paymentMethodId: string
}

let splitKeyCounter = 1

export function TransactionForm() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)

  const [type, setType] = useState<'income' | 'expense'>('expense')
  const [amount, setAmount] = useState(0)
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [splits, setSplits] = useState<SplitState[]>([
    { key: splitKeyCounter++, amount: 0, paymentMethodId: '' },
  ])
  const [tagIds, setTagIds] = useState<string[]>([])
  const [splitError, setSplitError] = useState<string | null>(null)

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(isEdit)

  useEffect(() => {
    Promise.all([listPaymentMethods(), listTags()]).then(([pms, tgs]) => {
      setPaymentMethods(pms)
      setTags(tgs)
    }).catch(() => {
      toast.error('Erro ao carregar dados')
    })
  }, [])

  useEffect(() => {
    if (!id) return
    const params = new URLSearchParams({ limit: '1' })
    const beforeDate = new Date()
    beforeDate.setDate(beforeDate.getDate() + 1)
    params.set('endDate', beforeDate.toISOString().slice(0, 10))
    fetchTransactions()
      .then((result) => {
        const tx = result.data.find((t) => t.id === id)
        if (tx) {
          setType(tx.type as 'income' | 'expense')
          setAmount(tx.amount)
          setDescription(tx.description)
          setDate(tx.date)
        }
      })
      .catch(() => toast.error('Erro ao carregar transacao'))
      .finally(() => setLoading(false))
  }, [id])

  const validateSplits = (): boolean => {
    if (isEdit) return true

    if (splits.some((s) => !s.paymentMethodId)) {
      setSplitError('Selecione a forma de pagamento para todas as parcelas')
      return false
    }

    if (splits.some((s) => s.amount <= 0)) {
      setSplitError('O valor de cada parcela deve ser maior que zero')
      return false
    }

    const sum = splits.reduce((a, b) => a + b.amount, 0)
    if (Math.abs(sum - amount) > 0.01) {
      setSplitError('A soma das parcelas deve ser igual ao valor total')
      return false
    }

    setSplitError(null)
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateSplits()) return

    setSaving(true)

    try {
      if (isEdit && id) {
        await updateTransaction(id, {
          amount,
          type,
          description,
          date,
        })
        toast.success('Transacao atualizada')
      } else {
        await createTransaction({
          amount,
          type,
          date,
          description,
          splits: splits.map((s, i) => ({
            amount: s.amount,
            number: i + 1,
            paymentMethodId: s.paymentMethodId,
          })),
          tagIds: tagIds.length > 0 ? tagIds : undefined,
        })
        toast.success('Transacao criada')
      }
      navigate('/transactions')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  const addSplit = () => {
    const last = splits[splits.length - 1]
    setSplits((prev) => [
      ...prev,
      { key: splitKeyCounter++, amount: last.amount, paymentMethodId: last.paymentMethodId },
    ])
    setSplitError(null)
  }

  const removeSplit = (key: number) => {
    if (splits.length <= 1) return
    setSplits((prev) => prev.filter((s) => s.key !== key))
    setSplitError(null)
  }

  const updateSplitAmount = (key: number, value: number) => {
    setSplits((prev) =>
      prev.map((s) => (s.key === key ? { ...s, amount: value } : s)),
    )
    setSplitError(null)
  }

  const updateSplitMethod = (key: number, value: string) => {
    setSplits((prev) =>
      prev.map((s) => (s.key === key ? { ...s, paymentMethodId: value } : s)),
    )
    setSplitError(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-6 animate-spin" />
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-lg">
      <div className="mb-6 flex items-center gap-2">
        <Button variant="ghost" size="icon-sm" onClick={() => navigate('/transactions')}>
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="text-xl font-semibold">
          {isEdit ? 'Editar Transacao' : 'Nova Transacao'}
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dados da transacao</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="type">Tipo</Label>
              <Select items={{ expense: 'Despesa', income: 'Receita' }} value={type} onValueChange={(v) => setType(v as 'income' | 'expense')}>
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
              <CurrencyInput
                id="amount"
                value={amount}
                onChange={setAmount}
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="description">Descricao</Label>
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

            {!isEdit && (
              <div className="flex flex-col gap-2">
                <Label>Parcelas</Label>
                {splits.map((split, i) => (
                  <div key={split.key} className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground w-6 shrink-0">
                      {i + 1}
                    </span>
                    <CurrencyInput
                      value={split.amount}
                      onChange={(v) => updateSplitAmount(split.key, v)}
                      className="flex-1"
                      required
                    />
                    <Select
                      items={paymentMethods.map((pm) => ({ value: pm.id, label: pm.description }))}
                      value={split.paymentMethodId}
                      onValueChange={(v) => updateSplitMethod(split.key, v ?? '')}
                      required
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Método..." />
                      </SelectTrigger>
                      <SelectContent>
                        {paymentMethods.map((pm) => (
                          <SelectItem key={pm.id} value={pm.id}>
                            {pm.description}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => removeSplit(split.key)}
                      disabled={splits.length <= 1}
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addSplit} className="self-start">
                  <Plus className="size-4" />
                  Duplicar
                </Button>
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
                {splitError && (
                  <p className="text-sm text-destructive">{splitError}</p>
                )}
              </div>
            )}

            {!isEdit && (
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
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => navigate('/transactions')}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="size-4 mr-1 animate-spin" />}
                {isEdit ? 'Salvar' : 'Criar'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
