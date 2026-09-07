import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { LoadingState } from '@/components/LoadingState'
import { EmptyState } from '@/components/EmptyState'
import { listTags, deleteTag } from '@/api/tags'
import type { Tag } from '@/types/tag'
import { Plus, Pencil, Trash2 } from 'lucide-react'

export function TagListPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    listTags().then(setItems).finally(() => setLoading(false))
  }

  useEffect(load, [])

  const handleConfirmDelete = async () => {
    if (!deleteId) return
    try {
      await deleteTag(deleteId)
      setItems((prev) => prev.filter((t) => t.id !== deleteId))
    } catch {
    } finally {
      setDeleteId(null)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Tags</h1>
          <p className="text-sm text-muted-foreground">Gerencie suas categorias</p>
        </div>
        <Button onClick={() => navigate('/tags/new')}>
          <Plus className="size-4" /> Nova
        </Button>
      </div>

      <div className="bg-card rounded-lg border border-border">
        {loading ? (
          <LoadingState />
        ) : items.length === 0 ? (
          <EmptyState message="Nenhuma tag cadastrada." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descricao</TableHead>
                <TableHead className="w-[80px] sr-only">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((tag) => (
                <TableRow key={tag.id}>
                  <TableCell>{tag.description}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon-xs" onClick={() => navigate(`/tags/${tag.id}/edit`)}>
                        <Pencil className="size-3" />
                      </Button>
                      <Button variant="ghost" size="icon-xs" onClick={() => setDeleteId(tag.id)}>
                        <Trash2 className="size-3 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <ConfirmDialog
        open={deleteId !== null}
        title="Remover tag"
        message="Tem certeza que deseja remover esta tag?"
        loading={false}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}
