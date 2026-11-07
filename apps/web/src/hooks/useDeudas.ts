import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/utils/supabase/client'

export interface Deuda {
  id: string
  user_id: string
  nombre: string
  monto_total: number
  moneda: string
  saldo_pendiente: number
  fecha_limite: string | null
}

export function useDeudas() {
  const supabase = createClient()

  return useQuery({
    queryKey: ['deudas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deudas')
        .select('*')
        .order('saldo_pendiente', { ascending: false })
      
      if (error) throw error
      return data as Deuda[]
    }
  })
}

export function useCrearDeuda() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (nuevaDeuda: Omit<Deuda, 'id' | 'user_id' | 'saldo_pendiente'>) => {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error('No auth user')

      const { data, error } = await supabase
        .from('deudas')
        .insert([{ ...nuevaDeuda, user_id: userData.user.id, saldo_pendiente: nuevaDeuda.monto_total }])
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onMutate: async (nuevaDeuda) => {
      await queryClient.cancelQueries({ queryKey: ['deudas'] })
      const previousDeudas = queryClient.getQueryData<Deuda[]>(['deudas'])

      const optimisticDeuda: Deuda = {
        id: `temp-${Date.now()}`,
        user_id: 'optimistic',
        saldo_pendiente: nuevaDeuda.monto_total,
        ...nuevaDeuda
      }

      queryClient.setQueryData<Deuda[]>(['deudas'], old =>
        old ? [optimisticDeuda, ...old] : [optimisticDeuda]
      )

      return { previousDeudas }
    },
    onError: (_err, _vars, context) => {
      if (context?.previousDeudas) {
        queryClient.setQueryData(['deudas'], context.previousDeudas)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['deudas'] })
    }
  })
}

export function useRegistrarPagoDeuda() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ deuda_id, cuenta_id, monto, moneda_cuenta, fecha }: { deuda_id: string, cuenta_id: string, monto: number, moneda_cuenta: string, fecha: Date }) => {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error('No auth user')

      const { data: cat } = await supabase
        .from('categorias')
        .select('id')
        .eq('user_id', userData.user.id)
        .eq('tipo', 'deuda')
        .limit(1)
        .single()
      
      const categoria_id = cat?.id

      const { error } = await supabase
        .rpc('registrar_pago_deuda', {
          p_deuda_id: deuda_id,
          p_cuenta_id: cuenta_id,
          p_categoria_id: categoria_id || null,
          p_monto: monto,
          p_moneda_original: moneda_cuenta,
          p_fecha: fecha.toISOString()
        })

      if (error) throw error
      return true
    },
    onMutate: async ({ deuda_id, monto }) => {
      await queryClient.cancelQueries({ queryKey: ['deudas'] })
      const previousDeudas = queryClient.getQueryData<Deuda[]>(['deudas'])

      // Reducir saldo_pendiente optimistamente
      queryClient.setQueryData<Deuda[]>(['deudas'], old =>
        old?.map(d => d.id === deuda_id
          ? { ...d, saldo_pendiente: Math.max(0, d.saldo_pendiente - monto) }
          : d
        )
      )

      return { previousDeudas }
    },
    onError: (_err, _vars, context) => {
      if (context?.previousDeudas) {
        queryClient.setQueryData(['deudas'], context.previousDeudas)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['deudas'] })
      queryClient.invalidateQueries({ queryKey: ['cuentas'] })
      queryClient.invalidateQueries({ queryKey: ['transacciones'] })
      queryClient.invalidateQueries({ queryKey: ['balanceNeto'] })
      queryClient.invalidateQueries({ queryKey: ['resumenMes'] })
    }
  })
}

export function useEliminarDeuda() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('deudas')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      return true
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['deudas'] })
      const previousDeudas = queryClient.getQueryData<Deuda[]>(['deudas'])

      queryClient.setQueryData<Deuda[]>(['deudas'], old =>
        old?.filter(d => d.id !== id)
      )

      return { previousDeudas }
    },
    onError: (_err, _vars, context) => {
      if (context?.previousDeudas) {
        queryClient.setQueryData(['deudas'], context.previousDeudas)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['deudas'] })
    }
  })
}
