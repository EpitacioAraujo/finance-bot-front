import { useCallback, useEffect, useRef, useState } from 'react'
import { sendAudio, type ChatReply } from '@/api/chat'

export type VoiceState = 'idle' | 'recording' | 'sending' | 'denied' | 'error'

/** Abaixo disso foi toque acidental — não vale uma transcrição. */
const MIN_MS = 300
/** Teto da gravação: segura o limite de corpo do nginx e o timeout da rota. */
const MAX_MS = 60_000

/** O Safari não grava webm, grava mp4. O AssemblyAI aceita os dois. */
const pickMime = (): string =>
  ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find((type) =>
    MediaRecorder.isTypeSupported(type),
  ) ?? ''

/**
 * Segurar para falar: `start` no pointerdown, `stop` no pointerup. Ao soltar,
 * sobe o áudio, espera a resposta e toca de volta — sem fila, sem polling.
 */
export function useRecorder() {
  const [state, setState] = useState<VoiceState>('idle')
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null)
  const [reply, setReply] = useState<ChatReply | null>(null)
  const [error, setError] = useState<string | null>(null)

  const stream = useRef<MediaStream | null>(null)
  const recorder = useRef<MediaRecorder | null>(null)
  const context = useRef<AudioContext | null>(null)
  const startedAt = useRef(0)
  const timer = useRef<number | undefined>(undefined)
  // Na primeira vez o navegador pede permissão e `start` demora. Se o dedo
  // soltar nesse meio-tempo, `stop` não tem o que parar — sem isto o microfone
  // ficaria aberto até o teto de 60s.
  const stopped = useRef(false)
  const playing = useRef<HTMLAudioElement | null>(null)

  const hush = useCallback(() => {
    playing.current?.pause()
    playing.current = null
  }, [])

  // Sem isto o ponto de "gravando" do navegador fica aceso depois de fechar.
  const release = useCallback(() => {
    window.clearTimeout(timer.current)
    hush()
    stream.current?.getTracks().forEach((track) => track.stop())
    void context.current?.close()
    stream.current = null
    context.current = null
    recorder.current = null
    setAnalyser(null)
  }, [hush])

  const start = useCallback(async () => {
    if (state === 'recording' || state === 'sending') return
    // Apertar o microfone interrompe: ninguém fala por cima da resposta.
    hush()
    stopped.current = false
    setReply(null)
    setError(null)

    let media: MediaStream
    try {
      media = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      setState('denied')
      return
    }
    stream.current = media

    const ctx = new AudioContext()
    const node = ctx.createAnalyser()
    node.fftSize = 64
    ctx.createMediaStreamSource(media).connect(node)
    context.current = ctx
    setAnalyser(node)

    const mime = pickMime()
    const chunks: Blob[] = []
    const rec = new MediaRecorder(media, mime ? { mimeType: mime } : undefined)

    rec.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data)
    }
    rec.onstop = () => {
      const duration = Date.now() - startedAt.current
      const blob = new Blob(chunks, { type: mime || 'audio/webm' })
      release()

      if (duration < MIN_MS || blob.size === 0) {
        setState('idle')
        return
      }

      setState('sending')
      sendAudio(blob)
        .then((data) => {
          setReply(data)
          setState('idle')
          const audio = new Audio(`data:audio/mpeg;base64,${data.audio}`)
          playing.current = audio
          // ponytail: se o navegador barrar o autoplay, o texto fica na tela.
          // Se isso virar problema no iPhone, aí entra o botão de tocar.
          void audio.play().catch(() => undefined)
        })
        .catch((err: unknown) => {
          setError(err instanceof Error ? err.message : 'Não deu para enviar')
          setState('error')
        })
    }

    recorder.current = rec
    startedAt.current = Date.now()
    rec.start()
    setState('recording')
    timer.current = window.setTimeout(() => rec.stop(), MAX_MS)
    if (stopped.current) rec.stop()
  }, [state, release, hush])

  const stop = useCallback(() => {
    stopped.current = true
    if (recorder.current?.state === 'recording') recorder.current.stop()
  }, [])

  useEffect(() => release, [release])

  return { state, analyser, reply, error, start, stop, release }
}
