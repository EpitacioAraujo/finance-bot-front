import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { createBill, getBill, updateBill, type CreateBillData } from '@/api/bills'
import { listPaymentMethods } from '@/api/payment-methods'
import { listTags } from '@/api/tags'
import type { PaymentMethod } from '@/types/payment-method'
import type { Tag } from '@/types/tag'
import {
  BILL_FREQUENCIES,
  BILL_FREQUENCY_LABELS,
  type BillFrequency,
} from '@/types/bill'
import { toast } from 'sonner'
import { TransactionType } from '@/types/transaction'

export function BillForm() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)

  const [type, setType] = useState<TransactionType>(TransactionType.Expense)
  const [description, setDescription] = useState('')
  const [predictedAmount, setPredictedAmount] = useState('')
  const [frequency, setFrequency] = useState<BillFrequency>('monthly')
  const [dueDate, setDueDate] = useState('')
  const [dueDay, setDueDay] = useState('')
  const [paymentMethodId, setPaymentMethodId] = useState('')
  const [tagId, setTagId] = useState('')
  const [notes, setNotes] = useState('')
  const [active, setActive] = useState(true)

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(isEdit)

  useEffect(() => {
    Promise.all([listPaymentMethods(), listTags()]).then(([pm, t]) => {
      setPaymentMethods(pm)
      setTags(t)
    })
  }, [])

  useEffect(() => {
    if (!id) return
    getBill(id)
      .then((bill) => {
        setType(bill.type)
        setDescription(bill.description)
        setPredictedAmount(String(bill.predictedAmount))
        setFrequency(bill.frequency)
        if (bill.dueDate) setDueDate(bill.dueDate)
        if (bill.dueDay) setDueDay(String(bill.dueDay))
        setPaymentMethodId(bill.paymentMethodId)
        if (bill.tagId) setTagId(bill.tagId)
        if (bill.notes) setNotes(bill.notes)
        setActive(bill.active)
      })
      .catch(() => toast.error('Erro ao carregar conta'))
      .finally(() => setLoading(false))
  }, [id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    // Manda os dois; a frequência decide no backend qual vale.
    // Tipo só vai no create: não muda depois, e o backend rejeita campo fora do DTO.
    const data: Omit<CreateBillData, 'type'> = {
      description,
      predictedAmount: Number(predictedAmount),
      frequency,
      paymentMethodId,
      dueDate: dueDate || undefined,
      dueDay: Number(dueDay) || undefined,
      tagId: tagId || undefined,
      notes: notes || undefined,
      active,
    }

    try {
      if (isEdit && id) {
        await updateBill(id, data)
        toast.success('Conta atualizada')
      } else {
        await createBill({ ...data, type })
        toast.success('Conta criada')
      }
      navigate('/recorrencias')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
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
        <Button variant="ghost" size="icon-sm" onClick={() => navigate('/recorrencias')}>
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="text-xl font-semibold">
          {isEdit ? 'Editar' : 'Nova'} Conta
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dados</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="type">Tipo</Label>
              {/* Tipo não muda depois de criada: a transação que quita já nasceu com ele. */}
              <Select
                items={{ [TransactionType.Expense]: 'A pagar', [TransactionType.Income]: 'A receber' }}
                value={type}
                onValueChange={(v) => v && setType(v as TransactionType)}
                disabled={isEdit}
              >
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={TransactionType.Expense}>A pagar</SelectItem>
                  <SelectItem value={TransactionType.Income}>A receber</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="desc">Descricao</Label>
              <Input
                id="desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="amount">Valor Previsto</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                value={predictedAmount}
                onChange={(e) => setPredictedAmount(e.target.value)}
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="freq">Frequência</Label>
              <Select
                items={BILL_FREQUENCY_LABELS}
                value={frequency}
                onValueChange={(v) => v && setFrequency(v as BillFrequency)}
              >
                <SelectTrigger id="freq">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BILL_FREQUENCIES.map((item) => (
                    <SelectItem key={item} value={item}>
                      {BILL_FREQUENCY_LABELS[item]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Mensal vence num dia; avulsa e anual vencem numa data. */}
            {frequency === 'monthly' ? (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="dueDay">Dia do Vencimento</Label>
                <Input
                  id="dueDay"
                  type="number"
                  min={1}
                  max={31}
                  value={dueDay}
                  onChange={(e) => setDueDay(e.target.value)}
                  required
                />
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="dueDate">Vencimento</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pm">Forma de Pagamento</Label>
              <Select items={paymentMethods.map((pm) => ({ value: pm.id, label: pm.description }))} value={paymentMethodId} onValueChange={(v) => v && setPaymentMethodId(v)}>
                <SelectTrigger id="pm">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((pm) => (
                    <SelectItem key={pm.id} value={pm.id}>{pm.description}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Tags (opcional)</Label>
              {/* A conta guarda uma tag só: clicar em outra troca, clicar na
                  marcada limpa. */}
              <div className="flex flex-wrap gap-1">
                {tags.map((tag) => {
                  const selected = tagId === tag.id
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => setTagId(selected ? '' : tag.id)}
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
              <Label htmlFor="notes">Observacao (opcional)</Label>
              <Input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                checked={active}
                onCheckedChange={() => setActive(!active)}
              />
              <Label>Ativa</Label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => navigate('/recorrencias')}>
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
