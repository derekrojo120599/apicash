import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/utils/supabase/client'

export interface Transaccion {
  id: string
  user_id: string
  cuenta_id: string
  categoria_id: string | null
  tipo: 'ingreso' | 'gasto' | 'transferencia' | 'ajuste'
  monto_original: number
  moneda_original: 'USD' | 'VES'
  tasa_al_momento: number | null
  monto_usd_calculado: number
  descripcion: string
  fecha: string
  anulada: boolean
  
  cuentas?: { nombre: string, moneda: string }
  categorias?: { nombre: string, icono: string, tipo: string }
}

export function useTransacciones(mes: Date) {
  const supabase = createClient()

  // Inicio y fin de mes para el filtro
  const inicioMes = new Date(mes.getFullYear(), mes.getMonth(), 1).toISOString()
  const finMes = new Date(mes.getFullYear(), mes.getMonth() + 1, 0, 23, 59, 59).toISOString()

  return useQuery({
    queryKey: ['transacciones', mes.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transacciones')
        .select(`
          *,
          cuentas(nombre, moneda),
          categorias(nombre, icono, tipo)
        `)
        .gte('fecha', inicioMes)
        .lte('fecha', finMes)
        .order('fecha', { ascending: false })
      
      if (error) throw error
      return data as Transaccion[]
    }
  })
}

export function useUltimasTransacciones(limite: number = 5) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['ultimasTransacciones', limite],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transacciones')
        .select(`
          *,
          cuentas(nombre, moneda),
          categorias(nombre, icono, tipo)
        `)
        .order('fecha', { ascending: false })
        .limit(limite)

      if (error) throw error
      return data as Transaccion[]
    }
  })
}

export function useCrearTransaccion() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (nuevaTx: {
      cuenta_id: string
      categoria_id?: string
      tipo: string
      monto_original: number
      moneda_original: string
      descripcion: string
    }) => {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error('No auth user')

      const { data, error } = await supabase
        .from('transacciones')
        .insert([{ ...nuevaTx, user_id: userData.user.id }])
        .select()
        .single()
      
      if (error) {
        throw new Error(error.message)
      }
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transacciones'] })
      queryClient.invalidateQueries({ queryKey: ['cuentas'] })
      queryClient.invalidateQueries({ queryKey: ['balanceNeto'] })
      queryClient.invalidateQueries({ queryKey: ['resumenMes'] })
    }
  })
}

export function useAnularTransaccion() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('transacciones')
        .update({ anulada: true })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transacciones'] })
      queryClient.invalidateQueries({ queryKey: ['cuentas'] })
      queryClient.invalidateQueries({ queryKey: ['balanceNeto'] })
      queryClient.invalidateQueries({ queryKey: ['resumenMes'] })
    }
  })
}

export function useRestaurarTransaccion() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('transacciones')
        .update({ anulada: false })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transacciones'] })
      queryClient.invalidateQueries({ queryKey: ['cuentas'] })
      queryClient.invalidateQueries({ queryKey: ['balanceNeto'] })
      queryClient.invalidateQueries({ queryKey: ['resumenMes'] })
    }
  })
}
