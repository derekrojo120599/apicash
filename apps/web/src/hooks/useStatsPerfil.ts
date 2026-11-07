import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/utils/supabase/client'

export interface GastoPorCategoria {
  nombre: string
  monto: number
  color?: string
}

export interface IngresoGastoMensual {
  mes: string
  ingresos: number
  gastos: number
}

export interface EvolucionBalance {
  mes: string
  balance: number
}

export interface ProgresoMeta {
  nombre: string
  actual: number
  objetivo: number
  porcentaje: number
}

export interface StatsPerfil {
  totalTransacciones: number
  totalCuentas: number
  totalMetas: number
  totalDeudas: number
  gastosPorCategoria: GastoPorCategoria[]
  ingresosGastosMensual: IngresoGastoMensual[]
  evolucionBalance: EvolucionBalance[]
  progresoMetas: ProgresoMeta[]
}

export function useStatsPerfil() {
  const supabase = createClient()

  return useQuery({
    queryKey: ['statsPerfil'],
    queryFn: async () => {
      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError || !userData.user) throw new Error('No autenticado')

      const userId = userData.user.id

      // Transacciones del último año
      const inicioAnio = new Date()
      inicioAnio.setFullYear(inicioAnio.getFullYear() - 1)

      const { data: transacciones, error: txError } = await supabase
        .from('transacciones')
        .select('*, categorias(nombre, tipo)')
        .eq('user_id', userId)
        .eq('anulada', false)
        .gte('fecha', inicioAnio.toISOString())

      if (txError) throw txError

      const { data: snapshots, error: snapError } = await supabase
        .from('snapshots_mensuales')
        .select('mes, balance_neto_usd')
        .eq('user_id', userId)
        .order('mes', { ascending: true })
        .limit(12)

      if (snapError) throw snapError

      const { data: metas, error: metasError } = await supabase
        .from('metas')
        .select('nombre, monto_actual, monto_objetivo')
        .eq('user_id', userId)
        .gt('monto_objetivo', 0)

      if (metasError) throw metasError

      const { count: countCuentas, error: countCuentasError } = await supabase
        .from('cuentas')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)

      if (countCuentasError) throw countCuentasError

      const { count: countMetas, error: countMetasError } = await supabase
        .from('metas')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)

      if (countMetasError) throw countMetasError

      const { count: countDeudas, error: countDeudasError } = await supabase
        .from('deudas')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)

      if (countDeudasError) throw countDeudasError

      // Calcular gastos por categoría del mes actual
      const inicioMes = new Date()
      inicioMes.setDate(1)
      inicioMes.setHours(0, 0, 0, 0)

      const gastosPorCategoriaMap = new Map<string, number>()
      const ingresosGastosMensualMap = new Map<string, { ingresos: number; gastos: number }>()

      transacciones?.forEach((tx: any) => {
        const fecha = new Date(tx.fecha)
        const mesKey = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`

        // Ingresos vs gastos mensual
        if (!ingresosGastosMensualMap.has(mesKey)) {
          ingresosGastosMensualMap.set(mesKey, { ingresos: 0, gastos: 0 })
        }
        const mensual = ingresosGastosMensualMap.get(mesKey)!
        if (tx.tipo === 'ingreso') {
          mensual.ingresos += Number(tx.monto_usd_calculado)
        } else if (tx.tipo === 'gasto') {
          mensual.gastos += Number(tx.monto_usd_calculado)
        }

        // Gastos por categoría del mes actual
        if (tx.tipo === 'gasto' && fecha >= inicioMes && tx.categorias?.nombre) {
          const categoria = tx.categorias.nombre
          gastosPorCategoriaMap.set(categoria, (gastosPorCategoriaMap.get(categoria) || 0) + Number(tx.monto_usd_calculado))
        }
      })

      const gastosPorCategoria: GastoPorCategoria[] = Array.from(gastosPorCategoriaMap.entries())
        .map(([nombre, monto]) => ({ nombre, monto: Math.round(monto * 100) / 100 }))
        .sort((a, b) => b.monto - a.monto)
        .slice(0, 8)

      // Últimos 6 meses de ingresos vs gastos
      const ultimos6Meses: IngresoGastoMensual[] = []
      for (let i = 5; i >= 0; i--) {
        const d = new Date()
        d.setMonth(d.getMonth() - i)
        const mesKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        const datos = ingresosGastosMensualMap.get(mesKey) || { ingresos: 0, gastos: 0 }
        ultimos6Meses.push({
          mes: d.toLocaleDateString('es-ES', { month: 'short' }),
          ingresos: Math.round(datos.ingresos * 100) / 100,
          gastos: Math.round(datos.gastos * 100) / 100
        })
      }

      const evolucionBalance: EvolucionBalance[] = (snapshots || []).map((s: any) => ({
        mes: new Date(s.mes).toLocaleDateString('es-ES', { month: 'short', year: '2-digit' }),
        balance: Math.round(Number(s.balance_neto_usd) * 100) / 100
      }))

      const progresoMetas: ProgresoMeta[] = (metas || []).map((m: any) => ({
        nombre: m.nombre,
        actual: Number(m.monto_actual),
        objetivo: Number(m.monto_objetivo),
        porcentaje: Math.min(Math.round((Number(m.monto_actual) / Number(m.monto_objetivo)) * 100), 100)
      }))

      return {
        totalTransacciones: transacciones?.length || 0,
        totalCuentas: countCuentas || 0,
        totalMetas: countMetas || 0,
        totalDeudas: countDeudas || 0,
        gastosPorCategoria,
        ingresosGastosMensual: ultimos6Meses,
        evolucionBalance,
        progresoMetas
      } as StatsPerfil
    }
  })
}
