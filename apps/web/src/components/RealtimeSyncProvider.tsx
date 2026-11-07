'use client'

import { useEffect, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/utils/supabase/client'

export function RealtimeSyncProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient()
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    // Escuchar cambios en transacciones, cuentas, metas, deudas y presupuestos
    const channel = supabase
      .channel('apicash-web-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transacciones' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['transacciones'] })
          queryClient.invalidateQueries({ queryKey: ['ultimasTransacciones'] })
          queryClient.invalidateQueries({ queryKey: ['cuentas'] })
          queryClient.invalidateQueries({ queryKey: ['balanceNeto'] })
          queryClient.invalidateQueries({ queryKey: ['resumenMes'] })
          queryClient.invalidateQueries({ queryKey: ['statsPerfil'] })
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cuentas' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['cuentas'] })
          queryClient.invalidateQueries({ queryKey: ['balanceNeto'] })
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'metas' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['metas'] })
          queryClient.invalidateQueries({ queryKey: ['resumenMes'] })
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'deudas' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['deudas'] })
          queryClient.invalidateQueries({ queryKey: ['resumenMes'] })
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'presupuestos' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['progresoPresupuesto'] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [queryClient, supabase])

  return <>{children}</>
}
