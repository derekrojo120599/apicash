import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/utils/supabase/client'

export interface Meta {
  id: string
  user_id: string
  nombre: string
  monto_objetivo: number
  monto_actual: number
  moneda: string
  fecha_objetivo: string | null
}

export function useMetas() {
  const supabase = createClient()

  return useQuery({
    queryKey: ['metas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('metas')
        .select('*')
        .order('monto_actual', { ascending: false })
      
      if (error) throw error
      return data as Meta[]
    }
  })
}

export function useCrearMeta() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (nuevaMeta: Omit<Meta, 'id' | 'user_id' | 'monto_actual'>) => {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error('No auth user')

      const { data, error } = await supabase
        .from('metas')
        .insert([{ ...nuevaMeta, user_id: userData.user.id }])
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metas'] })
    }
  })
}

export function useAgregarAporte() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ meta_id, cuenta_id, monto, moneda_cuenta, fecha }: { meta_id: string, cuenta_id: string, monto: number, moneda_cuenta: string, fecha: Date }) => {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error('No auth user')

      // Buscamos la categoria de tipo 'ahorro'
      const { data: cat } = await supabase
        .from('categorias')
        .select('id')
        .eq('user_id', userData.user.id)
        .eq('tipo', 'ahorro')
        .limit(1)
        .single()
      
      const categoria_id = cat?.id

      // Usamos el RPC que maneja la transacción atómica
      const { error } = await supabase
        .rpc('registrar_aporte_meta', {
          p_meta_id: meta_id,
          p_cuenta_id: cuenta_id,
          p_categoria_id: categoria_id || null, // Permitimos null si no existe la categoría, aunque la DB prefiere tenerla
          p_monto: monto,
          p_moneda_original: moneda_cuenta,
          p_fecha: fecha.toISOString()
        })

      if (error) throw error
      return true
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metas'] })
      queryClient.invalidateQueries({ queryKey: ['cuentas'] })
      queryClient.invalidateQueries({ queryKey: ['transacciones'] })
      queryClient.invalidateQueries({ queryKey: ['balanceNeto'] })
      queryClient.invalidateQueries({ queryKey: ['resumenMes'] })
    }
  })
}
