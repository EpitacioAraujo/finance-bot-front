import { get, post, patch, del } from '@/lib/api'
import type { Tag } from '@/types/tag'

export function listTags(): Promise<Tag[]> {
  return get<Tag[]>('/tags')
}

export function createTag(data: Pick<Tag, 'description'>): Promise<Tag> {
  return post<Tag>('/tags', data)
}

export function updateTag(
  id: string,
  data: Pick<Tag, 'description'>,
): Promise<Tag> {
  return patch<Tag>(`/tags/${id}`, data)
}

export function deleteTag(id: string): Promise<void> {
  return del(`/tags/${id}`)
}
