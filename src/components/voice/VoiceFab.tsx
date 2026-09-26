import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { VoiceDialog } from './VoiceDialog'

/** Fica em cima de tudo, em toda tela: falar não depende de onde você está. */
export function VoiceFab() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Falar com o assistente"
        className="bg-primary text-primary-foreground fixed bottom-6 right-6 z-40 flex size-14 items-center justify-center rounded-full shadow-lg transition-transform hover:scale-105"
      >
        <Sparkles className="size-6" />
      </button>

      {open && <VoiceDialog onClose={() => setOpen(false)} />}
    </>
  )
}
