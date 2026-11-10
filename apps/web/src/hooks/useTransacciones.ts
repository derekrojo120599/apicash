import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/utils/supabase/client'
import type { Cuenta } from './useCuentas'

export interface Transaccion {
  id: string
  user_id: string
  cuenta_id: string
  categoria_id: string | null
  tipo: 'ingreso' | 'gasto' | 'transferencia' | 'ajuste'
  transferencia_direccion?: 'salida' | 'entrada' | null
  transferencia_vinculada_id?: string | null
  cuenta_destino_id?: string | null
  monto_original: number
  moneda_original: 'USD' | 'VES'
  tasa_al_momento: number | null
  monto_usd_calculado: number
  descripcion: string
  fecha: string
  anulada: boolean
  deleted_at?: string | null
  tarjeta_credito_id?: string | null
  compra_credito_id?: string | null
  deuda_id?: string | null
  meta_id?: string | null
  monto_impacto_auxiliar?: number | null
  
  cuentas?: { nombre: string, moneda: string }
  categorias?: { nombre: string, icono: string, tipo: string }
}

export interface CreateTransactionParams {
  cuenta_id: string
  categoria_id?: string
  tipo: 'ingreso' | 'gasto' | 'transferencia' | 'ajuste'
  monto_original: number
  moneda_original: 'USD' | 'VES'
  descripcion: string
  tarjeta_credito_id?: string | null
  compra_credito_id?: string | null
  subtipo_operacion?: string | null
  es_fallida?: boolean
  tasa_cambio?: number | null
  fecha?: string
  comision_override?: number | null
  asumir_comision_comercio?: boolean
}

export interface CreateTransferParams {
  cuenta_origen_id: string
  cuenta_destino_id: string
  monto: number
  moneda: 'USD' | 'VES'
  descripcion?: string
  tasa_cambio?: number | null
  fecha?: string
}

export function useTransacciones(month: Date) {
  const supabase = createClient()

  // Start and end of month filter boundaries
  const startOfMonth = new Date(month.getFullYear(), month.getMonth(), 1).toISOString()
  const endOfMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59).toISOString()

  return useQuery({
    queryKey: ['transacciones', month.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transacciones')
        .select(`
          *,
          cuentas!cuenta_id(nombre, moneda),
          categorias(nombre, icono, tipo)
        `)
        .gte('fecha', startOfMonth)
        .lte('fecha', endOfMonth)
        .order('fecha', { ascending: false })
      
      if (error) throw error
      // Filter out deleted_at in memory if present in schema, without breaking if column is not yet migrated
      return ((data ?? []) as unknown as Transaccion[]).filter(tx => !tx.deleted_at)
    }
  })
}

export function useUltimasTransacciones(limit: number = 5) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['ultimasTransacciones', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transacciones')
        .select(`
          *,
          cuentas!cuenta_id(nombre, moneda),
          categorias(nombre, icono, tipo)
        `)
        .order('fecha', { ascending: false })
        .limit(limit)

      if (error) throw error
      return ((data ?? []) as unknown as Transaccion[]).filter(tx => !tx.deleted_at)
    }
  })
}

export function useCrearTransaccion() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (newTx: CreateTransactionParams) => {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error('No auth user')

      // Unified RPC logic for expense with commission or forced failure
      if (newTx.tipo === 'gasto' && newTx.subtipo_operacion) {
        const { data, error } = await supabase.rpc('registrar_operacion_con_comision', {
          p_cuenta_id: newTx.cuenta_id,
          p_categoria_principal_id: newTx.categoria_id || null,
          p_tipo: newTx.tipo,
          p_monto: newTx.monto_original,
          p_moneda: newTx.moneda_original,
          p_subtipo_operacion: newTx.subtipo_operacion || null,
          p_tasa_cambio: newTx.tasa_cambio || null,
          p_fecha: newTx.fecha || new Date().toISOString(),
          p_descripcion: newTx.descripcion || '',
          p_override_comision: newTx.comision_override || null,
          p_es_fallida: newTx.es_fallida || false,
          p_asumir_comision_comercio: newTx.asumir_comision_comercio || false
        })
        
        if (error) {
          throw new Error(error.message)
        }
        return data as Transaccion
      }

      // Standard insert for transfers, expenses without commission, or income
      const calculatedUsd = newTx.moneda_original === 'USD'
        ? newTx.monto_original
        : (newTx.tasa_cambio && newTx.tasa_cambio > 0 ? Number((newTx.monto_original / newTx.tasa_cambio).toFixed(2)) : 0)

      const insertPayload: {
        cuenta_id: string
        categoria_id?: string
        tipo: 'ingreso' | 'gasto' | 'transferencia' | 'ajuste'
        monto_original: number
        moneda_original: 'USD' | 'VES'
        monto_usd_calculado: number
        descripcion: string
        user_id: string
        subtipo_operacion?: string
        tasa_al_momento?: number
      } = {
        cuenta_id: newTx.cuenta_id,
        categoria_id: newTx.categoria_id,
        tipo: newTx.tipo,
        monto_original: newTx.monto_original,
        moneda_original: newTx.moneda_original,
        monto_usd_calculado: calculatedUsd,
        descripcion: newTx.descripcion,
        user_id: userData.user.id
      };

      if (newTx.subtipo_operacion) insertPayload.subtipo_operacion = newTx.subtipo_operacion;
      if (newTx.tasa_cambio) insertPayload.tasa_al_momento = newTx.tasa_cambio;

      const { data, error } = await supabase
        .from('transacciones')
        .insert([insertPayload])
        .select()
        .single()
      
      if (error) {
        throw new Error(error.message)
      }
      return data as Transaccion
    },
    onMutate: async (newTx: CreateTransactionParams) => {
      // 1. Cancel outgoing refetches to prevent race conditions
      await queryClient.cancelQueries({ queryKey: ['transacciones'] })
      await queryClient.cancelQueries({ queryKey: ['cuentas'] })
      await queryClient.cancelQueries({ queryKey: ['ultimasTransacciones'] })

      // 2. Snapshot previous state for rollback
      const previousCuentas = queryClient.getQueryData<Cuenta[]>(['cuentas'])

      // Account info for optimistic UI
      const accountCache = previousCuentas?.find(c => c.id === newTx.cuenta_id)
      
      // Calculate optimistic USD amount respecting exchange rate rules
      const calculatedUsd = newTx.moneda_original === 'USD'
        ? newTx.monto_original
        : (newTx.tasa_cambio && newTx.tasa_cambio > 0 ? Number((newTx.monto_original / newTx.tasa_cambio).toFixed(2)) : 0)

      // 3. Create optimistic transaction
      const optimisticTx: Transaccion = {
        id: `temp-${Date.now()}`,
        user_id: 'optimistic',
        cuenta_id: newTx.cuenta_id,
        categoria_id: newTx.categoria_id || null,
        tipo: newTx.tipo,
        monto_original: newTx.monto_original,
        moneda_original: newTx.moneda_original,
        tasa_al_momento: newTx.moneda_original === 'VES' ? (newTx.tasa_cambio ?? null) : null,
        monto_usd_calculado: calculatedUsd,
        descripcion: newTx.descripcion || 'Guardando...',
        fecha: new Date().toISOString(),
        anulada: false,
        cuentas: { 
          nombre: accountCache?.nombre || 'Cuenta', 
          moneda: accountCache?.moneda || newTx.moneda_original 
        },
        categorias: { nombre: '...', icono: 'clock', tipo: newTx.tipo }
      }

      // 4. Optimistically update transactions list
      queryClient.setQueriesData<Transaccion[]>({ queryKey: ['transacciones'] }, (old) => {
        if (!Array.isArray(old)) return old
        return [optimisticTx, ...old].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
      })

      // 5. Optimistically update recent transactions widget
      queryClient.setQueriesData<Transaccion[]>({ queryKey: ['ultimasTransacciones'] }, (old) => {
        if (!Array.isArray(old)) return old
        return [optimisticTx, ...old].slice(0, 5)
      })

      // 6. Optimistically update account balance when currencies match
      if (accountCache && accountCache.moneda === newTx.moneda_original) {
         queryClient.setQueryData<Cuenta[]>(['cuentas'], (old) => {
            if (!Array.isArray(old)) return old
            return old.map((c) => {
               if (c.id === newTx.cuenta_id) {
                  const factor = newTx.tipo === 'gasto' ? -1 : (newTx.tipo === 'ingreso' ? 1 : 0)
                  return { ...c, saldo_cache: c.saldo_cache + (newTx.monto_original * factor) }
               }
               return c
            })
         })
      }

      return { previousCuentas }
    },
    onError: (_err, _newTx, context) => {
      // Rollback on rejection
      queryClient.invalidateQueries({ queryKey: ['transacciones'] })
      queryClient.invalidateQueries({ queryKey: ['ultimasTransacciones'] })
      if (context?.previousCuentas) {
        queryClient.setQueryData(['cuentas'], context.previousCuentas)
      }
    },
    onSettled: () => {
      // Resynchronize with database for exact calculated balances and rates
      queryClient.invalidateQueries({ queryKey: ['transacciones'] })
      queryClient.invalidateQueries({ queryKey: ['cuentas'] })
      queryClient.invalidateQueries({ queryKey: ['balanceNeto'] })
      queryClient.invalidateQueries({ queryKey: ['resumenMes'] })
      queryClient.invalidateQueries({ queryKey: ['ultimasTransacciones'] })
    }
  })
}

export function useCrearTransferencia() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      cuenta_origen_id,
      cuenta_destino_id,
      monto,
      moneda,
      descripcion,
      tasa_cambio,
      fecha
    }: CreateTransferParams) => {
      const { data, error } = await supabase.rpc('registrar_transferencia', {
        p_cuenta_origen_id: cuenta_origen_id,
        p_cuenta_destino_id: cuenta_destino_id,
        p_monto: monto,
        p_moneda: moneda,
        p_descripcion: descripcion || null,
        p_fecha: fecha || new Date().toISOString(),
        p_tasa_cambio: tasa_cambio || null
      })

      if (error) {
        throw new Error(error.message)
      }
      return data
    },
    onMutate: async ({ cuenta_origen_id, cuenta_destino_id, monto, moneda, descripcion, tasa_cambio }: CreateTransferParams) => {
      await queryClient.cancelQueries({ queryKey: ['transacciones'] })
      await queryClient.cancelQueries({ queryKey: ['cuentas'] })
      await queryClient.cancelQueries({ queryKey: ['ultimasTransacciones'] })

      const previousCuentas = queryClient.getQueryData<Cuenta[]>(['cuentas'])
      const sourceAccount = previousCuentas?.find(c => c.id === cuenta_origen_id)
      const targetAccount = previousCuentas?.find(c => c.id === cuenta_destino_id)

      const outgoingId = `temp-salida-${Date.now()}`
      const incomingId = `temp-entrada-${Date.now()}`

      const calculatedUsd = moneda === 'USD'
        ? monto
        : (tasa_cambio && tasa_cambio > 0 ? Number((monto / tasa_cambio).toFixed(2)) : 0)

      const outgoingTx: Transaccion = {
        id: outgoingId,
        user_id: 'optimistic',
        cuenta_id: cuenta_origen_id,
        categoria_id: null,
        cuenta_destino_id,
        transferencia_vinculada_id: incomingId,
        tipo: 'transferencia',
        transferencia_direccion: 'salida',
        monto_original: monto,
        moneda_original: moneda,
        tasa_al_momento: moneda === 'VES' ? (tasa_cambio ?? null) : null,
        monto_usd_calculado: calculatedUsd,
        descripcion: descripcion || `Transferencia a ${targetAccount?.nombre || 'Cuenta destino'}`,
        fecha: new Date().toISOString(),
        anulada: false,
        cuentas: { nombre: sourceAccount?.nombre || 'Origen', moneda },
        categorias: undefined
      }

      const incomingTx: Transaccion = {
        id: incomingId,
        user_id: 'optimistic',
        cuenta_id: cuenta_destino_id,
        categoria_id: null,
        cuenta_destino_id: cuenta_origen_id,
        transferencia_vinculada_id: outgoingId,
        tipo: 'transferencia',
        transferencia_direccion: 'entrada',
        monto_original: monto,
        moneda_original: moneda,
        tasa_al_momento: moneda === 'VES' ? (tasa_cambio ?? null) : null,
        monto_usd_calculado: calculatedUsd,
        descripcion: descripcion || `Transferencia desde ${sourceAccount?.nombre || 'Cuenta origen'}`,
        fecha: new Date().toISOString(),
        anulada: false,
        cuentas: { nombre: targetAccount?.nombre || 'Destino', moneda },
        categorias: undefined
      }

      queryClient.setQueriesData<Transaccion[]>({ queryKey: ['transacciones'] }, (old) => {
        if (!Array.isArray(old)) return old
        return [outgoingTx, incomingTx, ...old].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
      })

      queryClient.setQueriesData<Transaccion[]>({ queryKey: ['ultimasTransacciones'] }, (old) => {
        if (!Array.isArray(old)) return old
        return [outgoingTx, incomingTx, ...old].slice(0, 5)
      })

      if (previousCuentas) {
        queryClient.setQueryData<Cuenta[]>(['cuentas'], (old) => {
          if (!Array.isArray(old)) return old
          return old.map((c) => {
            if (c.id === cuenta_origen_id) {
              return { ...c, saldo_cache: c.saldo_cache - monto }
            }
            if (c.id === cuenta_destino_id) {
              return { ...c, saldo_cache: c.saldo_cache + monto }
            }
            return c
          })
        })
      }

      return { previousCuentas }
    },
    onError: (_err, _vars, context) => {
      queryClient.invalidateQueries({ queryKey: ['transacciones'] })
      queryClient.invalidateQueries({ queryKey: ['ultimasTransacciones'] })
      if (context?.previousCuentas) {
        queryClient.setQueryData(['cuentas'], context.previousCuentas)
      }
    },
    onSettled: () => {
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
      return data as Transaccion
    },
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ['transacciones'] })
      await queryClient.cancelQueries({ queryKey: ['ultimasTransacciones'] })
      await queryClient.cancelQueries({ queryKey: ['cuentas'] })

      // Snapshot for rollback
      const previousTransacciones = queryClient.getQueriesData<Transaccion[]>({ queryKey: ['transacciones'] })
      const previousUltimas = queryClient.getQueriesData<Transaccion[]>({ queryKey: ['ultimasTransacciones'] })
      const previousCuentas = queryClient.getQueryData<Cuenta[]>(['cuentas'])

      // Find transaction across cached queries to calculate balance reversal
      let voidedTx: Transaccion | null = null
      for (const [, data] of previousTransacciones) {
        if (Array.isArray(data)) {
          const found = data.find((t) => t.id === id)
          if (found) {
            voidedTx = found
            break
          }
        }
      }

      // Mark transaction as voided in cached lists
      const patchVoided = (old: Transaccion[] | undefined) => {
        if (!Array.isArray(old)) return old
        return old.map((t) => t.id === id ? { ...t, anulada: true } : t)
      }
      queryClient.setQueriesData<Transaccion[]>({ queryKey: ['transacciones'] }, patchVoided)
      queryClient.setQueriesData<Transaccion[]>({ queryKey: ['ultimasTransacciones'] }, patchVoided)

      // Revert account balance impact
      if (voidedTx && previousCuentas) {
        queryClient.setQueryData<Cuenta[]>(['cuentas'], previousCuentas.map((c) => {
          if (c.id !== voidedTx?.cuenta_id) return c
          let factor = 0
          if (voidedTx.tipo === 'gasto') factor = 1
          else if (voidedTx.tipo === 'ingreso') factor = -1
          else if (voidedTx.tipo === 'transferencia') {
            factor = voidedTx.transferencia_direccion === 'salida' ? 1 : -1
          }
          return { ...c, saldo_cache: c.saldo_cache + (voidedTx.monto_original * factor) }
        }))
      }

      return { previousTransacciones, previousUltimas, previousCuentas }
    },
    onError: (_err, _id, context) => {
      if (context?.previousTransacciones) {
        for (const [queryKey, data] of context.previousTransacciones) {
          queryClient.setQueryData(queryKey, data)
        }
      }
      if (context?.previousUltimas) {
        for (const [queryKey, data] of context.previousUltimas) {
          queryClient.setQueryData(queryKey, data)
        }
      }
      if (context?.previousCuentas) {
        queryClient.setQueryData(['cuentas'], context.previousCuentas)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['transacciones'] })
      queryClient.invalidateQueries({ queryKey: ['ultimasTransacciones'] })
      queryClient.invalidateQueries({ queryKey: ['cuentas'] })
      queryClient.invalidateQueries({ queryKey: ['deudas'] })
      queryClient.invalidateQueries({ queryKey: ['metas'] })
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
      return data as Transaccion
    },
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ['transacciones'] })
      await queryClient.cancelQueries({ queryKey: ['ultimasTransacciones'] })
      await queryClient.cancelQueries({ queryKey: ['cuentas'] })

      const previousTransacciones = queryClient.getQueriesData<Transaccion[]>({ queryKey: ['transacciones'] })
      const previousUltimas = queryClient.getQueriesData<Transaccion[]>({ queryKey: ['ultimasTransacciones'] })
      const previousCuentas = queryClient.getQueryData<Cuenta[]>(['cuentas'])

      let restoredTx: Transaccion | null = null
      for (const [, data] of previousTransacciones) {
        if (Array.isArray(data)) {
          const found = data.find((t) => t.id === id)
          if (found) {
            restoredTx = found
            break
          }
        }
      }

      // Mark transaction as active in cached lists
      const patchActive = (old: Transaccion[] | undefined) => {
        if (!Array.isArray(old)) return old
        return old.map((t) => t.id === id ? { ...t, anulada: false } : t)
      }
      queryClient.setQueriesData<Transaccion[]>({ queryKey: ['transacciones'] }, patchActive)
      queryClient.setQueriesData<Transaccion[]>({ queryKey: ['ultimasTransacciones'] }, patchActive)

      // Re-apply account balance impact
      if (restoredTx && previousCuentas) {
        queryClient.setQueryData<Cuenta[]>(['cuentas'], previousCuentas.map((c) => {
          if (c.id !== restoredTx?.cuenta_id) return c
          let factor = 0
          if (restoredTx.tipo === 'gasto') factor = -1
          else if (restoredTx.tipo === 'ingreso') factor = 1
          else if (restoredTx.tipo === 'transferencia') {
            factor = restoredTx.transferencia_direccion === 'salida' ? -1 : 1
          }
          return { ...c, saldo_cache: c.saldo_cache + (restoredTx.monto_original * factor) }
        }))
      }

      return { previousTransacciones, previousUltimas, previousCuentas }
    },
    onError: (_err, _id, context) => {
      if (context?.previousTransacciones) {
        for (const [queryKey, data] of context.previousTransacciones) {
          queryClient.setQueryData(queryKey, data)
        }
      }
      if (context?.previousUltimas) {
        for (const [queryKey, data] of context.previousUltimas) {
          queryClient.setQueryData(queryKey, data)
        }
      }
      if (context?.previousCuentas) {
        queryClient.setQueryData(['cuentas'], context.previousCuentas)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['transacciones'] })
      queryClient.invalidateQueries({ queryKey: ['ultimasTransacciones'] })
      queryClient.invalidateQueries({ queryKey: ['cuentas'] })
      queryClient.invalidateQueries({ queryKey: ['deudas'] })
      queryClient.invalidateQueries({ queryKey: ['metas'] })
      queryClient.invalidateQueries({ queryKey: ['balanceNeto'] })
      queryClient.invalidateQueries({ queryKey: ['resumenMes'] })
    }
  })
}

export function useMarcarOperacionFallida() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc('marcar_operacion_como_fallida', {
        p_transaccion_id: id
      })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transacciones'] })
      queryClient.invalidateQueries({ queryKey: ['ultimasTransacciones'] })
      queryClient.invalidateQueries({ queryKey: ['cuentas'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['presupuestos'] })
    }
  })
}

export function usePapeleraTransacciones() {
  const supabase = createClient()

  return useQuery({
    queryKey: ['papeleraTransacciones'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transacciones')
        .select(`
          *,
          cuentas!cuenta_id(nombre, moneda),
          categorias(nombre, icono, tipo)
        `)
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false })

      if (error) throw error
      return (data ?? []) as unknown as Transaccion[]
    }
  })
}

export function useMoverTransaccionPapelera() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.rpc('soft_delete_transaccion', {
        p_transaccion_id: id
      })
      if (error) throw new Error(error.message)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transacciones'] })
      queryClient.invalidateQueries({ queryKey: ['ultimasTransacciones'] })
      queryClient.invalidateQueries({ queryKey: ['papeleraTransacciones'] })
      queryClient.invalidateQueries({ queryKey: ['cuentas'] })
      queryClient.invalidateQueries({ queryKey: ['tarjetasCredito'] })
      queryClient.invalidateQueries({ queryKey: ['balanceNeto'] })
      queryClient.invalidateQueries({ queryKey: ['resumenMes'] })
      queryClient.invalidateQueries({ queryKey: ['presupuestos'] })
    }
  })
}

export function useRestaurarTransaccionPapelera() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.rpc('restaurar_transaccion', {
        p_transaccion_id: id
      })
      if (error) throw new Error(error.message)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transacciones'] })
      queryClient.invalidateQueries({ queryKey: ['ultimasTransacciones'] })
      queryClient.invalidateQueries({ queryKey: ['papeleraTransacciones'] })
      queryClient.invalidateQueries({ queryKey: ['cuentas'] })
      queryClient.invalidateQueries({ queryKey: ['tarjetasCredito'] })
      queryClient.invalidateQueries({ queryKey: ['balanceNeto'] })
      queryClient.invalidateQueries({ queryKey: ['resumenMes'] })
      queryClient.invalidateQueries({ queryKey: ['presupuestos'] })
    }
  })
}

export function useEliminarTransaccionDefinitiva() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.rpc('purgar_transaccion_definitiva', {
        p_transaccion_id: id
      })
      if (error) throw new Error(error.message)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['papeleraTransacciones'] })
      queryClient.invalidateQueries({ queryKey: ['transacciones'] })
    }
  })
}
