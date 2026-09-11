'use client';

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { usePerfil, useActualizarPerfil, useSolicitarCambioPassword, useEliminarCuenta, useBorrarDatos } from '@/hooks/usePerfil'
import { useTasasFuentes } from '@/hooks/useTasasFuentes'
import { useStatsPerfil } from '@/hooks/useStatsPerfil'
import { createClient } from '@/utils/supabase/client'
import { AvatarDiceBear } from '@/components/AvatarDiceBear'
import { ThemeSelector } from '@/components/ThemeSelector'
import { PerfilStatsSection } from '@/components/PerfilStatsSection'
import { FadeIn, AnimatedCard, AnimatedButton, AnimatedLoader, AnimatedSelect } from '@/components/animations'
import { User, Mail, Calendar, RefreshCw, Lock, Trash2, Package, HelpCircle, Save, X, AlertTriangle, Loader2, Sparkles, TrendingUp, Download, FileText, Shield, BarChart3, Pencil } from 'lucide-react'

export const dynamic = 'force-dynamic';

export default function PerfilPage() {
  const router = useRouter()
  const supabase = createClient()
  const { data: perfil, isLoading } = usePerfil()
  const { data: fuentes } = useTasasFuentes()
  const { data: stats, isLoading: loadingStats } = useStatsPerfil()
  const { mutateAsync: actualizarPerfil, isPending: isUpdating } = useActualizarPerfil()
  const { mutateAsync: solicitarCambioPassword, isPending: isSendingReset } = useSolicitarCambioPassword()
  const { mutateAsync: eliminarCuenta, isPending: isDeleting } = useEliminarCuenta()
  const { mutateAsync: borrarDatos, isPending: isBorrandoDatos } = useBorrarDatos()

  const [nombreEditado, setNombreEditado] = useState('')
  const [modoEdicion, setModoEdicion] = useState(false)
  const [modalPassword, setModalPassword] = useState(false)
  const [modalEliminar, setModalEliminar] = useState(false)
  const [modalBorrarDatos, setModalBorrarDatos] = useState(false)
  const [modalAvatar, setModalAvatar] = useState(false)
  const [confirmacionEliminar, setConfirmacionEliminar] = useState('')
  const [confirmacionBorrarDatos, setConfirmacionBorrarDatos] = useState('')
  const [mensajeExito, setMensajeExito] = useState('')

  const iniciarEdicion = () => {
    setNombreEditado(perfil?.nombre_completo || '')
    setModoEdicion(true)
  }

  const guardarNombre = async () => {
    try {
      await actualizarPerfil({ nombre_completo: nombreEditado.trim() || undefined })
      setModoEdicion(false)
      setMensajeExito('Nombre actualizado correctamente')
      setTimeout(() => setMensajeExito(''), 3000)
    } catch (err: any) {
      alert(err.message || 'Error al actualizar el nombre')
    }
  }

  const regenerarAvatar = async () => {
    const nuevoSeed = Math.random().toString(36).substring(2, 15)
    try {
      await actualizarPerfil({ avatar_seed: nuevoSeed })
    } catch (err: any) {
      alert(err.message || 'Error al actualizar el avatar')
    }
  }

  const guardarAvatarPredefinido = async (seed: string) => {
    try {
      await actualizarPerfil({ avatar_seed: seed })
      setModalAvatar(false)
      setMensajeExito('Avatar actualizado')
      setTimeout(() => setMensajeExito(''), 3000)
    } catch (err: any) {
      alert(err.message || 'Error al actualizar el avatar')
    }
  }

  const AVATARES_PREDEFINIDOS = [
    'bot-1', 'fox-alpha', 'ninja-99', 'happy-cloud', 
    'cool-dog', 'space-cat', 'gamer-x', 'wizard-oz',
    'neon-cyber', 'pixel-hero', 'coffee-mug', 'chill-panda',
    'red-dragon', 'blue-ocean', 'star-ship', 'golden-bear'
  ]

  const cambiarTema = async (tema: string) => {
    try {
      await actualizarPerfil({ tema })
      setMensajeExito('Tema actualizado')
      setTimeout(() => setMensajeExito(''), 3000)
    } catch (err: any) {
      alert(err.message || 'Error al actualizar el tema')
    }
  }

  const cambiarFuenteTasa = async (fuente: string) => {
    try {
      await actualizarPerfil({ fuente_tasa_preferida: fuente })
      setMensajeExito('Fuente de tasa actualizada')
      setTimeout(() => setMensajeExito(''), 3000)
    } catch (err: any) {
      alert(err.message || 'Error al actualizar la fuente de tasa')
    }
  }

  const handleCambioPassword = async () => {
    if (!perfil?.email) return
    try {
      await solicitarCambioPassword(perfil.email)
      setModalPassword(false)
      setMensajeExito('Te enviamos un correo para cambiar tu contraseña')
      setTimeout(() => setMensajeExito(''), 5000)
    } catch (err: any) {
      alert(err.message || 'Error al solicitar el cambio de contraseña')
    }
  }

  const handleEliminarCuenta = async () => {
    if (confirmacionEliminar !== 'ELIMINAR') {
      alert('Debes escribir ELIMINAR para confirmar')
      return
    }

    try {
      await eliminarCuenta()
      router.push('/login')
    } catch (err: any) {
      alert(err.message || 'Error al eliminar la cuenta')
    }
  }

  const exportarDatos = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error('No autenticado')

      const userId = userData.user.id

      const [perfil, cuentas, categorias, transacciones, metas, deudas, presupuestos] = await Promise.all([
        supabase.from('perfiles').select('*').eq('id', userId).single(),
        supabase.from('cuentas').select('*').eq('user_id', userId),
        supabase.from('categorias').select('*').eq('user_id', userId),
        supabase.from('transacciones').select('*').eq('user_id', userId).order('fecha', { ascending: false }),
        supabase.from('metas').select('*').eq('user_id', userId),
        supabase.from('deudas').select('*').eq('user_id', userId),
        supabase.from('presupuestos').select('*').eq('user_id', userId)
      ])

      const exportData = {
        exportado_el: new Date().toISOString(),
        perfil: perfil.data,
        cuentas: cuentas.data,
        categorias: categorias.data,
        transacciones: transacciones.data,
        metas: metas.data,
        deudas: deudas.data,
        presupuestos: presupuestos.data
      }

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `apicasch-backup-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setMensajeExito('Datos exportados correctamente')
      setTimeout(() => setMensajeExito(''), 3000)
    } catch (err: any) {
      alert(err.message || 'Error al exportar los datos')
    }
  }

  const handleBorrarDatos = async () => {
    if (confirmacionBorrarDatos !== 'BORRAR') {
      alert('Debes escribir BORRAR para confirmar')
      return
    }

    try {
      await borrarDatos()
      setModalBorrarDatos(false)
      setConfirmacionBorrarDatos('')
      setMensajeExito('Todos tus datos fueron eliminados')
      setTimeout(() => setMensajeExito(''), 3000)
      router.refresh()
    } catch (err: any) {
      alert(err.message || 'Error al borrar los datos')
    }
  }

  const formatFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-4xl mx-auto pb-24 md:pb-8">
      <FadeIn as="header" className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Perfil</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Administra tu información y preferencias</p>
      </FadeIn>

      {mensajeExito && (
        <FadeIn>
          <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-900/40 text-primary-700 dark:text-primary-400 p-4 rounded-xl text-sm font-medium">
            {mensajeExito}
          </div>
        </FadeIn>
      )}

      {isLoading ? (
        <div className="flex justify-center p-12">
          <AnimatedLoader size={40} color="var(--primary-500)" />
        </div>
      ) : (
        <>
          {/* Información del usuario */}
          <FadeIn delay={100}>
            <AnimatedCard className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                Información del usuario
              </h2>

              <div className="flex flex-col sm:flex-row items-start gap-6">
                <div className="relative">
                  <AvatarDiceBear
                    seed={perfil?.avatar_seed || perfil?.email || 'default'}
                    size={96}
                    className="w-24 h-24"
                  />
                  <div className="absolute -bottom-2 -right-2 flex gap-1">
                    <button
                      onClick={regenerarAvatar}
                      disabled={isUpdating}
                      className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-slate-600 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors shadow-sm"
                      title="Generar aleatorio"
                    >
                      <RefreshCw className={`w-4 h-4 ${isUpdating ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                      onClick={() => setModalAvatar(true)}
                      disabled={isUpdating}
                      className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-slate-600 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors shadow-sm"
                      title="Elegir avatar"
                    >
                      <User className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 space-y-4 w-full">
                  <div>
                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Nombre completo</label>
                    {modoEdicion ? (
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="text"
                          value={nombreEditado}
                          onChange={e => setNombreEditado(e.target.value)}
                          className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-transparent text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary-500 outline-none"
                          placeholder="Tu nombre"
                        />
                        <button
                          onClick={guardarNombre}
                          disabled={isUpdating}
                          className="p-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shadow-sm"
                          title="Guardar"
                        >
                          {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => setModoEdicion(false)}
                          className="p-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors shadow-sm"
                          title="Cancelar"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-lg font-medium text-slate-900 dark:text-slate-100">
                          {perfil?.nombre_completo || 'Sin nombre'}
                        </p>
                        <button
                          onClick={iniciarEdicion}
                          className="p-2 flex items-center gap-2 text-sm bg-primary-50 text-primary-600 hover:bg-primary-100 dark:bg-primary-900/20 dark:text-primary-400 dark:hover:bg-primary-900/40 rounded-lg transition-colors font-medium shadow-sm"
                          title="Editar nombre"
                        >
                          <Pencil className="w-4 h-4" />
                          <span className="hidden sm:inline">Editar</span>
                        </button>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide flex items-center gap-1">
                      <Mail className="w-3 h-3" /> Correo electrónico
                    </label>
                    <p className="text-base text-slate-900 dark:text-slate-100 mt-1">{perfil?.email}</p>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Fecha de registro
                    </label>
                    <p className="text-base text-slate-900 dark:text-slate-100 mt-1">
                      {perfil?.created_at ? formatFecha(perfil.created_at) : '-'}
                    </p>
                  </div>
                </div>
              </div>
            </AnimatedCard>
          </FadeIn>

          {/* Preferencias de la app */}
          <FadeIn delay={150}>
            <AnimatedCard className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                Preferencias de la app
              </h2>

              <div className="space-y-6">
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3 block">Tema de color</label>
                  <ThemeSelector
                    value={perfil?.tema || 'emerald'}
                    onChange={cambiarTema}
                    disabled={isUpdating}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1">
                    <TrendingUp className="w-4 h-4" /> Fuente de tasa de cambio
                  </label>
                  <AnimatedSelect
                    value={perfil?.fuente_tasa_preferida || ''}
                    onChange={cambiarFuenteTasa}
                    options={[
                      { value: '', label: 'Cargando fuentes...', disabled: true },
                      ...(fuentes?.map(f => ({
                        value: f.fuente,
                        label: `${f.fuente} (${f.tasa})`
                      })) || [])
                    ]}
                    placeholder="Seleccione una fuente"
                    accent="emerald"
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                    Se usará esta fuente para convertir montos entre USD y VES en transacciones y balance.
                  </p>
                </div>
              </div>
            </AnimatedCard>
          </FadeIn>

          {/* Estadísticas personales */}
          <FadeIn delay={200}>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2 px-1">
                <BarChart3 className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                Estadísticas personales
              </h2>

              <PerfilStatsSection stats={stats} isLoading={loadingStats} />
            </div>
          </FadeIn>

          {/* Gestión de la cuenta y datos */}
          <FadeIn delay={300}>
            <AnimatedCard className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Lock className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                Gestión de la cuenta
              </h2>

              <div className="space-y-3">
                <button
                  onClick={() => setModalPassword(true)}
                  className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left"
                >
                  <div>
                    <p className="font-medium text-slate-900 dark:text-slate-100">Cambiar contraseña</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Te enviaremos un correo con instrucciones</p>
                  </div>
                  <Lock className="w-5 h-5 text-slate-400" />
                </button>

                <button
                  onClick={exportarDatos}
                  className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left"
                >
                  <div>
                    <p className="font-medium text-slate-900 dark:text-slate-100">Exportar datos</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Descargar JSON con toda tu información</p>
                  </div>
                  <Download className="w-5 h-5 text-slate-400" />
                </button>

                <button
                  onClick={() => setModalBorrarDatos(true)}
                  className="w-full flex items-center justify-between p-4 rounded-xl border border-orange-200 dark:border-orange-900/40 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors text-left"
                >
                  <div>
                    <p className="font-medium text-orange-700 dark:text-orange-400">Borrar todos los datos</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Elimina cuentas, transacciones, metas y deudas</p>
                  </div>
                  <Trash2 className="w-5 h-5 text-orange-500" />
                </button>

                <button
                  onClick={() => setModalEliminar(true)}
                  className="w-full flex items-center justify-between p-4 rounded-xl border border-red-200 dark:border-red-900/40 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-left"
                >
                  <div>
                    <p className="font-medium text-red-700 dark:text-red-400">Eliminar cuenta</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Borra todos tus datos de forma permanente</p>
                  </div>
                  <Trash2 className="w-5 h-5 text-red-500" />
                </button>
              </div>
            </AnimatedCard>
          </FadeIn>

          {/* Información y soporte */}
          <FadeIn delay={400}>
            <AnimatedCard className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Package className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                Información y soporte
              </h2>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div>
                    <p className="font-medium text-slate-900 dark:text-slate-100">Versión</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{process.env.NEXT_PUBLIC_APP_VERSION}</p>
                  </div>
                  <Package className="w-5 h-5 text-slate-400" />
                </div>

                <a
                  href="mailto:soporte@apicasch.com?subject=Soporte%20Apicasch"
                  className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <div>
                    <p className="font-medium text-slate-900 dark:text-slate-100">Soporte / Reportar problema</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Escríbenos por correo</p>
                  </div>
                  <HelpCircle className="w-5 h-5 text-slate-400" />
                </a>

                <a
                  href="/privacidad"
                  className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <div>
                    <p className="font-medium text-slate-900 dark:text-slate-100">Política de privacidad</p>
                  </div>
                  <Shield className="w-5 h-5 text-slate-400" />
                </a>

                <a
                  href="/terminos"
                  className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <div>
                    <p className="font-medium text-slate-900 dark:text-slate-100">Términos de servicio</p>
                  </div>
                  <FileText className="w-5 h-5 text-slate-400" />
                </a>
              </div>
            </AnimatedCard>
          </FadeIn>
        </>
      )}

      {/* Modal Selector de Avatar */}
      {modalAvatar && (
        <div className="fixed inset-0 bg-slate-900/50 dark:bg-slate-950/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-xl border border-slate-200 dark:border-slate-800 my-auto">
            <div className="flex justify-between items-center p-5 border-b border-slate-100 dark:border-slate-800/60 sticky top-0 bg-white dark:bg-slate-900 rounded-t-2xl z-10">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary-500" />
                Elige tu avatar
              </h3>
              <button onClick={() => setModalAvatar(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-4 gap-4 max-h-[60vh] overflow-y-auto p-1">
                {AVATARES_PREDEFINIDOS.map((seed) => (
                  <button
                    key={seed}
                    onClick={() => guardarAvatarPredefinido(seed)}
                    disabled={isUpdating}
                    className={`relative rounded-xl border-2 transition-all p-2 flex justify-center items-center ${
                      perfil?.avatar_seed === seed 
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' 
                        : 'border-transparent hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <AvatarDiceBear seed={seed} size={64} className="w-16 h-16" />
                    {perfil?.avatar_seed === seed && (
                      <div className="absolute -top-2 -right-2 bg-primary-500 text-white rounded-full p-1 shadow-md">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setModalAvatar(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors font-medium"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal cambiar contraseña */}
      {modalPassword && (
        <div className="fixed inset-0 bg-slate-900/50 dark:bg-slate-950/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-xl overflow-visible border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center p-5 border-b border-slate-100 dark:border-slate-800/60">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Cambiar contraseña</h3>
              <button onClick={() => setModalPassword(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Enviaremos un enlace seguro a <strong className="dark:text-slate-100">{perfil?.email}</strong> para que puedas crear una nueva contraseña.
              </p>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setModalPassword(false)}
                  className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCambioPassword}
                  disabled={isSendingReset}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium flex justify-center items-center"
                >
                  {isSendingReset ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enviar correo'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal eliminar cuenta */}
      {modalEliminar && (
        <div className="fixed inset-0 bg-slate-900/50 dark:bg-slate-950/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-xl overflow-visible border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center p-5 border-b border-red-100 dark:border-red-900/40 bg-red-50 dark:bg-red-900/20 rounded-t-2xl">
              <h3 className="text-lg font-bold text-red-700 dark:text-red-400 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Eliminar cuenta
              </h3>
              <button onClick={() => setModalEliminar(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="text-sm text-slate-600 dark:text-slate-300 space-y-2">
                <p>Esta acción eliminará de forma permanente:</p>
                <ul className="list-disc list-inside text-slate-500 dark:text-slate-400">
                  <li>Todas tus cuentas</li>
                  <li>Todas tus transacciones</li>
                  <li>Tus metas de ahorro y deudas</li>
                  <li>Tus categorías y presupuestos</li>
                </ul>
                <p className="font-medium text-red-600 dark:text-red-400">No se puede deshacer.</p>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Escribe <strong>ELIMINAR</strong> para confirmar
                </label>
                <input
                  type="text"
                  value={confirmacionEliminar}
                  onChange={e => setConfirmacionEliminar(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-transparent text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-red-500 outline-none"
                  placeholder="ELIMINAR"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setModalEliminar(false)}
                  className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleEliminarCuenta}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium flex justify-center items-center"
                >
                  {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Eliminar definitivamente'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal borrar todos los datos */}
      {modalBorrarDatos && (
        <div className="fixed inset-0 bg-slate-900/50 dark:bg-slate-950/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-xl overflow-visible border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center p-5 border-b border-orange-100 dark:border-orange-900/40 bg-orange-50 dark:bg-orange-900/20 rounded-t-2xl">
              <h3 className="text-lg font-bold text-orange-700 dark:text-orange-400 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Borrar todos los datos
              </h3>
              <button onClick={() => setModalBorrarDatos(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="text-sm text-slate-600 dark:text-slate-300 space-y-2">
                <p>Se eliminarán todos tus datos financieros:</p>
                <ul className="list-disc list-inside text-slate-500 dark:text-slate-400">
                  <li>Cuentas y transacciones</li>
                  <li>Metas de ahorro y deudas</li>
                  <li>Categorías y presupuestos</li>
                </ul>
                <p className="font-medium text-orange-600 dark:text-orange-400">Tu cuenta de usuario se mantendrá. Esta acción no se puede deshacer.</p>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Escribe <strong>BORRAR</strong> para confirmar
                </label>
                <input
                  type="text"
                  value={confirmacionBorrarDatos}
                  onChange={e => setConfirmacionBorrarDatos(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-transparent text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500 outline-none"
                  placeholder="BORRAR"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setModalBorrarDatos(false)}
                  className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleBorrarDatos}
                  disabled={isBorrandoDatos}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium flex justify-center items-center"
                >
                  {isBorrandoDatos ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Borrar datos'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
