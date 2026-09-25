import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/utils/supabase/client'

export interface ProgresoPresupuesto {
  categoria_id: string
  categoria_nombre: string
  monto_planeado: number
  monto_gastado: number
  porcentaje_usado: number
  restante: number
}

export function useProgresoPresupuesto(mes: Date) {
  const supabase = createClient()
  
  // Format to 'YYYY-MM-01' matching the DATE format of the DB
  const mesFormat = `${mes.getFullYear()}-${String(mes.getMonth() + 1).padStart(2, '0')}-01`

  return useQuery({
    queryKey: ['progresoPresupuesto', mesFormat],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error('No auth user')

      const { data, error } = await supabase
        .rpc('obtener_progreso_presupuesto', { 
          p_user_id: userData.user.id,
          p_mes: mesFormat
        })
      
      if (error) throw error
      
      return (data || []).map((row: any) => ({
        ...row,
        monto_planeado: Number(row.monto_planeado),
        monto_gastado: Number(row.monto_gastado),
        porcentaje_usado: Number(row.porcentaje_usado),
        restante: Number(row.restante)
      })) as ProgresoPresupuesto[]
    }
  })
}

export function useGuardarPresupuesto() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      categoria_id,
      monto_planeado,
      mes
    }: {
      categoria_id: string
      monto_planeado: number
      mes: Date
    }) => {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error('No auth user')

      const mesFormat = `${mes.getFullYear()}-${String(mes.getMonth() + 1).padStart(2, '0')}-01`

      // Upsert directo — elimina el SELECT previo de "check if exists"
      const { data, error } = await supabase
        .from('presupuestos')
        .upsert(
          [{
            user_id: userData.user.id,
            categoria_id,
            monto_planeado,
            mes: mesFormat,
            moneda: 'USD'
          }],
          { onConflict: 'user_id,categoria_id,mes' }
        )

      if (error) throw error
      return data
    },
    onMutate: async ({ categoria_id, monto_planeado, mes }) => {
      const mesFormat = `${mes.getFullYear()}-${String(mes.getMonth() + 1).padStart(2, '0')}-01`
      const queryKey = ['progresoPresupuesto', mesFormat]

      await queryClient.cancelQueries({ queryKey })
      const previousProgreso = queryClient.getQueryData<ProgresoPresupuesto[]>(queryKey)

      // Actualizar monto_planeado en la entrada existente, o dejar como está si no existe
      // (el refetch de onSettled la va a agregar correctamente)
      queryClient.setQueryData<ProgresoPresupuesto[]>(queryKey, old =>
        old?.map(p => p.categoria_id === categoria_id
          ? {
              ...p,
              monto_planeado,
              restante: monto_planeado - p.monto_gastado,
              porcentaje_usado: monto_planeado > 0
                ? Math.round((p.monto_gastado / monto_planeado) * 1000) / 10
                : 0
            }
          : p
        )
      )

      return { previousProgreso, mesFormat }
    },
    onError: (_err, _vars, context) => {
      if (context?.previousProgreso) {
        queryClient.setQueryData(
          ['progresoPresupuesto', context.mesFormat],
          context.previousProgreso
        )
      }
    },
    onSettled: (_data, _err, variables) => {
      const mesFormat = `${variables.mes.getFullYear()}-${String(variables.mes.getMonth() + 1).padStart(2, '0')}-01`
      queryClient.invalidateQueries({ queryKey: ['progresoPresupuesto', mesFormat] })
    }
  })
}

export function useCopiarPresupuestosAnterior() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ mesOrigen, mesDestino }: { mesOrigen: Date, mesDestino: Date }) => {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error('No auth user')

      const mesOrigenFormat = `${mesOrigen.getFullYear()}-${String(mesOrigen.getMonth() + 1).padStart(2, '0')}-01`
      const mesDestinoFormat = `${mesDestino.getFullYear()}-${String(mesDestino.getMonth() + 1).padStart(2, '0')}-01`

      const { error } = await supabase
        .rpc('copiar_presupuesto_anterior', {
          p_mes_origen: mesOrigenFormat,
          p_mes_destino: mesDestinoFormat
        })

      if (error) throw error
      return true
    },
    onSuccess: (_, variables) => {
      const mesDestinoFormat = `${variables.mesDestino.getFullYear()}-${String(variables.mesDestino.getMonth() + 1).padStart(2, '0')}-01`
      queryClient.invalidateQueries({ queryKey: ['progresoPresupuesto', mesDestinoFormat] })
    }
  })
}
