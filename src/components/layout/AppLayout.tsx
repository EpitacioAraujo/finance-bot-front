import { Outlet } from 'react-router-dom'
import { Toaster } from 'sonner'
import { VoiceFab } from '@/components/voice/VoiceFab'

export function AppLayout() {
  return (
    <>
      <main className="mx-auto w-full max-w-7xl px-4 py-4">
        <Outlet />
      </main>
      <VoiceFab />
      <Toaster position="bottom-right" richColors closeButton />
    </>
  )
}
