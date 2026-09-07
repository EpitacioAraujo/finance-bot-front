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
import { createBill, updateBill, fetchBills } from '@/api/bills'
import { listPaymentMethods } from '@/api/payment-methods'
import { listTags } from '@/api/tags'
import type { PaymentMethod } from '@/types/payment-method'
import type { Tag } from '@/types/tag'
import { toast } from 'sonner'

export function BillForm() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)

  const [description, setDescription] = useState('')
  const [predictedAmount, setPredictedAmount] = useState('')
  const [frequency, setFrequency] = useState<string>('monthly')
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
    fetchBills(new Date().toISOString().slice(0, 7))
      .then((result) => {
        const found = result.bills.find((b) => b.id === id)
        if (found) {
          setDescription(found.description)
          setPredictedAmount(String(found.predictedAmount))
          setFrequency(found.frequency)
          if (found.dueDate) setDueDate(found.dueDate)
          if (found.dueDay) setDueDay(String(found.dueDay))
          setPaymentMethodId(found.paymentMethod.id)
          if (found.tag) setTagId(found.tag.id)
          if (found.notes) setNotes(found.notes)
          setActive(found.active)
        }
      })
      .finally(() => setLoading(false))
  }, [id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    const data: any = {
      description,
      predictedAmount: Number(predictedAmount),
      frequency,
      paymentMethodId,
      tagId: tagId || undefined,
      notes: notes || undefined,
      active,
    }

    if (frequency === 'none') {
      data.dueDate = dueDate
    } else {
      data.dueDay = Number(dueDay)
    }

    try {
      if (isEdit && id) {
        await updateBill(id, data)
        toast.success('Conta atualizada')
      } else {
        await createBill(data)
        toast.success('Conta criada')
      }
      navigate('/contas-a-pagar')
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
        <Button variant="ghost" size="icon-sm" onClick={() => navigate('/contas-a-pagar')}>
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="text-xl font-semibold">
          {isEdit ? 'Editar' : 'Nova'} Conta a Pagar
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dados</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
              <Label htmlFor="freq">Frequencia</Label>
              <Select items={{ none: 'Avulsa (data unica)', daily: 'Diaria', weekly: 'Semanal', monthly: 'Mensal', yearly: 'Anual' }} value={frequency} onValueChange={(v) => v && setFrequency(v)}>
                <SelectTrigger id="freq">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Avulsa (data unica)</SelectItem>
                  <SelectItem value="daily">Diaria</SelectItem>
                  <SelectItem value="weekly">Semanal</SelectItem>
                  <SelectItem value="monthly">Mensal</SelectItem>
                  <SelectItem value="yearly">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {frequency === 'none' ? (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="dueDate">Vencimento</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  required={frequency === 'none'}
                />
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="dueDay">Dia do Vencimento</Label>
                <Input
                  id="dueDay"
                  type="number"
                  min={1}
                  max={31}
                  value={dueDay}
                  onChange={(e) => setDueDay(e.target.value)}
                  required={frequency !== 'none'}
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
              <Label htmlFor="tag">Categoria (opcional)</Label>
              <Select items={[{ value: '', label: 'Nenhuma' }, ...tags.map((t) => ({ value: t.id, label: t.description }))]} value={tagId} onValueChange={(v) => v !== null && setTagId(v)}>
                <SelectTrigger id="tag">
                  <SelectValue placeholder="Nenhuma" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhuma</SelectItem>
                  {tags.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.description}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <Button type="button" variant="outline" onClick={() => navigate('/contas-a-pagar')}>
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
