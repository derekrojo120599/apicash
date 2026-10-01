'use client'

import { useEffect, useState } from 'react'
import { RefreshCw, X } from 'lucide-react'

interface WorkboxLike {
  addEventListener(event: string, callback: () => void): void
  register(): Promise<void>
  messageSkipWaiting(): void
}

export function PwaUpdater() {
  const [showUpdate, setShowUpdate] = useState(false)

  useEffect(() => {
    // Only execute on browser client
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      if (window.workbox !== undefined) {
        const wb = window.workbox

        // Triggers when a new Service Worker version is in waiting state
        wb.addEventListener('waiting', () => {
          setShowUpdate(true)
        })

        // Triggers when the Service Worker takes control after skipWaiting()
        wb.addEventListener('controlling', () => {
          window.location.reload()
        })

        wb.register().catch((err: unknown) => {
          console.warn('Workbox registration failed:', err)
        })
      } else {
        // Direct native fallback to ensure service worker registers in production
        navigator.serviceWorker.register('/sw.js').catch((err: unknown) => {
          console.warn('ServiceWorker fallback registration failed:', err)
        })
      }
    }
  }, [])

  const handleUpdate = () => {
    if (typeof window !== 'undefined' && window.workbox !== undefined) {
      const wb = window.workbox
      // Request waiting Service Worker to take immediate control
      wb.messageSkipWaiting()
      setShowUpdate(false)
    }
  }

  if (!showUpdate) return null

  return (
    <div className="fixed bottom-20 md:bottom-6 right-4 left-4 md:left-auto md:w-96 bg-slate-900 text-white p-4 rounded-2xl shadow-2xl z-50 flex items-start gap-4 animate-in slide-in-from-bottom-5">
      <div className="bg-primary-500/20 p-2 rounded-full">
        <RefreshCw className="w-5 h-5 text-primary-400" />
      </div>
      <div className="flex-1">
        <h3 className="font-bold text-sm">Nueva versión disponible</h3>
        <p className="text-xs text-slate-300 mt-1">Actualice la aplicación para obtener las últimas mejoras y correcciones.</p>
        <div className="flex gap-2 mt-3">
          <button 
            onClick={handleUpdate}
            className="flex-1 bg-primary-500 hover:bg-primary-600 text-white text-xs font-bold py-2 px-3 rounded-lg transition-colors"
          >
            Actualizar ahora
          </button>
          <button 
            onClick={() => setShowUpdate(false)}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 text-xs font-medium transition-colors"
          >
            Más tarde
          </button>
        </div>
      </div>
      <button onClick={() => setShowUpdate(false)} className="text-slate-400 hover:text-white">
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

// Global TypeScript declaration for workbox window extension
declare global {
  interface Window {
    workbox?: WorkboxLike
  }
}
