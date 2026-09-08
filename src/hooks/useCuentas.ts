import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/utils/supabase/client'

export interface Cuenta {
  id: string
  user_id: string
  nombre: string
  tipo: 'banco' | 'efectivo' | 'exchange' | 'billetera_digital'
  moneda: 'USD' | 'VES'
  saldo_cache: number
  activa: boolean
  created_at: string
}

export function useCuentas() {
  const supabase = createClient()

  return useQuery({
    queryKey: ['cuentas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cuentas')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data as Cuenta[]
    }
  })
}

export function useCrearCuenta() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (nuevaCuenta: Omit<Cuenta, 'id' | 'user_id' | 'saldo_cache' | 'created_at' | 'activa'>) => {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error('No auth user')

      const { data, error } = await supabase
        .from('cuentas')
        .insert([{ ...nuevaCuenta, user_id: userData.user.id }])
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cuentas'] })
    }
  })
}

export function useActualizarCuenta() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...cambios }: Partial<Cuenta> & { id: string }) => {
      const { data, error } = await supabase
        .from('cuentas')
        .update(cambios)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cuentas'] })
    }
  })
}
