import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/utils/supabase/client'

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
    onSuccess: () => {
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
    onSuccess: () => {
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

      const txActivas = transacciones?.filter(tx => !tx.anulada) || []

      // Si hay transacciones activas, no se puede eliminar
      if (txActivas.length > 0) {
        throw new Error('No se puede eliminar: esta categoría tiene movimientos activos asociados.')
      }

      // Si solo hay transacciones anuladas, desvincularlas para poder borrar la categoría
      const { error: updateError } = await supabase
        .from('transacciones')
        .update({ categoria_id: null })
        .eq('categoria_id', id)
      
      if (updateError) throw updateError

      // Eliminar la categoría
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categorias'] })
      queryClient.invalidateQueries({ queryKey: ['transacciones'] })
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
