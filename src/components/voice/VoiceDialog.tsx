import { useEffect } from 'react'
import { Mic, X } from 'lucide-react'
import { useRecorder } from '@/hooks/use-recorder'
import { VoiceWaves } from './VoiceWaves'

const HINT: Record<string, string> = {
  idle: 'Segure para falar',
  recording: 'Solte para enviar',
  sending: 'Pensando...',
  denied: 'Libere o microfone nas permissões do navegador',
  error: 'Deu errado. Segure para tentar de novo',
}

export function VoiceDialog({ onClose }: { onClose: () => void }) {
  const { state, analyser, reply, error, start, stop, release } = useRecorder()
  const busy = state === 'sending'

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const close = () => {
    release()
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 bg-black/70 backdrop-blur-sm"
      onClick={close}
    >
      <button
        onClick={close}
        aria-label="Fechar"
        className="absolute right-5 top-5 rounded-full p-2 text-white/60 hover:text-white"
      >
        <X className="size-5" />
      </button>

      {/* O clique no conteúdo não fecha; só o clique no fundo. */}
      <div
        className="flex flex-col items-center gap-8"
        onClick={(event) => event.stopPropagation()}
      >
        <VoiceWaves analyser={analyser} loading={busy} />

        <div className="flex min-h-16 max-w-sm flex-col items-center gap-1 px-6 text-center">
          {reply && (
            <>
              <p className="text-sm text-white/50">{reply.transcript}</p>
              <p className="text-base text-white">{reply.reply}</p>
            </>
          )}
          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>

        {/* Pointer events cobrem mouse e toque com um caminho só. A captura é o
            que garante o `pointerup` mesmo se o dedo sair do botão. */}
        <button
          disabled={busy}
          aria-label="Segure para falar"
          onContextMenu={(event) => event.preventDefault()}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId)
            void start()
          }}
          onPointerUp={stop}
          onPointerCancel={stop}
          className={`flex size-16 touch-none select-none items-center justify-center rounded-full transition-transform disabled:opacity-40 ${
            state === 'recording'
              ? 'scale-110 bg-red-500 text-white'
              : 'bg-white text-black'
          }`}
        >
          <Mic className="size-7" />
        </button>

        <p className="text-sm text-white/60">{HINT[state]}</p>
      </div>
    </div>
  )
}
