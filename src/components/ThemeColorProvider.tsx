'use client'

import { useEffect } from 'react'
import { usePerfil } from '@/hooks/usePerfil'

export function ThemeColorProvider({ children }: { children: React.ReactNode }) {
  const { data: perfil } = usePerfil()

  useEffect(() => {
    const tema = perfil?.tema || 'emerald'
    document.documentElement.setAttribute('data-theme', tema)
  }, [perfil?.tema])

  return <>{children}</>
}
