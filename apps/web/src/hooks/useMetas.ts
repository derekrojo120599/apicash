import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/utils/supabase/client'

export interface Meta {
  id: string
  user_id: string
  nombre: string
  monto_objetivo: number | null
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
    onMutate: async (nuevaMeta) => {
      await queryClient.cancelQueries({ queryKey: ['metas'] })
      const previousMetas = queryClient.getQueryData<Meta[]>(['metas'])

      const optimisticMeta: Meta = {
        id: `temp-${Date.now()}`,
        user_id: 'optimistic',
        monto_actual: 0,
        ...nuevaMeta
      }

      queryClient.setQueryData<Meta[]>(['metas'], old =>
        old ? [optimisticMeta, ...old] : [optimisticMeta]
      )

      return { previousMetas }
    },
    onError: (_err, _vars, context) => {
      if (context?.previousMetas) {
        queryClient.setQueryData(['metas'], context.previousMetas)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['metas'] })
    }
  })
}

export function useAgregarAporte() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ meta_id, cuenta_id, monto, moneda_cuenta, fecha }: { meta_id: string, cuenta_id: string | null, monto: number, moneda_cuenta: string, fecha: Date }) => {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error('No auth user')

      if (!cuenta_id) {
        const { data: metaActual, error: fetchError } = await supabase
          .from('metas')
          .select('monto_actual, moneda')
          .eq('id', meta_id)
          .single()
        
        if (fetchError) throw fetchError

        const nuevoMonto = metaActual.monto_actual + monto

        const { error: updateError } = await supabase
          .from('metas')
          .update({ monto_actual: nuevoMonto })
          .eq('id', meta_id)

        if (updateError) throw updateError
        return true
      }

      const { data: cat } = await supabase
        .from('categorias')
        .select('id')
        .eq('user_id', userData.user.id)
        .eq('tipo', 'ahorro')
        .limit(1)
        .single()
      
      const categoria_id = cat?.id

      const { error } = await supabase
        .rpc('registrar_aporte_meta', {
          p_meta_id: meta_id,
          p_cuenta_id: cuenta_id,
          p_categoria_id: categoria_id || null,
          p_monto: monto,
          p_moneda_original: moneda_cuenta,
          p_fecha: fecha.toISOString()
        })

      if (error) throw error
      return true
    },
    onMutate: async ({ meta_id, monto }) => {
      await queryClient.cancelQueries({ queryKey: ['metas'] })
      const previousMetas = queryClient.getQueryData<Meta[]>(['metas'])

      // Actualizar monto_actual optimistamente (sin conversión de moneda — el server la hace exacta)
      queryClient.setQueryData<Meta[]>(['metas'], old =>
        old?.map(m => m.id === meta_id
          ? { ...m, monto_actual: m.monto_actual + monto }
          : m
        )
      )

      return { previousMetas }
    },
    onError: (_err, _vars, context) => {
      if (context?.previousMetas) {
        queryClient.setQueryData(['metas'], context.previousMetas)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['metas'] })
      queryClient.invalidateQueries({ queryKey: ['cuentas'] })
      queryClient.invalidateQueries({ queryKey: ['transacciones'] })
      queryClient.invalidateQueries({ queryKey: ['balanceNeto'] })
      queryClient.invalidateQueries({ queryKey: ['resumenMes'] })
    }
  })
}

export function useRetirarAhorro() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ meta_id, cuenta_id, monto, moneda_cuenta, fecha, descripcion }: { 
      meta_id: string, 
      cuenta_id: string, 
      monto: number, 
      moneda_cuenta: string, 
      fecha: Date,
      descripcion?: string 
    }) => {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error('No auth user')

      const { data: cat } = await supabase
        .from('categorias')
        .select('id')
        .eq('user_id', userData.user.id)
        .eq('tipo', 'ahorro')
        .limit(1)
        .single()

      const categoria_id = cat?.id

      const { error } = await supabase
        .rpc('retirar_ahorro', {
          p_meta_id: meta_id,
          p_cuenta_id: cuenta_id,
          p_categoria_id: categoria_id || null,
          p_monto: monto,
          p_moneda_original: moneda_cuenta,
          p_fecha: fecha.toISOString(),
          p_descripcion: descripcion || null
        })

      if (error) {
        if (error.message && error.message.includes('Fondos insuficientes')) {
          throw new Error('Fondos insuficientes en la meta')
        }
        throw error
      }
      return true
    },
    onMutate: async ({ meta_id, monto }) => {
      await queryClient.cancelQueries({ queryKey: ['metas'] })
      const previousMetas = queryClient.getQueryData<Meta[]>(['metas'])

      queryClient.setQueryData<Meta[]>(['metas'], old =>
        old?.map(m => m.id === meta_id
          ? { ...m, monto_actual: Math.max(0, m.monto_actual - monto) }
          : m
        )
      )

      return { previousMetas }
    },
    onError: (_err, _vars, context) => {
      if (context?.previousMetas) {
        queryClient.setQueryData(['metas'], context.previousMetas)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['metas'] })
      queryClient.invalidateQueries({ queryKey: ['cuentas'] })
      queryClient.invalidateQueries({ queryKey: ['transacciones'] })
      queryClient.invalidateQueries({ queryKey: ['balanceNeto'] })
      queryClient.invalidateQueries({ queryKey: ['resumenMes'] })
    }
  })
}

export function useEliminarMeta() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('metas')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      return true
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['metas'] })
      const previousMetas = queryClient.getQueryData<Meta[]>(['metas'])

      queryClient.setQueryData<Meta[]>(['metas'], old =>
        old?.filter(m => m.id !== id)
      )

      return { previousMetas }
    },
    onError: (_err, _vars, context) => {
      if (context?.previousMetas) {
        queryClient.setQueryData(['metas'], context.previousMetas)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['metas'] })
    }
  })
}
