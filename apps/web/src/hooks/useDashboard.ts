import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
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
    placeholderData: keepPreviousData,
  })
}

export interface ResumenMes {
  ingresos: number
  gastos: number
  ahorros: number
  deuda: number
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

      // Ejecutar las queries en paralelo, incluyendo la tasa para normalizar ahorros y deudas multimoneda
      const [
        { data: gastos },
        { data: ingresos },
        { data: ahorros },
        { data: deudas },
        { data: tasaRes }
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
          .select('monto_actual, moneda')
          .eq('user_id', userData.user.id),
        supabase
          .from('deudas')
          .select('saldo_pendiente, moneda')
          .eq('user_id', userData.user.id),
        supabase
          .from('tasas_cambio')
          .select('tasa')
          .order('fecha', { ascending: false })
          .limit(1)
          .maybeSingle()
      ])

      const tasa = Number(tasaRes?.tasa) || 1

      const totalAhorrosUsd = ahorros?.reduce((acc: number, m: any) => {
        const monto = Number(m.monto_actual) || 0
        if (m.moneda === 'VES') {
          return acc + (tasa > 0 ? monto / tasa : 0)
        }
        return acc + monto
      }, 0) || 0

      const totalDeudasUsd = deudas?.reduce((acc: number, d: any) => {
        const saldo = Number(d.saldo_pendiente) || 0
        if (d.moneda === 'VES') {
          return acc + (tasa > 0 ? saldo / tasa : 0)
        }
        return acc + saldo
      }, 0) || 0

      return {
        ingresos: ingresos?.reduce((acc: number, t: any) => acc + Number(t.monto_usd_calculado), 0) || 0,
        gastos: gastos?.reduce((acc: number, t: any) => acc + Number(t.monto_usd_calculado), 0) || 0,
        ahorros: totalAhorrosUsd,
        deuda: totalDeudasUsd
      }
    },
    placeholderData: keepPreviousData,
  })
}
