'use client';

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { usePerfil, useActualizarPerfil, useSolicitarCambioPassword, useEliminarCuenta } from '@/hooks/usePerfil'
import { useTasasFuentes } from '@/hooks/useTasasFuentes'
import { AvatarDiceBear } from '@/components/AvatarDiceBear'
import { ThemeSelector } from '@/components/ThemeSelector'
import { FadeIn, AnimatedCard, AnimatedButton, AnimatedLoader, AnimatedSelect } from '@/components/animations'
import { User, Mail, Calendar, RefreshCw, Lock, Trash2, Package, HelpCircle, Save, X, AlertTriangle, Loader2, Sparkles, TrendingUp } from 'lucide-react'

export const dynamic = 'force-dynamic';

export default function PerfilPage() {
  const router = useRouter()
  const { data: perfil, isLoading } = usePerfil()
  const { data: fuentes } = useTasasFuentes()
  const { mutateAsync: actualizarPerfil, isPending: isUpdating } = useActualizarPerfil()
  const { mutateAsync: solicitarCambioPassword, isPending: isSendingReset } = useSolicitarCambioPassword()
  const { mutateAsync: eliminarCuenta, isPending: isDeleting } = useEliminarCuenta()

  const [nombreEditado, setNombreEditado] = useState('')
  const [modoEdicion, setModoEdicion] = useState(false)
  const [modalPassword, setModalPassword] = useState(false)
  const [modalEliminar, setModalEliminar] = useState(false)
  const [confirmacionEliminar, setConfirmacionEliminar] = useState('')
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
                  <button
                    onClick={regenerarAvatar}
                    disabled={isUpdating}
                    className="absolute -bottom-1 -right-1 p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-slate-600 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors shadow-sm"
                    title="Regenerar avatar"
                  >
                    <RefreshCw className={`w-4 h-4 ${isUpdating ? 'animate-spin' : ''}`} />
                  </button>
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
                          className="p-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                        >
                          {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => setModoEdicion(false)}
                          className="p-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
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
                          className="text-sm text-primary-600 dark:text-primary-400 hover:underline font-medium"
                        >
                          Editar
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

          {/* Gestión de la cuenta */}
          <FadeIn delay={200}>
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

          {/* Información de la app */}
          <FadeIn delay={300}>
            <AnimatedCard className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Package className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                Información de la app
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
              </div>
            </AnimatedCard>
          </FadeIn>
        </>
      )}

      {/* Modal cambiar contraseña */}
      {modalPassword && (
        <div className="fixed inset-0 bg-slate-900/50 dark:bg-slate-950/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-xl overflow-hidden border border-slate-200 dark:border-slate-800">
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
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-xl overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center p-5 border-b border-red-100 dark:border-red-900/40 bg-red-50 dark:bg-red-900/20">
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
    </div>
  )
}
