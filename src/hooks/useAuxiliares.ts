import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/utils/supabase/client'

export function useCategorias() {
  const supabase = createClient()

  return useQuery({
    queryKey: ['categorias'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categorias')
        .select('*')
        .order('nombre')
      
      if (error) throw error
      return data
    }
  })
}

export function useTasaActual() {
  const supabase = createClient()

  return useQuery({
    queryKey: ['tasaActual'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasas_cambio')
        .select('tasa')
        .order('fecha', { ascending: false })
        .limit(1)
        .single()
      
      if (error && error.code !== 'PGRST116') {
        throw error
      }
      
      // PGRST116 = No rows found
      return data?.tasa || null
    }
  })
}
