import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/utils/supabase/client'

export interface Perfil {
  id: string
  nombre_completo: string | null
  moneda_principal: string
  onboarding_completado: boolean
  fuente_tasa_preferida: string | null
  tema: string | null
  avatar_seed: string | null
  email: string
  created_at: string
}

export function usePerfil() {
  const supabase = createClient()

  return useQuery({
    queryKey: ['perfil'],
    queryFn: async () => {
      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError || !userData.user) throw new Error('No autenticado')

      const { data: perfil, error: perfilError } = await supabase
        .from('perfiles')
        .select('*')
        .eq('id', userData.user.id)
        .single()

      if (perfilError) throw perfilError

      return {
        ...perfil,
        email: userData.user.email || ''
      } as Perfil
    }
  })
}

export function useActualizarPerfil() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (updates: {
      nombre_completo?: string
      fuente_tasa_preferida?: string
      tema?: string
      avatar_seed?: string
    }) => {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error('No autenticado')

      const { error } = await supabase.rpc('actualizar_perfil', {
        p_nombre_completo: updates.nombre_completo || null,
        p_fuente_tasa_preferida: updates.fuente_tasa_preferida || null,
        p_tema: updates.tema || null,
        p_avatar_seed: updates.avatar_seed || null
      })

      if (error) throw error
      return true
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['perfil'] })
    }
  })
}

export function useSolicitarCambioPassword() {
  const supabase = createClient()

  return useMutation({
    mutationFn: async (email: string) => {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/perfil`
      })

      if (error) throw error
      return true
    }
  })
}

export function useEliminarCuenta() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error('No autenticado')

      const { error } = await supabase.rpc('eliminar_cuenta_publica')
      if (error) throw error

      // Cerrar sesión después de borrar los datos públicos
      await supabase.auth.signOut()
      return true
    },
    onSuccess: () => {
      queryClient.clear()
    }
  })
}
