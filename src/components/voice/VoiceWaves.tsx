import { useEffect, useRef } from 'react'

const BARS = 21

/**
 * O círculo de ondas. Enquanto grava, as barras seguem o `AnalyserNode` de
 * verdade — grave no meio, agudo nas pontas, que é o que dá o desenho orgânico
 * em vez de uma escada. Parado, respiram sozinhas pelo CSS.
 *
 * As alturas são escritas direto no DOM: passar por estado a 60fps redesenharia
 * a tela inteira a cada quadro.
 */
export function VoiceWaves({
  analyser,
  loading,
}: {
  analyser: AnalyserNode | null
  loading: boolean
}) {
  const bars = useRef<(HTMLSpanElement | null)[]>([])

  useEffect(() => {
    if (!analyser) return

    const data = new Uint8Array(analyser.frequencyBinCount)
    let frame = requestAnimationFrame(function tick() {
      analyser.getByteFrequencyData(data)
      const middle = (BARS - 1) / 2
      bars.current.forEach((bar, index) => {
        if (!bar) return
        const level = data[Math.round(Math.abs(index - middle))] ?? 0
        bar.style.height = `${10 + (level / 255) * 90}%`
      })
      frame = requestAnimationFrame(tick)
    })

    return () => cancelAnimationFrame(frame)
  }, [analyser])

  return (
    <div className="relative">
      {/* Fora do círculo, senão o `overflow-hidden` dele cortaria o anel. */}
      {loading && (
        <span className="absolute -inset-2 animate-spin rounded-full border-2 border-transparent border-t-white" />
      )}

      <div className="flex size-56 items-center justify-center overflow-hidden rounded-full border-2 border-white/20">
        {/* 164px de faixa em 224px de círculo: no pico, a barra mais externa
            fica a 99px do centro, dentro do raio de 112px. Mexer em BARS, na
            largura ou no gap sem refazer essa conta faz as ondas vazarem. */}
        <div className="flex h-28 items-center gap-1">
          {Array.from({ length: BARS }, (_, index) => (
            <span
              key={index}
              ref={(node) => {
                bars.current[index] = node
              }}
              className={
                analyser
                  ? 'w-1 rounded-full bg-white'
                  : 'w-1 rounded-full bg-white/70 animate-[voice-idle_1.6s_ease-in-out_infinite]'
              }
              style={
                analyser
                  ? { height: '10%' }
                  : {
                      animationDelay: `${Math.abs(index - (BARS - 1) / 2) * 90}ms`,
                    }
              }
            />
          ))}
        </div>
      </div>
    </div>
  )
}
