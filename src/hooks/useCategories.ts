import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/utils/supabase/client'

export interface Category {
  id: string
  user_id: string
  nombre: string
  tipo: 'gasto' | 'ingreso' | 'ahorro' | 'deuda'
  icono?: string
}

export function useCategories() {
  const supabase = createClient()

  return useQuery({
    queryKey: ['categorias'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categorias')
        .select('*')
        .order('nombre')
      
      if (error) throw error
      return data as Category[]
    }
  })
}

export function useCreateCategory() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (newCategory: Omit<Category, 'id' | 'user_id'>) => {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error('Usuario no encontrado')

      const { data, error } = await supabase
        .from('categorias')
        .insert([{ ...newCategory, user_id: userData.user.id }])
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

export function useUpdateCategory() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string, updates: Partial<Omit<Category, 'id' | 'user_id'>> }) => {
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

export function useDeleteCategory() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { data: transactions, error: txError } = await supabase
        .from('transacciones')
        .select('id, anulada')
        .eq('categoria_id', id)
      
      if (txError) throw txError

      const activeTransactions = transactions?.filter(tx => !tx.anulada) || []

      if (activeTransactions.length > 0) {
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categorias'] })
      queryClient.invalidateQueries({ queryKey: ['transacciones'] })
    }
  })
}
