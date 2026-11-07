import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/utils/supabase/client'
import { usePerfil } from './usePerfil'

export interface Categoria {
  id: string
  user_id: string
  nombre: string
  tipo: 'gasto' | 'ingreso' | 'ahorro' | 'deuda'
  icono?: string
}

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
      return data as Categoria[]
    }
  })
}

export function useCrearCategoria() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (nuevaCategoria: Omit<Categoria, 'id' | 'user_id'>) => {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error('No user found')

      const { data, error } = await supabase
        .from('categorias')
        .insert([{ ...nuevaCategoria, user_id: userData.user.id }])
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onMutate: async (nuevaCategoria) => {
      await queryClient.cancelQueries({ queryKey: ['categorias'] })
      const previousCategorias = queryClient.getQueryData<Categoria[]>(['categorias'])

      const optimistic: Categoria = {
        id: `temp-${Date.now()}`,
        user_id: 'optimistic',
        ...nuevaCategoria
      }

      queryClient.setQueryData<Categoria[]>(['categorias'], old =>
        old ? [...old, optimistic].sort((a, b) => a.nombre.localeCompare(b.nombre)) : [optimistic]
      )

      return { previousCategorias }
    },
    onError: (_err, _vars, context) => {
      if (context?.previousCategorias) {
        queryClient.setQueryData(['categorias'], context.previousCategorias)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['categorias'] })
    }
  })
}

export function useEditarCategoria() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string, updates: Partial<Omit<Categoria, 'id' | 'user_id'>> }) => {
      const { data, error } = await supabase
        .from('categorias')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: ['categorias'] })
      const previousCategorias = queryClient.getQueryData<Categoria[]>(['categorias'])

      queryClient.setQueryData<Categoria[]>(['categorias'], old =>
        old?.map(c => c.id === id ? { ...c, ...updates } : c)
          .sort((a, b) => a.nombre.localeCompare(b.nombre))
      )

      return { previousCategorias }
    },
    onError: (_err, _vars, context) => {
      if (context?.previousCategorias) {
        queryClient.setQueryData(['categorias'], context.previousCategorias)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['categorias'] })
    }
  })
}

export function useEliminarCategoria() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      // Buscar transacciones asociadas a esta categoría
      const { data: transacciones, error: txError } = await supabase
        .from('transacciones')
        .select('id, anulada')
        .eq('categoria_id', id)
      
      if (txError) throw txError

      const txActivas = transacciones?.filter((tx: any) => !tx.anulada) || []

      if (txActivas.length > 0) {
        throw new Error('No se puede eliminar: esta categoría tiene movimientos activos asociados.')
      }

      const { error: updateError } = await supabase
        .from('transacciones')
        .update({ categoria_id: null })
        .eq('categoria_id', id)
      
      if (updateError) throw updateError

      const { error } = await supabase
        .from('categorias')
        .delete()
        .eq('id', id)
      
      if (error) {
        if (error.code === '23503') {
          throw new Error('No se puede eliminar: esta categoría tiene movimientos o presupuestos asociados.')
        }
        throw error
      }
      return true
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['categorias'] })
      const previousCategorias = queryClient.getQueryData<Categoria[]>(['categorias'])

      // Nota: no eliminamos optimistamente porque la mutationFn hace validaciones
      // previas (transacciones activas) que pueden fallar. El rollback sería confuso.
      // Solo invalidamos en onSettled para mantener consistencia.
      return { previousCategorias }
    },
    onError: (_err, _vars, context) => {
      if (context?.previousCategorias) {
        queryClient.setQueryData(['categorias'], context.previousCategorias)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['categorias'] })
      queryClient.invalidateQueries({ queryKey: ['transacciones'] })
    }
  })
}

export function useTasaActual() {
  const supabase = createClient()
  const { data: perfil } = usePerfil()

  return useQuery({
    queryKey: ['tasaActual', perfil?.fuente_tasa_preferida],
    queryFn: async () => {
      let query = supabase
        .from('tasas_cambio')
        .select('tasa')
        .order('fecha', { ascending: false })
        .limit(1)

      if (perfil?.fuente_tasa_preferida) {
        query = query.eq('fuente', perfil.fuente_tasa_preferida)
      }

      const { data, error } = await query.single()
      
      if (error && error.code === 'PGRST116' && perfil?.fuente_tasa_preferida) {
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('tasas_cambio')
          .select('tasa')
          .order('fecha', { ascending: false })
          .limit(1)
          .single()
          
        if (fallbackError && fallbackError.code !== 'PGRST116') throw fallbackError
        return fallbackData?.tasa || null
      }

      if (error && error.code !== 'PGRST116') {
        throw error
      }
      
      return data?.tasa || null
    },
    enabled: perfil !== undefined
  })
}
