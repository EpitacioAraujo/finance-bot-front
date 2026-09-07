import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { createPaymentMethod, updatePaymentMethod, listPaymentMethods } from '@/api/payment-methods'
import { toast } from 'sonner'

export function PaymentMethodForm() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)

  const [description, setDescription] = useState('')
  const [cycleFrequency, setCycleFrequency] = useState<'daily' | 'weekly' | 'monthly'>('monthly')
  const [cycleCloseDay, setCycleCloseDay] = useState('')
  const [showInBills, setShowInBills] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(isEdit)

  useEffect(() => {
    if (!id) return
    listPaymentMethods().then((items) => {
      const found = items.find((pm) => pm.id === id)
      if (found) {
        setDescription(found.description)
        setCycleFrequency(found.cycleFrequency)
        if (found.cycleCloseDay !== null) setCycleCloseDay(String(found.cycleCloseDay))
        setShowInBills(found.showInBills ?? false)
      }
    }).finally(() => setLoading(false))
  }, [id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    const closeDay = cycleFrequency === 'daily' ? null : Number(cycleCloseDay) || null

    try {
      if (isEdit && id) {
        await updatePaymentMethod(id, { description, cycleFrequency, cycleCloseDay: closeDay, showInBills })
        toast.success('Forma de pagamento atualizada')
      } else {
        await createPaymentMethod({ description, cycleFrequency, cycleCloseDay: closeDay, showInBills })
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
              <Label htmlFor="freq">Frequencia</Label>
              <Select items={{ daily: 'Diario', weekly: 'Semanal', monthly: 'Mensal' }} value={cycleFrequency} onValueChange={(v) => setCycleFrequency(v as typeof cycleFrequency)}>
                <SelectTrigger id="freq">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Diario</SelectItem>
                  <SelectItem value="weekly">Semanal</SelectItem>
                  <SelectItem value="monthly">Mensal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {cycleFrequency !== 'daily' && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="closeDay">Dia de Fechamento</Label>
                <Input
                  id="closeDay"
                  type="number"
                  min={1}
                  max={cycleFrequency === 'weekly' ? 7 : 31}
                  value={cycleCloseDay}
                  onChange={(e) => setCycleCloseDay(e.target.value)}
                  required
                />
              </div>
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
