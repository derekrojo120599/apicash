'use client'

import { SVGProps, useEffect, useState } from 'react'
import { FadeIn, AnimatedButton } from '@/components/animations'
import { X, MoreVertical, Smartphone, Sparkles } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function detectPlatform(): 'ios' | 'android' | 'desktop' | 'other' {
  if (typeof window === 'undefined') return 'other'
  const ua = navigator.userAgent.toLowerCase()
  if (/iphone|ipad|ipod/.test(ua)) return 'ios'
  if (/android/.test(ua)) return 'android'
  return 'desktop'
}

// Custom icons for compatibility
function Share(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  )
}

function Download(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}

function MonitorDown(props: SVGProps<SVGSVGElement>) {
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
  const [platform] = useState<'ios' | 'android' | 'desktop' | 'other'>(detectPlatform)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    // 1. Listen for the install prompt on supported browsers (Chrome/Edge/Android)
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handleBeforeInstall)

    // 2. Check if already running as standalone (installed)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as unknown as { standalone?: boolean }).standalone
    if (isStandalone) return

    // 3. Check if user already dismissed the prompt in this session or previously
    const dismissed = localStorage.getItem('apicash-install-prompt-v2')
    if (dismissed) return

    // Show after 1.5 seconds on initial entrance
    const timer = setTimeout(() => setShow(true), 1500)
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
      clearTimeout(timer)
    }
  }, [])

  const handleDismiss = () => {
    localStorage.setItem('apicash-install-prompt-v2', 'true')
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 sm:p-6 backdrop-blur-md transition-all">
      <FadeIn className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 p-6 sm:p-7 shadow-2xl border border-slate-200 dark:border-slate-800 relative overflow-hidden">
        
        {/* Glow decorativo */}
        <div className="absolute -top-16 -right-16 w-40 h-40 bg-emerald-500/15 dark:bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-start justify-between mb-4 relative">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-100 dark:bg-emerald-950/50 p-3 rounded-2xl text-emerald-600 dark:text-emerald-400 shadow-sm border border-emerald-200/50 dark:border-emerald-800/50">
              <Smartphone className="w-7 h-7" />
            </div>
            <div>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40 mb-1">
                <Sparkles className="w-3 h-3" /> App Nativa Disponible
              </span>
              <h2 className="text-xl font-black text-slate-900 dark:text-white leading-tight">
                ¡Lleva El Sencillo en tu móvil!
              </h2>
            </div>
          </div>
          <button 
            onClick={handleDismiss} 
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-5 relative leading-relaxed">
          Disfruta de sincronización en tiempo real, notificaciones instantáneas y acceso offline instalando la aplicación nativa en tu dispositivo.
        </p>

        {/* Sección de descarga / instalación directa */}
        <div className="space-y-3 mb-6 relative">
          <a
            href="https://github.com/derekrojo120599/apicash/releases/latest/download/apicash.apk"
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleDismiss}
            className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center justify-center gap-2.5 text-sm shadow-lg shadow-emerald-950/20 active:scale-[0.98] transition-all"
          >
            <Download className="w-5 h-5" />
            <span>Descargar APK Nativa (Android)</span>
          </a>

          {platform === 'ios' && (
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-3.5 border border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 space-y-2">
              <p className="font-semibold text-slate-800 dark:text-slate-200">En iPhone / iPad:</p>
              <div className="flex items-center gap-2.5">
                <Share className="w-4 h-4 text-blue-500 shrink-0" />
                <span>1. Toca <strong>Compartir</strong> en Safari</span>
              </div>
              <div className="flex items-center gap-2.5">
                <PlusSquare className="w-4 h-4 text-slate-500 shrink-0" />
                <span>2. Elige <strong>Añadir a pantalla de inicio</strong></span>
              </div>
            </div>
          )}

          {deferredPrompt && (
            <button
              onClick={handleInstallClick}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-medium text-xs flex items-center justify-center gap-2 transition-colors"
            >
              <MonitorDown className="w-4 h-4" />
              <span>O instalar versión Web Ligera (PWA)</span>
            </button>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/60 relative">
          <button 
            onClick={handleDismiss}
            className="py-2 px-4 rounded-xl text-xs font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Continuar en la Web
          </button>
        </div>
      </FadeIn>
    </div>
  )
}

function PlusSquare(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M8 12h8" />
      <path d="M12 8v8" />
    </svg>
  )
}
