'use client'

import { useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import { isDemoModeActive, deactivateDemoMode, getDefaultDemoState, setDemoState } from '@/lib/demoData'
import { Sparkles, RotateCcw, LogOut } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'

const emptySubscribe = () => () => {}

export function DemoBanner() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const active = useSyncExternalStore(emptySubscribe, isDemoModeActive, () => false)

  if (!active) return null

  const handleResetData = () => {
    if (confirm('¿Deseas reiniciar los datos de prueba a su estado original?')) {
      setDemoState(getDefaultDemoState())
      queryClient.clear()
      window.location.reload()
    }
  }

  const handleExitDemo = () => {
    deactivateDemoMode()
    queryClient.clear()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-amber-800 dark:text-amber-200 text-xs sm:text-sm flex items-center justify-between gap-3 sticky top-0 z-50 backdrop-blur-md">
      <div className="flex items-center gap-2 font-medium">
        <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 animate-pulse" />
        <span>
          <strong className="font-semibold">Modo Demo Interactivo:</strong> Los datos son locales y temporales. Puedes crear, editar y probar todas las funciones libremente.
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={handleResetData}
          className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/15 hover:bg-amber-500/25 rounded-md font-medium transition-colors text-amber-900 dark:text-amber-100"
          title="Reiniciar datos demo"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Reiniciar datos</span>
        </button>
        <button
          onClick={handleExitDemo}
          className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-600 text-white hover:bg-amber-700 rounded-md font-medium transition-colors shadow-sm"
          title="Salir del modo demo"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Salir de Demo</span>
        </button>
      </div>
    </div>
  )
}
