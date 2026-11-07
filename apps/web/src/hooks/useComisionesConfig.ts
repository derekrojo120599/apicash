import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/utils/supabase/client'

export interface ComisionConfig {
  id: string
  user_id: string
  subtipo_operacion: string
  porcentaje: number
  minimo_ves: number
  maximo_ves: number | null
  es_tope: boolean
  permite_override: boolean
  aplica_a_fallidas: boolean
  asume_usuario: boolean
  vigente_desde: string
  vigente_hasta: string | null
}

export function useComisionesConfig() {
  const supabase = createClient()

  return useQuery({
    queryKey: ['comisiones_config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('comisiones_config')
        .select('*')
        // Filtrar solo los que están vigentes
        .or('vigente_hasta.is.null,vigente_hasta.gte.' + new Date().toISOString().split('T')[0])

      if (error) {
        console.error('Error fetching comisiones_config:', error)
        throw error
      }

      return data as ComisionConfig[]
    },
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
  })
}
