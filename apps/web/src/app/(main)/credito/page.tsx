'use client'

import { useState, useSyncExternalStore } from 'react'
import { useComprasCredito, useCrearCompraCredito, type CompraCredito } from '@/hooks/useComprasCredito'
import { useTarjetasCredito, useCrearTarjetaCredito, type TarjetaCredito } from '@/hooks/useTarjetasCredito'
import { useCuentas } from '@/hooks/useCuentas'
import { useCategorias, useTasaActual } from '@/hooks/useAuxiliares'
import { useToast } from '@/hooks/useToast'
import {
  CreditCard,
  Plus,
  Calendar,
  Clock,
  ShoppingBag,
  TrendingUp,
  X,
  CheckCircle2,
  AlertCircle,
  Building2,
  DollarSign,
  ChevronRight,
  ArrowRight
} from 'lucide-react'
import {
  FadeIn,
  StaggerContainer,
  AnimatedCard,
  AnimatedButton,
  AnimatedNumber,
  AnimatedProgressBar,
  AnimatedSelect
} from '@/components/animations'
import {
  generarCronogramaCuotas,
  calcularPagoMinimoTarjeta,
  calcularDisponibleTarjeta,
  type Moneda
} from '@apicash/shared'

export const dynamic = 'force-dynamic'

const BANCOS_VENEZUELA = [
  'Banesco',
  'Banco de Venezuela (BDV)',
  'Mercantil',
  'BBVA Provincial',
  'Bancamiga',
  'Banco Nacional de Crédito (BNC)',
  'Bancaribe',
  'Banco Exterior',
  'Banco del Tesoro',
  'Banco Plaza',
  'Banplus',
  'BFC Banco Fondo Común',
  'Otro banco nacional',
  'Banco Internacional / Extranjero'
]

export default function CreditoPage() {
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )

  const [activeTab, setActiveTab] = useState<'cuotas' | 'tarjetas'>('cuotas')
  const [isCompraModalOpen, setIsCompraModalOpen] = useState(false)
  const [isTarjetaModalOpen, setIsTarjetaModalOpen] = useState(false)

  // Data
  const { data: compras, isLoading: loadingCompras } = useComprasCredito()
  const { data: tarjetas, isLoading: loadingTarjetas } = useTarjetasCredito()
  const { data: cuentas } = useCuentas()
  const { data: categorias } = useCategorias()
  const { data: tasaActual } = useTasaActual()

  // Mutations
  const { mutateAsync: crearCompra, isPending: creatingCompra } = useCrearCompraCredito()
  const { mutateAsync: crearTarjeta, isPending: creatingTarjeta } = useCrearTarjetaCredito()
  const { success: toastSuccess, error: toastError } = useToast()

  // Compra Wizard State (Paso 1 y Paso 2)
  const [compraPaso, setCompraPaso] = useState<1 | 2>(1)
  const [compraForm, setCompraForm] = useState({
    comercio: '',
    descripcion: '',
    categoria_id: '',
    moneda: 'USD' as Moneda,
    monto_total: '',
    monto_inicial: '0',
    numero_cuotas: 3,
    intervalo_dias: 14,
    cuenta_inicial_id: ''
  })

  // Tarjeta Form State
  const [tarjetaForm, setTarjetaForm] = useState({
    nombre: '',
    banco: 'Banesco',
    moneda: 'USD' as Moneda,
    limite_credito: '',
    dia_corte: 15,
    dia_pago: 30,
    pago_minimo_pct: 5.0,
    interes_mensual_pct: 0.0
  })

  const formatMoney = (amount: number, currency: string) => {
    return new Intl.NumberFormat(currency === 'USD' ? 'en-US' : 'es-VE', {
      style: 'currency',
      currency: currency
    }).format(amount)
  }

  // Cálculos resumen cuotas
  const totalPendienteCuotas = compras?.reduce((acc, c) => acc + (c.saldo_pendiente || 0), 0) || 0
  const comprasActivasCount = compras?.filter(c => c.estado === 'activa').length || 0

  // Cuotas pendientes consolidadas
  const todasLasCuotas = (compras || [])
    .flatMap(compra => (compra.cuotas_compra || []).map(cuota => ({ ...cuota, compra })))
    .filter(c => c.estado === 'pendiente')
    .sort((a, b) => new Date(a.fecha_vencimiento).getTime() - new Date(b.fecha_vencimiento).getTime())

  // Cálculos resumen tarjetas
  const totalDeudaTarjetas = tarjetas?.reduce((acc, t) => acc + (t.saldo_deuda || 0), 0) || 0
  const totalLimiteTarjetas = tarjetas?.reduce((acc, t) => acc + (t.limite_credito || 0), 0) || 0
  const totalDisponibleTarjetas = Math.max(0, totalLimiteTarjetas - totalDeudaTarjetas)

  // Handlers para Compra Wizard
  const handlePaso1Siguiente = (e: React.FormEvent) => {
    e.preventDefault()
    if (!compraForm.comercio || !compraForm.descripcion || !compraForm.monto_total || Number(compraForm.monto_total) <= 0) {
      toastError({ title: 'Datos incompletos', message: 'Indica el comercio, qué compraste y un monto válido.' })
      return
    }
    setCompraPaso(2)
  }

  const handleCrearCompraSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await crearCompra({
        comercio: compraForm.comercio,
        descripcion: compraForm.descripcion,
        categoria_id: compraForm.categoria_id || null,
        moneda: compraForm.moneda,
        monto_total: Number(compraForm.monto_total),
        monto_inicial: Number(compraForm.monto_inicial) || 0,
        numero_cuotas: Number(compraForm.numero_cuotas),
        intervalo_dias: Number(compraForm.intervalo_dias),
        cuenta_inicial_id: compraForm.cuenta_inicial_id || null,
        tasa_al_momento: tasaActual || null
      })
      toastSuccess({
        title: 'Compra a crédito registrada',
        message: 'El plan de cuotas y amortización quedó programado.'
      })
      setIsCompraModalOpen(false)
      setCompraPaso(1)
      setCompraForm({
        comercio: '',
        descripcion: '',
        categoria_id: '',
        moneda: 'USD',
        monto_total: '',
        monto_inicial: '0',
        numero_cuotas: 3,
        intervalo_dias: 14,
        cuenta_inicial_id: ''
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al registrar'
      toastError({ title: 'Error', message: msg })
    }
  }

  // Handlers para Tarjeta
  const handleCrearTarjetaSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tarjetaForm.nombre || !tarjetaForm.limite_credito || Number(tarjetaForm.limite_credito) <= 0) {
      toastError({ title: 'Datos inválidos', message: 'Indica el nombre de la tarjeta y su límite de crédito.' })
      return
    }
    try {
      await crearTarjeta({
        nombre: tarjetaForm.nombre,
        banco: tarjetaForm.banco || null,
        moneda: tarjetaForm.moneda,
        limite_credito: Number(tarjetaForm.limite_credito),
        dia_corte: Number(tarjetaForm.dia_corte),
        dia_pago: Number(tarjetaForm.dia_pago),
        pago_minimo_pct: Number(tarjetaForm.pago_minimo_pct),
        interes_mensual_pct: Number(tarjetaForm.interes_mensual_pct)
      })
      toastSuccess({
        title: 'Tarjeta de crédito agregada',
        message: 'Tu línea de crédito ya está disponible para compras y pagos.'
      })
      setIsTarjetaModalOpen(false)
      setTarjetaForm({
        nombre: '',
        banco: 'Banesco',
        moneda: 'USD',
        limite_credito: '',
        dia_corte: 15,
        dia_pago: 30,
        pago_minimo_pct: 5.0,
        interes_mensual_pct: 0.0
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al registrar tarjeta'
      toastError({ title: 'Error', message: msg })
    }
  }

  // Previsualización de cuotas en Paso 2
  let planPrevisualizado = null
  if (compraForm.monto_total && Number(compraForm.monto_total) > 0) {
    try {
      const inicial = Number(compraForm.monto_inicial) || 0
      if (inicial < Number(compraForm.monto_total)) {
        planPrevisualizado = generarCronogramaCuotas(
          Number(compraForm.monto_total),
          inicial,
          Number(compraForm.numero_cuotas),
          new Date(),
          Number(compraForm.intervalo_dias)
        )
      }
    } catch {
      // Ignorar preview si montos inválidos
    }
  }

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto pb-24 md:pb-8">
      {/* Header */}
      <FadeIn as="header" className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CreditCard className="w-7 h-7 text-primary-600 dark:text-primary-400" />
            Compras a Crédito y Tarjetas
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Financiamiento en cuotas (Cashea/Krece) y control de líneas de crédito
          </p>
        </div>

        <div className="flex items-center gap-3">
          {activeTab === 'cuotas' ? (
            <AnimatedButton onClick={() => { setCompraPaso(1); setIsCompraModalOpen(true); }}>
              <Plus className="w-5 h-5" />
              Nueva compra a crédito
            </AnimatedButton>
          ) : (
            <AnimatedButton onClick={() => setIsTarjetaModalOpen(true)}>
              <Plus className="w-5 h-5" />
              Nueva tarjeta
            </AnimatedButton>
          )}
        </div>
      </FadeIn>

      {/* Tabs Selector (Estilo Chekea Pestaña 1 de 2) */}
      <FadeIn delay={100}>
        <div className="bg-slate-200/60 dark:bg-slate-800/60 p-1.5 rounded-2xl flex max-w-md gap-1.5 border border-slate-200/50 dark:border-slate-800">
          <button
            onClick={() => setActiveTab('cuotas')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'cuotas'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Clock className="w-4 h-4 text-primary-600 dark:text-primary-400" />
            Cuotas ({comprasActivasCount})
          </button>
          <button
            onClick={() => setActiveTab('tarjetas')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'tarjetas'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <CreditCard className="w-4 h-4 text-primary-600 dark:text-primary-400" />
            Tarjetas ({tarjetas?.length || 0})
          </button>
        </div>
      </FadeIn>

      {/* ========================================================================= */}
      {/* VISTA 1: CUOTAS (COMPRAS FINANCIADAS TIPO CASHEA)                          */}
      {/* ========================================================================= */}
      {activeTab === 'cuotas' && (
        <div className="space-y-6">
          {/* Métricas Superiores */}
          <FadeIn delay={150}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <AnimatedCard className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  Saldo pendiente total
                </span>
                <p className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
                  <AnimatedNumber value={totalPendienteCuotas} formatter={(v) => formatMoney(v, 'USD')} />
                </p>
                {tasaActual && tasaActual > 0 && (
                  <p className="text-xs text-slate-400 mt-1">
                    ≈ {formatMoney(totalPendienteCuotas * tasaActual, 'VES')}
                  </p>
                )}
              </AnimatedCard>

              <AnimatedCard className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  Cuotas por vencer
                </span>
                <p className="text-3xl font-extrabold text-primary-600 dark:text-primary-400 mt-1">
                  {todasLasCuotas.length}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  En compras financiadas activas
                </p>
              </AnimatedCard>

              <AnimatedCard className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  Compras activas
                </span>
                <p className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
                  {comprasActivasCount}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Con inicial y cronogramas quincenales
                </p>
              </AnimatedCard>
            </div>
          </FadeIn>

          {/* Listado de Compras Activas */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              Compras a crédito activas
            </h2>

            {loadingCompras ? (
              <div className="p-8 text-center text-slate-400">Cargando compras a crédito...</div>
            ) : !compras || compras.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 text-center">
                <p className="text-slate-500 dark:text-slate-400">No tienes compras a crédito registradas.</p>
                <button
                  onClick={() => { setCompraPaso(1); setIsCompraModalOpen(true); }}
                  className="mt-3 text-sm font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400"
                >
                  + Agregar tu primera compra financiada
                </button>
              </div>
            ) : (
              <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {compras.map((compra: CompraCredito) => {
                  const pagadas = (compra.cuotas_compra || []).filter(c => c.estado === 'pagada').length
                  const totalCuotas = compra.numero_cuotas || 3
                  const montoPagado = compra.monto_total - compra.saldo_pendiente
                  const porcentajePagado = compra.monto_total > 0 ? (montoPagado / compra.monto_total) * 100 : 0
                  const proximaCuota = (compra.cuotas_compra || []).find(c => c.estado === 'pendiente')

                  return (
                    <AnimatedCard
                      key={compra.id}
                      className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300">
                            {compra.comercio}
                          </span>
                          <h3 className="font-bold text-slate-900 dark:text-white text-base mt-1">
                            {compra.descripcion}
                          </h3>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-extrabold text-slate-900 dark:text-white">
                            {formatMoney(compra.monto_total, compra.moneda)}
                          </p>
                          <p className="text-xs text-slate-400">
                            Inicial: {formatMoney(compra.monto_inicial, compra.moneda)}
                          </p>
                        </div>
                      </div>

                      {/* Progreso */}
                      <div>
                        <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                          <span>{pagadas} de {totalCuotas} cuotas pagadas</span>
                          <span className="font-semibold">{Math.round(porcentajePagado)}%</span>
                        </div>
                        <AnimatedProgressBar progress={porcentajePagado} />
                      </div>

                      {/* Próximo vencimiento */}
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                        <span>Pendiente: <strong className="text-slate-800 dark:text-slate-200">{formatMoney(compra.saldo_pendiente, compra.moneda)}</strong></span>
                        {proximaCuota ? (
                          <span className="text-primary-600 dark:text-primary-400 font-medium">
                            Próx. vencimiento: {new Date(proximaCuota.fecha_vencimiento).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                          </span>
                        ) : (
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">¡Completada!</span>
                        )}
                      </div>
                    </AnimatedCard>
                  )
                })}
              </StaggerContainer>
            )}
          </div>

          {/* Próximos Pagos (Cronograma) */}
          {todasLasCuotas.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                Próximos pagos quincenales / mensuales
              </h2>

              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 shadow-sm overflow-hidden">
                {todasLasCuotas.slice(0, 8).map((c, i) => {
                  const fecha = new Date(c.fecha_vencimiento)
                  const hoy = new Date()
                  const diffTime = fecha.getTime() - hoy.getTime()
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

                  return (
                    <div key={i} className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300 font-bold flex flex-col items-center justify-center shrink-0 text-xs">
                          <span>{fecha.toLocaleDateString('es-ES', { day: 'numeric' })}</span>
                          <span className="uppercase text-[9px]">{fecha.toLocaleDateString('es-ES', { month: 'short' })}</span>
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white text-sm">
                            {c.compra.comercio} • {c.compra.descripcion}
                          </p>
                          <p className="text-xs text-slate-400">
                            Cuota {c.numero_cuota} de {c.compra.numero_cuotas} • {diffDays > 0 ? `en ${diffDays} días` : 'Vence hoy o vencida'}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="font-bold text-slate-900 dark:text-white text-sm">
                          {formatMoney(c.monto, c.compra.moneda)}
                        </p>
                        {tasaActual && c.compra.moneda === 'USD' && (
                          <p className="text-[11px] text-slate-400">
                            ≈ {formatMoney(c.monto * tasaActual, 'VES')}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* VISTA 2: TARJETAS DE CRÉDITO (DEUDA REVOLVENTE Y DISPONIBLE)               */}
      {/* ========================================================================= */}
      {activeTab === 'tarjetas' && (
        <div className="space-y-6">
          {/* Métricas Superiores */}
          <FadeIn delay={150}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <AnimatedCard className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  Deuda total en tarjetas
                </span>
                <p className="text-3xl font-extrabold text-red-600 dark:text-red-400 mt-1">
                  <AnimatedNumber value={totalDeudaTarjetas} formatter={(v) => formatMoney(v, 'USD')} />
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Pasivo acumulado por consumos
                </p>
              </AnimatedCard>

              <AnimatedCard className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  Crédito disponible total
                </span>
                <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                  <AnimatedNumber value={totalDisponibleTarjetas} formatter={(v) => formatMoney(v, 'USD')} />
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  De {formatMoney(totalLimiteTarjetas, 'USD')} de cupo
                </p>
              </AnimatedCard>

              <AnimatedCard className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  Tarjetas activas
                </span>
                <p className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
                  {tarjetas?.length || 0}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Líneas de crédito vinculadas
                </p>
              </AnimatedCard>
            </div>
          </FadeIn>

          {/* Grid de Tarjetas de Crédito */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              Tus tarjetas de crédito
            </h2>

            {loadingTarjetas ? (
              <div className="p-8 text-center text-slate-400">Cargando tarjetas...</div>
            ) : !tarjetas || tarjetas.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 text-center">
                <p className="text-slate-500 dark:text-slate-400">Aún no tienes tarjetas de crédito vinculadas.</p>
                <button
                  onClick={() => setIsTarjetaModalOpen(true)}
                  className="mt-3 text-sm font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400"
                >
                  + Agregar tu primera tarjeta
                </button>
              </div>
            ) : (
              <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tarjetas.map((tarjeta: TarjetaCredito) => {
                  const disponible = calcularDisponibleTarjeta(tarjeta.limite_credito, tarjeta.saldo_deuda)
                  const pctUsado = tarjeta.limite_credito > 0 ? (tarjeta.saldo_deuda / tarjeta.limite_credito) * 100 : 0
                  const pagoMinimo = calcularPagoMinimoTarjeta(tarjeta.saldo_deuda, tarjeta.pago_minimo_pct)

                  return (
                    <AnimatedCard
                      key={tarjeta.id}
                      className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6 rounded-3xl shadow-lg border border-slate-700/60 flex flex-col justify-between min-h-[220px]"
                    >
                      <div>
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-xs uppercase font-medium text-slate-400">
                              {tarjeta.banco || 'Tarjeta de crédito'}
                            </span>
                            <h3 className="text-lg font-bold text-white tracking-wide mt-0.5">
                              {tarjeta.nombre}
                            </h3>
                          </div>
                          <span className="text-xs px-2.5 py-1 rounded-full bg-slate-700/80 text-slate-200 font-semibold border border-slate-600">
                            {tarjeta.moneda}
                          </span>
                        </div>

                        {/* Deuda y Disponible */}
                        <div className="mt-5 grid grid-cols-2 gap-4">
                          <div>
                            <span className="text-[11px] uppercase tracking-wider text-slate-400">Deuda actual</span>
                            <p className="text-xl font-extrabold text-red-400 mt-0.5">
                              {formatMoney(tarjeta.saldo_deuda, tarjeta.moneda)}
                            </p>
                          </div>
                          <div>
                            <span className="text-[11px] uppercase tracking-wider text-slate-400">Disponible</span>
                            <p className="text-xl font-extrabold text-emerald-400 mt-0.5">
                              {formatMoney(disponible, tarjeta.moneda)}
                            </p>
                          </div>
                        </div>

                        {/* Barra de progreso de uso de cupo */}
                        <div className="mt-4">
                          <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                            <span>{Math.round(pctUsado)}% de cupo usado</span>
                            <span>Límite: {formatMoney(tarjeta.limite_credito, tarjeta.moneda)}</span>
                          </div>
                          <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full transition-all duration-500 ${
                                pctUsado > 80 ? 'bg-red-500' : pctUsado > 50 ? 'bg-amber-400' : 'bg-primary-500'
                              }`}
                              style={{ width: `${Math.min(100, pctUsado)}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Footer con fecha de corte y pago mínimo */}
                      <div className="mt-5 pt-4 border-t border-slate-700/60 flex items-center justify-between text-xs text-slate-300">
                        <div>
                          <span>Corte: día {tarjeta.dia_corte} • Pago: día {tarjeta.dia_pago}</span>
                          {pagoMinimo > 0 && (
                            <p className="text-[11px] text-amber-300 font-medium mt-0.5">
                              Mínimo: {formatMoney(pagoMinimo, tarjeta.moneda)} ({tarjeta.pago_minimo_pct}%)
                            </p>
                          )}
                        </div>
                      </div>
                    </AnimatedCard>
                  )
                })}
              </StaggerContainer>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: NUEVA COMPRA A CRÉDITO (WIZARD DE 2 PASOS TIPO CHEKEA/CASHEA)    */}
      {/* ========================================================================= */}
      {isCompraModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            {/* Header Wizard */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
              <div>
                <span className="text-xs font-bold text-primary-600 dark:text-primary-400 uppercase tracking-wider">
                  Paso {compraPaso} de 2
                </span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                  {compraPaso === 1 ? '¿Cuánto es la compra?' : 'Revisa y confirma'}
                </h3>
              </div>
              <button
                onClick={() => setIsCompraModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* PASO 1 */}
            {compraPaso === 1 && (
              <form onSubmit={handlePaso1Siguiente} className="p-6 space-y-5">
                {/* Monto Grande Central con Switch Moneda */}
                <div className="text-center py-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <div className="inline-flex p-1 bg-slate-200 dark:bg-slate-700 rounded-xl mb-3">
                    <button
                      type="button"
                      onClick={() => setCompraForm({ ...compraForm, moneda: 'USD' })}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                        compraForm.moneda === 'USD' ? 'bg-white dark:bg-slate-900 text-primary-600 shadow-sm' : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      USD ($)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCompraForm({ ...compraForm, moneda: 'VES' })}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                        compraForm.moneda === 'VES' ? 'bg-white dark:bg-slate-900 text-primary-600 shadow-sm' : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      VES (Bs.)
                    </button>
                  </div>

                  <div className="flex items-center justify-center gap-1">
                    <span className="text-3xl font-extrabold text-slate-400">
                      {compraForm.moneda === 'USD' ? '$' : 'Bs.'}
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="0.00"
                      value={compraForm.monto_total}
                      onChange={(e) => setCompraForm({ ...compraForm, monto_total: e.target.value })}
                      className="text-4xl font-extrabold text-slate-900 dark:text-white bg-transparent outline-none w-48 text-center"
                    />
                  </div>
                </div>

                {/* Campos Comercio y Descripción */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                      ¿Dónde compraste? (Comercio / Tienda)
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Tienda Cashea, Daka, Traki..."
                      value={compraForm.comercio}
                      onChange={(e) => setCompraForm({ ...compraForm, comercio: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                      ¿Qué compraste? (Concepto)
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Zapatos deportivos, Teléfono..."
                      value={compraForm.descripcion}
                      onChange={(e) => setCompraForm({ ...compraForm, descripcion: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                      Categoría
                    </label>
                    <AnimatedSelect
                      value={compraForm.categoria_id}
                      onChange={(v) => setCompraForm({ ...compraForm, categoria_id: v })}
                      options={[
                        { value: '', label: 'Sin categoría' },
                        ...(categorias || []).map(cat => ({ value: cat.id, label: `${cat.icono} ${cat.nombre}` }))
                      ]}
                      placeholder="Seleccionar categoría"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <AnimatedButton type="submit" className="w-full justify-center">
                    Continuar a Cuotas
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </AnimatedButton>
                </div>
              </form>
            )}

            {/* PASO 2 */}
            {compraPaso === 2 && (
              <form onSubmit={handleCrearCompraSubmit} className="p-6 space-y-5">
                {/* Resumen Precio y Saldo a Financiar */}
                <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Precio total de compra:</span>
                    <strong className="text-slate-900 dark:text-white">
                      {formatMoney(Number(compraForm.monto_total) || 0, compraForm.moneda)}
                    </strong>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Saldo a financiar:</span>
                    <strong className="text-primary-600 dark:text-primary-400 font-bold">
                      {formatMoney(
                        Math.max(0, (Number(compraForm.monto_total) || 0) - (Number(compraForm.monto_inicial) || 0)),
                        compraForm.moneda
                      )}
                    </strong>
                  </div>
                </div>

                {/* Inicial */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                      Inicial pagada hoy ({compraForm.moneda})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max={Number(compraForm.monto_total) - 0.01}
                      value={compraForm.monto_inicial}
                      onChange={(e) => setCompraForm({ ...compraForm, monto_inicial: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none"
                    />
                  </div>

                  {Number(compraForm.monto_inicial) > 0 && (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                        Debitar inicial desde
                      </label>
                      <AnimatedSelect
                        value={compraForm.cuenta_inicial_id}
                        onChange={(v) => setCompraForm({ ...compraForm, cuenta_inicial_id: v })}
                        options={[
                          { value: '', label: 'Seleccionar cuenta...' },
                          ...(cuentas || []).filter(c => c.activa).map(c => ({
                            value: c.id,
                            label: `${c.nombre} (${c.moneda} - Saldo: ${formatMoney(c.saldo_cache, c.moneda)})`
                          }))
                        ]}
                      />
                    </div>
                  )}
                </div>

                {/* Configuración de Cuotas */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                      Número de cuotas
                    </label>
                    <select
                      value={compraForm.numero_cuotas}
                      onChange={(e) => setCompraForm({ ...compraForm, numero_cuotas: Number(e.target.value) })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none"
                    >
                      <option value={2}>2 cuotas</option>
                      <option value={3}>3 cuotas (Cashea clásico)</option>
                      <option value={4}>4 cuotas</option>
                      <option value={6}>6 cuotas</option>
                      <option value={12}>12 cuotas</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                      Frecuencia
                    </label>
                    <select
                      value={compraForm.intervalo_dias}
                      onChange={(e) => setCompraForm({ ...compraForm, intervalo_dias: Number(e.target.value) })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none"
                    >
                      <option value={14}>Cada 14 días (Quincenal)</option>
                      <option value={30}>Cada 30 días (Mensual)</option>
                    </select>
                  </div>
                </div>

                {/* Previsualización del Plan */}
                {planPrevisualizado && (
                  <div className="bg-primary-50 dark:bg-primary-950/30 border border-primary-200 dark:border-primary-900/40 p-4 rounded-2xl text-center space-y-1">
                    <span className="text-xs font-semibold text-primary-700 dark:text-primary-300 uppercase tracking-wider">
                      {compraForm.numero_cuotas} cuotas calculadas de
                    </span>
                    <p className="text-2xl font-black text-primary-900 dark:text-primary-200">
                      {formatMoney(planPrevisualizado.cuotas[0]?.monto || 0, compraForm.moneda)}
                    </p>
                    <p className="text-[11px] text-primary-600 dark:text-primary-400">
                      Primera cuota vencerá el {new Date(planPrevisualizado.cuotas[0]?.fechaVencimiento).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setCompraPaso(1)}
                    className="flex-1 py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-sm"
                  >
                    Atrás
                  </button>
                  <AnimatedButton type="submit" disabled={creatingCompra} className="flex-1 justify-center">
                    {creatingCompra ? 'Guardando...' : 'Confirmar y Guardar'}
                  </AnimatedButton>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: NUEVA TARJETA DE CRÉDITO                                          */}
      {/* ========================================================================= */}
      {isTarjetaModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                Agregar tarjeta de crédito
              </h3>
              <button
                onClick={() => setIsTarjetaModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCrearTarjetaSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Nombre de la tarjeta
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Banesco Master, Mercantil Visa..."
                  value={tarjetaForm.nombre}
                  onChange={(e) => setTarjetaForm({ ...tarjetaForm, nombre: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Banco emisor
                </label>
                <select
                  value={tarjetaForm.banco}
                  onChange={(e) => setTarjetaForm({ ...tarjetaForm, banco: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none"
                >
                  {BANCOS_VENEZUELA.map((banco) => (
                    <option key={banco} value={banco}>
                      {banco}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Límite de crédito
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    placeholder="500.00"
                    value={tarjetaForm.limite_credito}
                    onChange={(e) => setTarjetaForm({ ...tarjetaForm, limite_credito: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Moneda
                  </label>
                  <select
                    value={tarjetaForm.moneda}
                    onChange={(e) => setTarjetaForm({ ...tarjetaForm, moneda: e.target.value as Moneda })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="VES">VES (Bs.)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Día de corte
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    required
                    value={tarjetaForm.dia_corte}
                    onChange={(e) => setTarjetaForm({ ...tarjetaForm, dia_corte: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Día de pago
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    required
                    value={tarjetaForm.dia_pago}
                    onChange={(e) => setTarjetaForm({ ...tarjetaForm, dia_pago: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Pago mínimo (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={tarjetaForm.pago_minimo_pct}
                    onChange={(e) => setTarjetaForm({ ...tarjetaForm, pago_minimo_pct: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Interés mensual (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={tarjetaForm.interes_mensual_pct}
                    onChange={(e) => setTarjetaForm({ ...tarjetaForm, interes_mensual_pct: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none"
                  />
                </div>
              </div>

              <div className="pt-3">
                <AnimatedButton type="submit" disabled={creatingTarjeta} className="w-full justify-center">
                  {creatingTarjeta ? 'Guardando...' : 'Guardar tarjeta'}
                </AnimatedButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
