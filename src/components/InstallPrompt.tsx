'use client'

import { useEffect, useState } from 'react'
import { FadeIn, AnimatedButton } from '@/components/animations'
import { X, MoreVertical } from 'lucide-react'

// Iconos customizados para compatibilidad
function Share(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  )
}

function Download(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}

function MonitorDown(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect width="20" height="14" x="2" y="3" rx="2" />
      <line x1="12" y1="17" x2="12" y2="21" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <path d="M12 13V8" />
      <path d="m9 10 3 3 3-3" />
    </svg>
  )
}

export function InstallPrompt() {
  const [show, setShow] = useState(false)
  const [platform, setPlatform] = useState<'ios' | 'android' | 'desktop' | 'other'>('other')
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)

  useEffect(() => {
    // 1. Listen for the install prompt on supported browsers (Chrome/Edge/Android)
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
    })

    // 2. Check if already running as standalone (installed)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone
    if (isStandalone) return

    // 3. Check if user already dismissed the prompt
    const dismissed = localStorage.getItem('apicash-install-prompt')
    if (dismissed) return

    // 4. Detect platform for specific instructions
    const ua = navigator.userAgent.toLowerCase()
    if (/iphone|ipad|ipod/.test(ua)) {
      setPlatform('ios')
    } else if (/android/.test(ua)) {
      setPlatform('android')
    } else {
      setPlatform('desktop')
    }

    // Wait a brief moment before showing to not be too aggressive
    const timer = setTimeout(() => setShow(true), 2000)
    return () => clearTimeout(timer)
  }, [])

  const handleDismiss = () => {
    localStorage.setItem('apicash-install-prompt', 'true')
    setShow(false)
  }

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        setShow(false)
      }
      setDeferredPrompt(null)
    }
  }

  if (!show) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/40 dark:bg-slate-950/60 p-4 sm:p-6 backdrop-blur-sm transition-all">
      <FadeIn className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800 relative overflow-hidden">
        
        {/* Decorative background circle */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-500/10 dark:bg-emerald-500/5 rounded-full blur-2xl" />

        <div className="flex items-start justify-between mb-2 relative">
          <div className="bg-emerald-100 dark:bg-emerald-900/30 p-2.5 rounded-xl mb-4 text-emerald-600 dark:text-emerald-400 inline-block">
            <Download className="w-6 h-6" />
          </div>
          <button 
            onClick={handleDismiss} 
            className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2 relative">
          Instala Apicash
        </h2>
        
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 relative">
          Para una experiencia inmersiva y rápida, instala la app en tu dispositivo. ¡Ocupa muy poco espacio!
        </p>

        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 mb-6 border border-slate-100 dark:border-slate-800">
          {platform === 'ios' && (
            <div className="flex flex-col gap-3 text-sm text-slate-700 dark:text-slate-300">
              <div className="flex items-center gap-3">
                <div className="bg-white dark:bg-slate-700 p-1.5 rounded-lg shadow-sm">
                  <Share className="w-4 h-4 text-blue-500" />
                </div>
                <span>1. Toca el botón <strong>Compartir</strong> en la barra inferior.</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-white dark:bg-slate-700 p-1.5 rounded-lg shadow-sm">
                  <PlusSquare className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                </div>
                <span>2. Selecciona <strong>Añadir a pantalla de inicio</strong>.</span>
              </div>
            </div>
          )}

          {platform === 'android' && (
            <div className="flex flex-col gap-3 text-sm text-slate-700 dark:text-slate-300">
              <div className="flex items-center gap-3">
                <div className="bg-white dark:bg-slate-700 p-1.5 rounded-lg shadow-sm">
                  <MoreVertical className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                </div>
                <span>1. Toca el <strong>Menú</strong> en la esquina del navegador.</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-white dark:bg-slate-700 p-1.5 rounded-lg shadow-sm">
                  <Download className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                </div>
                <span>2. Selecciona <strong>Instalar aplicación</strong>.</span>
              </div>
            </div>
          )}

          {platform === 'desktop' && (
            <div className="flex flex-col gap-3 text-sm text-slate-700 dark:text-slate-300">
              <div className="flex items-center gap-3">
                <div className="bg-white dark:bg-slate-700 p-1.5 rounded-lg shadow-sm">
                  <MonitorDown className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                </div>
                <span>Haz clic en el <strong>icono de instalar</strong> en el extremo derecho de la barra de direcciones.</span>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 relative">
          <button 
            onClick={handleDismiss}
            className="flex-1 py-2.5 px-4 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Más tarde
          </button>
          
          {/* Si el navegador soporta disparar el prompt nativo (Chrome Android/Desktop), mostramos el botón de instalación directa */}
          {deferredPrompt ? (
            <AnimatedButton onClick={handleInstallClick} className="flex-1">
              Instalar ahora
            </AnimatedButton>
          ) : (
            <AnimatedButton onClick={handleDismiss} className="flex-1">
              Entendido
            </AnimatedButton>
          )}
        </div>
      </FadeIn>
    </div>
  )
}

function PlusSquare(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M8 12h8" />
      <path d="M12 8v8" />
    </svg>
  )
}
