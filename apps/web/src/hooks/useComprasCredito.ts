import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/utils/supabase/client'
import {
  generarCronogramaCuotas,
  type CompraCreditoBase,
  type CuotaCompraBase,
  type Moneda
} from '@apicash/shared'

export type CompraCredito = CompraCreditoBase & {
  cuotas_compra?: CuotaCompraBase[]
  cuentas?: { nombre: string; moneda: string }
}

export interface CreateCompraCreditoParams {
  comercio: string
  descripcion: string
  categoria_id?: string | null
  moneda?: Moneda
  monto_total: number
  monto_inicial?: number
  numero_cuotas: number
  intervalo_dias?: number
  cuenta_inicial_id?: string | null
  fecha_compra?: string
  tasa_al_momento?: number | null
}

export function useComprasCredito() {
  const supabase = createClient()

  return useQuery({
    queryKey: ['comprasCredito'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('compras_credito')
        .select(`
          *,
          cuotas_compra(*),
          cuentas:cuenta_inicial_id(nombre, moneda)
        `)
        .order('created_at', { ascending: false })

      if (error) {
        if (error.code === '42P01') return [] // Relation does not exist yet
        throw error
      }
      return (data ?? []) as CompraCredito[]
    }
  })
}

export function useCrearCompraCredito() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: CreateCompraCreditoParams) => {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error('No auth user')

      const montoInicial = params.monto_inicial ?? 0
      const fechaCompra = params.fecha_compra || new Date().toISOString().split('T')[0]
      const plan = generarCronogramaCuotas(
        params.monto_total,
        montoInicial,
        params.numero_cuotas,
        fechaCompra,
        params.intervalo_dias ?? 14
      )

      // 1. Insertar compra principal
      const { data: compra, error: compraError } = await supabase
        .from('compras_credito')
        .insert({
          user_id: userData.user.id,
          comercio: params.comercio,
          descripcion: params.descripcion,
          categoria_id: params.categoria_id || null,
          moneda: params.moneda || 'USD',
          monto_total: params.monto_total,
          monto_inicial: montoInicial,
          saldo_pendiente: plan.saldoAFinanciar,
          numero_cuotas: params.numero_cuotas,
          intervalo_dias: params.intervalo_dias ?? 14,
          cuenta_inicial_id: params.cuenta_inicial_id || null,
          fecha_compra: fechaCompra,
          estado: 'activa'
        })
        .select()
        .single()

      if (compraError) throw compraError

      // 2. Insertar cuotas generadas
      const cuotasPayload = plan.cuotas.map((c) => ({
        compra_credito_id: compra.id,
        user_id: userData.user.id,
        numero_cuota: c.numeroCuota,
        monto: c.monto,
        fecha_vencimiento: c.fechaVencimiento,
        estado: 'pendiente'
      }))

      const { error: cuotasError } = await supabase
        .from('cuotas_compra')
        .insert(cuotasPayload)

      if (cuotasError) throw cuotasError

      // 3. Si hay inicial pagada desde una cuenta bancaria, registrar gasto
      if (montoInicial > 0 && params.cuenta_inicial_id) {
        const { data: cuenta } = await supabase
          .from('cuentas')
          .select('moneda')
          .eq('id', params.cuenta_inicial_id)
          .single()

        const tasa = params.tasa_al_momento || 1
        let montoDebitar = montoInicial
        if (cuenta?.moneda === 'VES' && (params.moneda || 'USD') === 'USD') {
          montoDebitar = Number((montoInicial * tasa).toFixed(2))
        }

        await supabase.from('transacciones').insert({
          user_id: userData.user.id,
          cuenta_id: params.cuenta_inicial_id,
          categoria_id: params.categoria_id || null,
          tipo: 'gasto',
          monto_original: montoDebitar,
          moneda_original: cuenta?.moneda || 'USD',
          tasa_al_momento: tasa,
          monto_usd_calculado: montoInicial,
          descripcion: `Inicial: ${params.comercio} - ${params.descripcion}`,
          fecha: new Date().toISOString(),
          compra_credito_id: compra.id
        })

        // Actualizar saldo de cuenta
        await supabase.rpc('actualizar_saldo_cuenta', {
          p_cuenta_id: params.cuenta_inicial_id,
          p_monto_delta: -montoDebitar
        })
      }

      return compra
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comprasCredito'] })
      queryClient.invalidateQueries({ queryKey: ['cuentas'] })
      queryClient.invalidateQueries({ queryKey: ['transacciones'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    }
  })
}
