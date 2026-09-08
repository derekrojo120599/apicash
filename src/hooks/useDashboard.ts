import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/utils/supabase/client'

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

  return useQuery({
    queryKey: ['balanceNeto'],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error('No user found')

      const { data, error } = await supabase
        .rpc('obtener_balance_neto', { p_user_id: userData.user.id })
        
      if (error) throw error
      
      // La función RPC retorna un array (por el RETURNS TABLE), tomamos el primer elemento
      // Manejando el caso de null que puede devolver Supabase si no hay datos
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
  })
}

export function useResumenMes() {
  const supabase = createClient()

  return useQuery({
    queryKey: ['resumenMes'],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error('No user found')

      const inicioMes = new Date()
      inicioMes.setDate(1)
      inicioMes.setHours(0, 0, 0, 0)

      // Gastos del mes
      const { data: gastos } = await supabase
        .from('transacciones')
        .select('monto_usd_calculado')
        .eq('user_id', userData.user.id)
        .eq('tipo', 'gasto')
        .eq('anulada', false)
        .gte('fecha', inicioMes.toISOString())

      // Ingresos del mes
      const { data: ingresos } = await supabase
        .from('transacciones')
        .select('monto_usd_calculado')
        .eq('user_id', userData.user.id)
        .eq('tipo', 'ingreso')
        .eq('anulada', false)
        .gte('fecha', inicioMes.toISOString())

      // Ahorros (metas)
      const { data: ahorros } = await supabase
        .from('metas')
        .select('monto_actual')
        .eq('user_id', userData.user.id)

      // Deudas
      const { data: deudas } = await supabase
        .from('deudas')
        .select('saldo_pendiente')
        .eq('user_id', userData.user.id)

      const totalGastos = gastos?.reduce((acc, curr) => acc + Number(curr.monto_usd_calculado), 0) || 0
      const totalIngresos = ingresos?.reduce((acc, curr) => acc + Number(curr.monto_usd_calculado), 0) || 0
      const totalAhorros = ahorros?.reduce((acc, curr) => acc + Number(curr.monto_actual), 0) || 0
      const totalDeuda = deudas?.reduce((acc, curr) => acc + Number(curr.saldo_pendiente), 0) || 0

      return {
        ingresos: totalIngresos,
        gastos: totalGastos,
        ahorros: totalAhorros,
        deuda: totalDeuda
      }
    }
  })
}
