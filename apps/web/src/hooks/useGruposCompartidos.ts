import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/utils/supabase/client'
import type {
  GrupoCompartidoBase,
  MiembroGrupoBase,
  GastoGrupoBase,
  PagoGrupoBase,
  Moneda
} from '@apicash/shared'

export type GrupoCompartido = GrupoCompartidoBase & {
  miembros_grupo?: MiembroGrupoBase[]
}

export interface CreateGrupoParams {
  nombre: string
  descripcion?: string
  moneda?: Moneda
  color?: string
}

export function useGruposCompartidos() {
  const supabase = createClient()

  return useQuery({
    queryKey: ['gruposCompartidos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('grupos_compartidos')
        .select(`
          *,
          miembros_grupo(*)
        `)
        .order('created_at', { ascending: false })

      if (error) {
        if (error.code === '42P01') return [] // Relation does not exist yet
        throw error
      }
      return (data ?? []) as GrupoCompartido[]
    }
  })
}

export function useCrearGrupo() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: CreateGrupoParams) => {
      const { data, error } = await supabase.rpc('crear_grupo_compartido', {
        p_nombre: params.nombre,
        p_descripcion: params.descripcion || null,
        p_moneda: params.moneda || 'USD',
        p_color: params.color || '#10b981'
      })

      if (error) throw new Error(error.message)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gruposCompartidos'] })
    }
  })
}

export function useUnirseGrupo() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (codigo: string) => {
      const { data, error } = await supabase.rpc('unirse_grupo_por_codigo', {
        p_codigo: codigo
      })

      if (error) throw new Error(error.message)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gruposCompartidos'] })
    }
  })
}

export function useDetalleGrupo(grupoId: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['detalleGrupo', grupoId],
    enabled: !!grupoId,
    queryFn: async () => {
      const { data: grupo, error: grupoError } = await supabase
        .from('grupos_compartidos')
        .select('*')
        .eq('id', grupoId)
        .single()

      if (grupoError) {
        if (grupoError.code === '42P01') return null
        throw grupoError
      }

      const { data: miembros } = await supabase
        .from('miembros_grupo')
        .select('*')
        .eq('grupo_id', grupoId)
        .eq('activo', true)

      const { data: gastos } = await supabase
        .from('gastos_grupo')
        .select(`
          *,
          divisiones_gasto_grupo(*)
        `)
        .eq('grupo_id', grupoId)
        .order('fecha', { ascending: false })

      const { data: pagos } = await supabase
        .from('pagos_grupo')
        .select('*')
        .eq('grupo_id', grupoId)
        .order('created_at', { ascending: false })

      return {
        grupo: grupo as GrupoCompartidoBase,
        miembros: (miembros ?? []) as MiembroGrupoBase[],
        gastos: gastos ?? [],
        pagos: (pagos ?? []) as PagoGrupoBase[]
      }
    }
  })
}

export function useResponderPagoGrupal() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ pagoId, accion }: { pagoId: string; accion: 'confirmar' | 'rechazar' }) => {
      const { data, error } = await supabase.rpc('responder_pago_grupal', {
        p_pago_id: pagoId,
        p_accion: accion
      })

      if (error) throw new Error(error.message)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['detalleGrupo'] })
      queryClient.invalidateQueries({ queryKey: ['gruposCompartidos'] })
    }
  })
}
