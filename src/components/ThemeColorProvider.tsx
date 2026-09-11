'use client'

import { useEffect } from 'react'
import { usePerfil } from '@/hooks/usePerfil'

export function ThemeColorProvider({ children }: { children: React.ReactNode }) {
  const { data: perfil } = usePerfil()

  useEffect(() => {
    // Cuando el perfil cambia y tenemos un tema, actualizar html y localStorage
    if (perfil?.tema) {
      document.documentElement.setAttribute('data-theme', perfil.tema)
      localStorage.setItem('apicash-theme', perfil.tema)
    }
  }, [perfil?.tema])

  return <>{children}</>
}
