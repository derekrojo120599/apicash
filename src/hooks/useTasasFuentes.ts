import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/utils/supabase/client'

export interface TasaFuente {
  fuente: string
  ultima_fecha: string
  tasa: number
}

export function useTasasFuentes() {
  const supabase = createClient()

  return useQuery({
    queryKey: ['tasasFuentes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasas_cambio')
        .select('fuente, fecha, tasa')
        .order('fecha', { ascending: false })

      if (error) throw error

      // Tomar la tasa más reciente por fuente
      const ultimasPorFuente = new Map<string, TasaFuente>()
      data?.forEach((row: any) => {
        if (!ultimasPorFuente.has(row.fuente)) {
          ultimasPorFuente.set(row.fuente, {
            fuente: row.fuente,
            ultima_fecha: row.fecha,
            tasa: row.tasa
          })
        }
      })

      return Array.from(ultimasPorFuente.values())
    }
  })
}
