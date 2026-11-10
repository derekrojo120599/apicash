import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/utils/supabase/client'
import type { TarjetaCreditoBase, Moneda } from '@apicash/shared'

export type TarjetaCredito = TarjetaCreditoBase

export interface CreateTarjetaCreditoParams {
  nombre: string
  banco?: string | null
  moneda?: Moneda
  limite_credito: number
  dia_corte: number
  dia_pago: number
  pago_minimo_pct?: number
  interes_mensual_pct?: number
}

export function useTarjetasCredito() {
  const supabase = createClient()

  return useQuery({
    queryKey: ['tarjetasCredito'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tarjetas_credito')
        .select('*')
        .eq('activa', true)
        .order('created_at', { ascending: false })

      if (error) throw error
      return (data ?? []) as TarjetaCredito[]
    }
  })
}

export function useCrearTarjetaCredito() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: CreateTarjetaCreditoParams) => {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error('No auth user')

      const { data, error } = await supabase
        .from('tarjetas_credito')
        .insert({
          user_id: userData.user.id,
          nombre: params.nombre,
          banco: params.banco || null,
          moneda: params.moneda || 'USD',
          limite_credito: params.limite_credito,
          dia_corte: params.dia_corte,
          dia_pago: params.dia_pago,
          pago_minimo_pct: params.pago_minimo_pct ?? 5.0,
          interes_mensual_pct: params.interes_mensual_pct ?? 0.0,
          activa: true
        })
        .select()
        .single()

      if (error) throw error
      return data as TarjetaCredito
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tarjetasCredito'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    }
  })
}
