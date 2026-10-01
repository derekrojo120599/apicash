'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

export function ThemeToggle({ showLabel = true }: { showLabel?: boolean }) {
  const [mounted, setMounted] = useState(false)
  const { resolvedTheme, setTheme } = useTheme()

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0)
    return () => clearTimeout(timer)
  }, [])

  if (!mounted) {
    return (
      <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-400">
        <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-800 animate-pulse" />
        {showLabel && <span className="text-sm font-medium opacity-50">Tema</span>}
      </div>
    )
  }

  const isDark = resolvedTheme === 'dark'

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="px-3 py-2.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-100 rounded-lg transition-colors flex items-center gap-3 w-full text-sm md:text-base font-medium cursor-pointer"
      title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
    >
      {isDark ? (
        <Sun className="h-5 w-5 text-amber-400 shrink-0" />
      ) : (
        <Moon className="h-5 w-5 text-indigo-500 shrink-0" />
      )}
      {showLabel && (
        <span className="flex-1 text-left">
          {isDark ? 'Modo claro' : 'Modo oscuro'}
        </span>
      )}
    </button>
  )
}
