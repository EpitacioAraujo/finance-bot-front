import { postForm } from '@/lib/api'

export interface ChatReply {
  /** O que o backend entendeu do áudio. */
  transcript: string
  reply: string
  /** mp3 em base64, já pronto para tocar. */
  audio: string
}

export function sendAudio(blob: Blob): Promise<ChatReply> {
  const form = new FormData()
  // O nome importa: o AssemblyAI usa a extensão como dica do container.
  form.append('audio', blob, blob.type.includes('mp4') ? 'fala.mp4' : 'fala.webm')
  return postForm<ChatReply>('/chat', form)
}
