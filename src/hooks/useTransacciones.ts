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
      subtipo_operacion?: string | null
      es_fallida?: boolean
      tasa_cambio?: number | null
      fecha?: string
      comision_override?: number | null
    }) => {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error('No auth user')

      const { data, error } = await supabase.rpc('registrar_operacion_con_comision', {
        p_cuenta_id: nuevaTx.cuenta_id,
        p_categoria_principal_id: nuevaTx.categoria_id || null,
        p_tipo: nuevaTx.tipo,
        p_monto: nuevaTx.monto_original,
        p_moneda: nuevaTx.moneda_original,
        p_subtipo_operacion: nuevaTx.subtipo_operacion || null,
        p_tasa_cambio: nuevaTx.tasa_cambio || null,
        p_fecha: nuevaTx.fecha || new Date().toISOString(),
        p_descripcion: nuevaTx.descripcion || '',
        p_override_comision: nuevaTx.comision_override || null,
        p_es_fallida: nuevaTx.es_fallida || false
      })
      
      if (error) {
        throw new Error(error.message)
      }
      return data
    },
    onMutate: async (nuevaTx) => {
      // 1. Cancelar refetches en vuelo para evitar condiciones de carrera
      await queryClient.cancelQueries({ queryKey: ['transacciones'] })
      await queryClient.cancelQueries({ queryKey: ['cuentas'] })
      await queryClient.cancelQueries({ queryKey: ['ultimasTransacciones'] })

      // 2. Snapshot del estado previo (por si hay rollback)
      const previousCuentas = queryClient.getQueryData(['cuentas']) as any[]

      // Obtener info de la cuenta para la UI
      const cuentaCache = previousCuentas?.find(c => c.id === nuevaTx.cuenta_id)
      
      // 3. Crear transacción "fake" optimista
      const optimisticTx = {
        id: `temp-${Date.now()}`,
        user_id: 'optimistic',
        cuenta_id: nuevaTx.cuenta_id,
        categoria_id: nuevaTx.categoria_id || null,
        tipo: nuevaTx.tipo,
        monto_original: nuevaTx.monto_original,
        moneda_original: nuevaTx.moneda_original,
        tasa_al_momento: nuevaTx.tasa_cambio || null,
        monto_usd_calculado: nuevaTx.moneda_original === 'USD' ? nuevaTx.monto_original : 0, // Server computa exacto luego
        descripcion: nuevaTx.descripcion || 'Guardando...',
        fecha: nuevaTx.fecha || new Date().toISOString(),
        anulada: false,
        cuentas: { 
          nombre: cuentaCache?.nombre || 'Cuenta', 
          moneda: cuentaCache?.moneda || nuevaTx.moneda_original 
        },
        categorias: { nombre: '...', icono: 'clock', tipo: nuevaTx.tipo }
      }

      // 4. Inyectar en la lista principal de transacciones (setQueriesData atrapa todas las fechas cacheadas)
      queryClient.setQueriesData({ queryKey: ['transacciones'] }, (old: any) => {
        if (!Array.isArray(old)) return old
        return [optimisticTx, ...old].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
      })

      // 5. Inyectar en el widget de últimas transacciones
      queryClient.setQueriesData({ queryKey: ['ultimasTransacciones'] }, (old: any) => {
        if (!Array.isArray(old)) return old
        return [optimisticTx, ...old].slice(0, 5) // Mantiene maximo 5
      })

      // 6. Actualizar saldo cuenta optimista (solo si coinciden las monedas para no romper la matemática visual)
      if (cuentaCache && cuentaCache.moneda === nuevaTx.moneda_original && !nuevaTx.es_fallida) {
         queryClient.setQueriesData({ queryKey: ['cuentas'] }, (old: any) => {
            if (!Array.isArray(old)) return old
            return old.map((c: any) => {
               if (c.id === nuevaTx.cuenta_id) {
                  const factor = nuevaTx.tipo === 'gasto' ? -1 : (nuevaTx.tipo === 'ingreso' ? 1 : 0)
                  return { ...c, saldo_cache: c.saldo_cache + (nuevaTx.monto_original * factor) }
               }
               return c
            })
         })
      }

      return { previousCuentas }
    },
    onError: (err, nuevaTx, context) => {
      // Rollback en caso de que el backend rechace (ej: sin fondos, error de red)
      queryClient.invalidateQueries({ queryKey: ['transacciones'] })
      queryClient.invalidateQueries({ queryKey: ['ultimasTransacciones'] })
      if (context?.previousCuentas) {
        queryClient.setQueryData(['cuentas'], context.previousCuentas)
      }
    },
    onSettled: () => {
      // Re-sincronizar con la DB al terminar para tener el cálculo EXACTO (conversiones, comisiones, etc)
      queryClient.invalidateQueries({ queryKey: ['transacciones'] })
      queryClient.invalidateQueries({ queryKey: ['cuentas'] })
      queryClient.invalidateQueries({ queryKey: ['balanceNeto'] })
      queryClient.invalidateQueries({ queryKey: ['resumenMes'] })
      queryClient.invalidateQueries({ queryKey: ['ultimasTransacciones'] })
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
