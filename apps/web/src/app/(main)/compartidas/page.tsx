'use client'

import { useState, useSyncExternalStore } from 'react'
import {
  useGruposCompartidos,
  useCrearGrupo,
  useUnirseGrupo,
  useDetalleGrupo,
  useResponderPagoGrupal,
  type GrupoCompartido
} from '@/hooks/useGruposCompartidos'
import { useToast } from '@/hooks/useToast'
import {
  Users,
  Plus,
  UserPlus,
  Copy,
  Check,
  X,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  ArrowRightLeft,
  ChevronRight,
  ShieldCheck,
  Share2
} from 'lucide-react'
import {
  FadeIn,
  StaggerContainer,
  AnimatedCard,
  AnimatedButton,
  AnimatedNumber
} from '@/components/animations'
import { ArdillaMascot } from '@/components/ArdillaMascot'

export const dynamic = 'force-dynamic'

export default function CompartidasPage() {
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )

  const { data: grupos, isLoading: loadingGrupos } = useGruposCompartidos()
  const { mutateAsync: crearGrupo, isPending: creatingGrupo } = useCrearGrupo()
  const { mutateAsync: unirseGrupo, isPending: joiningGrupo } = useUnirseGrupo()
  const { mutateAsync: responderPago, isPending: respondingPago } = useResponderPagoGrupal()
  const { success: toastSuccess, error: toastError } = useToast()

  // Selected Group for Detail View
  const [selectedGrupoId, setSelectedGrupoId] = useState<string | null>(null)
  const { data: detalleGrupo, isLoading: loadingDetalle } = useDetalleGrupo(selectedGrupoId || '')

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false)
  const [copiedCode, setCopiedCode] = useState(false)

  // Form states
  const [createForm, setCreateForm] = useState({
    nombre: '',
    descripcion: '',
    moneda: 'USD' as 'USD' | 'VES',
    color: '#10b981'
  })
  const [codigoJoin, setCodigoJoin] = useState('')

  const formatMoney = (amount: number, currency: string) => {
    return new Intl.NumberFormat(currency === 'USD' ? 'en-US' : 'es-VE', {
      style: 'currency',
      currency: currency
    }).format(amount)
  }

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!createForm.nombre) {
      toastError({ title: 'Error', message: 'El nombre del grupo es obligatorio.' })
      return
    }
    try {
      const res = await crearGrupo(createForm)
      toastSuccess({
        title: 'Grupo creado con éxito',
        message: `Código de invitación: ${res.codigo_invitacion}`
      })
      setIsCreateModalOpen(false)
      setCreateForm({ nombre: '', descripcion: '', moneda: 'USD', color: '#10b981' })
      if (res.grupo_id) {
        setSelectedGrupoId(res.grupo_id)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al crear grupo'
      toastError({ title: 'Error', message: msg })
    }
  }

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!codigoJoin) return
    try {
      const res = await unirseGrupo(codigoJoin)
      toastSuccess({
        title: '¡Te uniste al grupo!',
        message: res.nombre_grupo || 'Acceso concedido.'
      })
      setIsJoinModalOpen(false)
      setCodigoJoin('')
      if (res.grupo_id) {
        setSelectedGrupoId(res.grupo_id)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al unirse'
      toastError({ title: 'Error', message: msg })
    }
  }

  const handleCopiarCodigo = async (codigo: string) => {
    try {
      await navigator.clipboard.writeText(codigo)
      setCopiedCode(true)
      setTimeout(() => setCopiedCode(false), 2000)
    } catch {
      // Ignorar
    }
  }

  const handleResponderPago = async (pagoId: string, accion: 'confirmar' | 'rechazar') => {
    try {
      await responderPago({ pagoId, accion })
      toastSuccess({
        title: accion === 'confirmar' ? 'Pago confirmado' : 'Pago rechazado',
        message: accion === 'confirmar' ? 'Las cuentas han sido saldadas.' : 'El pago fue devuelto a estado previo.'
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al procesar pago'
      toastError({ title: 'Error', message: msg })
    }
  }

  // =========================================================================
  // SUBVISTA: DETALLE DE GRUPO SELECCIONADO
  // =========================================================================
  if (selectedGrupoId && detalleGrupo) {
    const { grupo, miembros, gastos, pagos } = detalleGrupo

    return (
      <div className="p-4 md:p-8 space-y-6 max-w-4xl mx-auto pb-24 md:pb-8">
        {/* Header Detalle */}
        <FadeIn as="header" className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedGrupoId(null)}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-400 transition-colors"
              title="Volver a lista de grupos"
            >
              <X className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                {grupo.nombre}
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                {grupo.descripcion || 'Grupo de gastos compartidos'} • {grupo.moneda}
              </p>
            </div>
          </div>

          {/* Código de Invitación con botón Copiar */}
          <button
            onClick={() => handleCopiarCodigo(grupo.codigo_invitacion)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-mono font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors"
            title="Copiar código de invitación"
          >
            <Share2 className="w-3.5 h-3.5 text-primary-600" />
            <span>{grupo.codigo_invitacion}</span>
            {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
          </button>
        </FadeIn>

        {/* Banner Máquina de Estados Bilateral */}
        <FadeIn delay={100}>
          <div className="bg-primary-50/60 dark:bg-primary-950/30 border border-primary-200/60 dark:border-primary-900/40 p-4 rounded-2xl flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-primary-600 dark:text-primary-400 shrink-0 mt-0.5" />
            <p className="text-xs text-primary-800 dark:text-primary-300">
              <strong>Confirmación bilateral activa:</strong> Cuando alguien registra un pago o abono, las cuentas no se consideran saldadas hasta que la persona que recibe el dinero presiona <em>Confirmar</em>.
            </p>
          </div>
        </FadeIn>

        {/* Sección de Pagos Pendientes por Confirmar */}
        {pagos && pagos.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              Pagos y Liquidaciones
            </h2>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 shadow-sm overflow-hidden">
              {pagos.map((pago) => {
                const isPendiente = pago.estado === 'pendiente_confirmacion'
                return (
                  <div key={pago.id} className="p-4 flex items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                          isPendiente
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                            : pago.estado === 'confirmado'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                        }`}>
                          {isPendiente ? 'Pago enviado (Por confirmar)' : pago.estado.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-sm text-slate-700 dark:text-slate-300 font-medium mt-1">
                        Monto: <strong>{formatMoney(pago.monto, pago.moneda)}</strong>
                      </p>
                    </div>

                    {isPendiente && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleResponderPago(pago.id, 'confirmar')}
                          disabled={respondingPago}
                          className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
                        >
                          Confirmar
                        </button>
                        <button
                          onClick={() => handleResponderPago(pago.id, 'rechazar')}
                          disabled={respondingPago}
                          className="px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors border border-red-200 dark:border-red-800/40"
                        >
                          Rechazar
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Miembros del Grupo */}
        <div className="space-y-3">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-primary-600 dark:text-primary-400" />
            Integrantes ({miembros.length})
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {miembros.map((m) => (
              <div key={m.id} className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 font-bold flex items-center justify-center text-xs">
                    {m.nombre_alias.substring(0, 2).toUpperCase()}
                  </div>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                    {m.nombre_alias}
                  </span>
                </div>
                {m.rol === 'admin' && (
                  <span className="text-[10px] uppercase font-bold text-primary-600 bg-primary-50 dark:bg-primary-950/40 px-2 py-0.5 rounded">
                    Admin
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Gastos Registrados */}
        <div className="space-y-3">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Receipt className="w-4 h-4 text-primary-600 dark:text-primary-400" />
            Gastos compartidos
          </h2>

          {gastos.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 text-center text-slate-400 text-sm">
              Sin gastos cargados en este grupo.
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 shadow-sm overflow-hidden">
              {gastos.map((gasto: any) => (
                <div key={gasto.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white text-sm">
                      {gasto.descripcion}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {new Date(gasto.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                  <strong className="text-slate-900 dark:text-white text-base">
                    {formatMoney(gasto.monto_total, gasto.moneda)}
                  </strong>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // =========================================================================
  // VISTA PRINCIPAL: LISTADO DE GRUPOS
  // =========================================================================
  return (
    <div className="p-4 md:p-8 space-y-6 max-w-5xl mx-auto pb-24 md:pb-8">
      {/* Header */}
      <FadeIn as="header" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-7 h-7 text-primary-600 dark:text-primary-400" />
            Cuentas Compartidas
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Divide gastos con amigos, roommates o pareja con confirmación bilateral de pagos
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsJoinModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors shadow-sm"
          >
            <UserPlus className="w-4 h-4 text-primary-600" />
            Unirse por código
          </button>
          <AnimatedButton onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="w-5 h-5" />
            Nuevo grupo
          </AnimatedButton>
        </div>
      </FadeIn>

      {/* Cards de Resumen "TE DEBEN" y "DEBES" (Estilo Chekea) */}
      <FadeIn delay={100}>
        <div className="grid grid-cols-2 gap-4">
          <AnimatedCard className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-[11px] uppercase font-bold tracking-wider text-slate-400">Te deben</span>
            <p className="text-2xl md:text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              $0.00
            </p>
          </AnimatedCard>

          <AnimatedCard className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-[11px] uppercase font-bold tracking-wider text-slate-400">Debes</span>
            <p className="text-2xl md:text-3xl font-black text-slate-800 dark:text-slate-200 mt-1">
              $0.00
            </p>
          </AnimatedCard>
        </div>
      </FadeIn>

      {/* Listado de Grupos */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Mis Grupos</h2>

        {loadingGrupos ? (
          <div className="p-8 text-center text-slate-400">Cargando grupos compartidos...</div>
        ) : !grupos || grupos.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 p-12 rounded-3xl border border-slate-200 dark:border-slate-800 text-center space-y-3 flex flex-col items-center">
            <ArdillaMascot mood="searching" size={80} />
            <h3 className="font-bold text-slate-700 dark:text-slate-200 text-lg">Sin grupos todavía</h3>
            <p className="text-slate-400 text-sm max-w-sm mx-auto">
              Crea un espacio para dividir gastos compartidos o únete al grupo de un amigo mediante su código.
            </p>
          </div>
        ) : (
          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {grupos.map((g: GrupoCompartido) => (
              <AnimatedCard
                key={g.id}
                onClick={() => setSelectedGrupoId(g.id)}
                className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-primary-400 cursor-pointer transition-all flex items-center justify-between"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className="w-12 h-12 rounded-2xl text-white font-bold flex items-center justify-center text-base shrink-0 shadow-sm"
                    style={{ backgroundColor: g.color || '#10b981' }}
                  >
                    {g.nombre.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-slate-900 dark:text-white text-base truncate">
                      {g.nombre}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {g.miembros_grupo?.length || 1} integrante(s) • Código: <span className="font-mono">{g.codigo_invitacion}</span>
                    </p>
                  </div>
                </div>

                <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" />
              </AnimatedCard>
            ))}
          </StaggerContainer>
        )}
      </div>

      {/* MODAL CREAR GRUPO */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                Crear nuevo grupo
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Nombre del grupo
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Apartamento, Viaje a la playa, Salidas..."
                  value={createForm.nombre}
                  onChange={(e) => setCreateForm({ ...createForm, nombre: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Descripción (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Detalles sobre el reparto o propósito"
                  value={createForm.descripcion}
                  onChange={(e) => setCreateForm({ ...createForm, descripcion: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Moneda base
                  </label>
                  <select
                    value={createForm.moneda}
                    onChange={(e) => setCreateForm({ ...createForm, moneda: e.target.value as 'USD' | 'VES' })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="VES">VES (Bs.)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Color
                  </label>
                  <input
                    type="color"
                    value={createForm.color}
                    onChange={(e) => setCreateForm({ ...createForm, color: e.target.value })}
                    className="w-full h-10 rounded-xl cursor-pointer bg-transparent border-0"
                  />
                </div>
              </div>

              <div className="pt-3">
                <AnimatedButton type="submit" disabled={creatingGrupo} className="w-full justify-center">
                  {creatingGrupo ? 'Creando...' : 'Crear grupo'}
                </AnimatedButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL UNIRSE POR CÓDIGO */}
      {isJoinModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-sm shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                Unirse a un grupo
              </h3>
              <button
                onClick={() => setIsJoinModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleJoinSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Código de invitación
                </label>
                <input
                  type="text"
                  required
                  placeholder="APICAS-XXXXXX"
                  value={codigoJoin}
                  onChange={(e) => setCodigoJoin(e.target.value.toUpperCase())}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-center font-mono font-bold tracking-widest text-base uppercase outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <AnimatedButton type="submit" disabled={joiningGrupo} className="w-full justify-center">
                {joiningGrupo ? 'Verificando...' : 'Unirse ahora'}
              </AnimatedButton>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
