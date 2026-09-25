import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/utils/supabase/client'
import type { Cuenta } from './useCuentas'
import type { Transaccion } from './useTransacciones'

export interface BalanceNeto {
  usd_fijo: number
  ves_total: number
  ves_en_usd: number
  balance_neto: number
  tasa_usada: number
  tasa_fecha: string
}

export function useBalanceNeto() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useQuery({
    queryKey: ['balanceNeto'],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error('No user found')

      const { data, error } = await supabase
        .rpc('obtener_balance_neto', { p_user_id: userData.user.id })
        
      if (error) throw error
      
      const result = (data as any[])?.[0]
      return {
        usd_fijo: Number(result?.usd_fijo || 0),
        ves_total: Number(result?.ves_total || 0),
        ves_en_usd: Number(result?.ves_en_usd || 0),
        balance_neto: Number(result?.balance_neto || 0),
        tasa_usada: Number(result?.tasa_usada || 0),
        tasa_fecha: result?.tasa_fecha || new Date().toISOString()
      } as BalanceNeto
    },
    // Mientras el refetch de fondo ocurre, derivar una estimación parcial desde
    // el cache de cuentas (ya optimista) para evitar mostrar datos obsoletos
    placeholderData: () => {
      const cuentas = queryClient.getQueryData<Cuenta[]>(['cuentas'])
      if (!cuentas?.length) return undefined

      const usd_fijo = cuentas
        .filter(c => c.moneda === 'USD' && c.activa)
        .reduce((acc, c) => acc + Number(c.saldo_cache), 0)

      const ves_total = cuentas
        .filter(c => c.moneda === 'VES' && c.activa)
        .reduce((acc, c) => acc + Number(c.saldo_cache), 0)

      // Sin tasa actualizada no podemos derivar ves_en_usd exacto,
      // usamos el último valor conocido de balanceNeto si existe
      const prev = queryClient.getQueryData<BalanceNeto>(['balanceNeto'])
      const tasa_usada = prev?.tasa_usada || 0
      const ves_en_usd = tasa_usada > 0 ? ves_total / tasa_usada : 0

      return {
        usd_fijo,
        ves_total,
        ves_en_usd,
        balance_neto: usd_fijo + ves_en_usd,
        tasa_usada,
        tasa_fecha: prev?.tasa_fecha || new Date().toISOString()
      } satisfies BalanceNeto
    }
  })
}

export function useResumenMes() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  // Inicio del mes actual para filtrar
  const inicioMes = new Date()
  inicioMes.setDate(1)
  inicioMes.setHours(0, 0, 0, 0)
  const inicioMesISO = inicioMes.toISOString()

  return useQuery({
    queryKey: ['resumenMes'],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error('No user found')

      // Ejecutar las 4 queries en paralelo en lugar de secuencial
      const [
        { data: gastos },
        { data: ingresos },
        { data: ahorros },
        { data: deudas }
      ] = await Promise.all([
        supabase
          .from('transacciones')
          .select('monto_usd_calculado')
          .eq('user_id', userData.user.id)
          .eq('tipo', 'gasto')
          .eq('anulada', false)
          .gte('fecha', inicioMesISO),
        supabase
          .from('transacciones')
          .select('monto_usd_calculado')
          .eq('user_id', userData.user.id)
          .eq('tipo', 'ingreso')
          .eq('anulada', false)
          .gte('fecha', inicioMesISO),
        supabase
          .from('metas')
          .select('monto_actual')
          .eq('user_id', userData.user.id),
        supabase
          .from('deudas')
          .select('saldo_pendiente')
          .eq('user_id', userData.user.id)
      ])

      return {
        ingresos: ingresos?.reduce((acc, t) => acc + Number(t.monto_usd_calculado), 0) || 0,
        gastos: gastos?.reduce((acc, t) => acc + Number(t.monto_usd_calculado), 0) || 0,
        ahorros: ahorros?.reduce((acc, m) => acc + Number(m.monto_actual), 0) || 0,
        deuda: deudas?.reduce((acc, d) => acc + Number(d.saldo_pendiente), 0) || 0
      }
    },
    // Derivar optimistamente desde el caché de transacciones del mes actual
    placeholderData: () => {
      const prev = queryClient.getQueryData<ReturnType<typeof useResumenMes>['data']>(['resumenMes'])
      
      // Buscar transacciones cacheadas del mes actual para aproximar gastos/ingresos
      const todasTxs = queryClient.getQueriesData<Transaccion[]>({ queryKey: ['transacciones'] })
      let txsDelMes: Transaccion[] = []
      for (const [, data] of todasTxs) {
        if (Array.isArray(data)) {
          txsDelMes = data.filter(t => !t.anulada && new Date(t.fecha) >= inicioMes)
          if (txsDelMes.length > 0) break
        }
      }

      if (!txsDelMes.length) return prev

      return {
        ingresos: txsDelMes
          .filter(t => t.tipo === 'ingreso')
          .reduce((acc, t) => acc + Number(t.monto_usd_calculado), 0),
        gastos: txsDelMes
          .filter(t => t.tipo === 'gasto')
          .reduce((acc, t) => acc + Number(t.monto_usd_calculado), 0),
        ahorros: prev?.ahorros || 0,
        deuda: prev?.deuda || 0
      }
    }
  })
}
