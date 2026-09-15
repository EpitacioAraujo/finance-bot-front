import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { createPaymentMethod, updatePaymentMethod, getPaymentMethod } from '@/api/payment-methods'
import {
  PAYMENT_METHOD_KINDS,
  PAYMENT_METHOD_KIND_LABELS,
  type PaymentMethodKind,
} from '@/types/payment-method'
import { toast } from 'sonner'

export function PaymentMethodForm() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)

  const [description, setDescription] = useState('')
  const [kind, setKind] = useState<PaymentMethodKind>('credit')
  const [closingDay, setClosingDay] = useState('')
  const [dueDay, setDueDay] = useState('')
  const [showInBills, setShowInBills] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(isEdit)

  useEffect(() => {
    if (!id) return
    getPaymentMethod(id)
      .then((found) => {
        setDescription(found.description)
        setKind(found.kind)
        if (found.closingDay !== null) setClosingDay(String(found.closingDay))
        if (found.dueDay !== null) setDueDay(String(found.dueDay))
        setShowInBills(found.showInBills)
      })
      .catch(() => toast.error('Erro ao carregar forma de pagamento'))
      .finally(() => setLoading(false))
  }, [id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    // Manda os dias sempre; o backend zera fora do crédito.
    const data = {
      description,
      kind,
      closingDay: Number(closingDay) || undefined,
      dueDay: Number(dueDay) || undefined,
      showInBills,
    }

    try {
      if (isEdit && id) {
        await updatePaymentMethod(id, data)
        toast.success('Forma de pagamento atualizada')
      } else {
        await createPaymentMethod(data)
        toast.success('Forma de pagamento criada')
      }
      navigate('/payment-methods')
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
        <Button variant="ghost" size="icon-sm" onClick={() => navigate('/payment-methods')}>
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="text-xl font-semibold">
          {isEdit ? 'Editar' : 'Nova'} Forma de Pagamento
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
              <Input id="desc" value={description} onChange={(e) => setDescription(e.target.value)} required />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="kind">Tipo</Label>
              <Select
                items={PAYMENT_METHOD_KIND_LABELS}
                value={kind}
                onValueChange={(v) => v && setKind(v as PaymentMethodKind)}
              >
                <SelectTrigger id="kind">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHOD_KINDS.map((item) => (
                    <SelectItem key={item} value={item}>
                      {PAYMENT_METHOD_KIND_LABELS[item]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {kind === 'credit' && (
              <>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="closingDay">Dia de fechamento</Label>
                  <Input
                    id="closingDay"
                    type="number"
                    min={1}
                    max={31}
                    value={closingDay}
                    onChange={(e) => setClosingDay(e.target.value)}
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="dueDay">Dia de vencimento</Label>
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
              </>
            )}

            <div className="flex items-center gap-2">
              <Checkbox
                checked={showInBills}
                onCheckedChange={() => setShowInBills(!showInBills)}
              />
              <Label>Exibir em Contas a Pagar</Label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => navigate('/payment-methods')}>
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
