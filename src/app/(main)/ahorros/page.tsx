'use client'

import { useState } from 'react'
import { useMetas, useCrearMeta, useAgregarAporte, useEliminarMeta, useRetirarAhorro, Meta } from '@/hooks/useMetas'
import { useCuentas } from '@/hooks/useCuentas'
import { useTasaActual } from '@/hooks/useAuxiliares'
import { useToast } from '@/hooks/useToast'
import { PiggyBank, Plus, X, Loader2, ArrowUpCircle, Trash2, ArrowDownCircle } from 'lucide-react'
import { FadeIn, StaggerContainer, AnimatedCard, AnimatedButton, AnimatedLoader, AnimatedNumber, AnimatedProgressBar, AnimatedSelect, AnimatedDatePicker } from '@/components/animations'

export const dynamic = 'force-dynamic';

export default function AhorrosPage() {
  const { data: metas, isLoading } = useMetas()
  const { data: cuentas } = useCuentas()
  const { data: tasaActual } = useTasaActual()
  
  const { mutateAsync: crearMeta } = useCrearMeta()
  const { mutateAsync: agregarAporte } = useAgregarAporte()
  const { mutateAsync: eliminarMeta } = useEliminarMeta()
  const { mutateAsync: retirarAhorro } = useRetirarAhorro()

  const { error: toastError, warning: toastWarning } = useToast()

  const [modalMode, setModalMode] = useState<'create' | 'aporte' | 'retiro' | null>(null)
  const [metaActual, setMetaActual] = useState<Meta | null>(null)
  
  const [formData, setFormData] = useState({
    nombre: '',
    monto_objetivo: '',
    moneda: 'USD',
    fecha_objetivo: ''
  })
  const [sinMetaFija, setSinMetaFija] = useState(false)
  
  const [aporteData, setAporteData] = useState({
    cuenta_id: '',
    monto: '',
    esFuenteExterna: false
  })

  const [retiroData, setRetiroData] = useState({
    cuenta_id: '',
    monto: '',
    descripcion: ''
  })

  const openCreate = () => {
    setFormData({ nombre: '', monto_objetivo: '', moneda: 'USD', fecha_objetivo: '' })
    setSinMetaFija(false)
    setModalMode('create')
  }

  const openAporte = (meta: Meta) => {
    setMetaActual(meta)
    setAporteData({ 
      cuenta_id: cuentas?.find(c => c.activa)?.id || '', 
      monto: '',
      esFuenteExterna: false
    })
    setModalMode('aporte')
  }

  const openRetiro = (meta: Meta) => {
    setMetaActual(meta)
    setRetiroData({
      cuenta_id: cuentas?.find(c => c.activa)?.id || '',
      monto: '',
      descripcion: ''
    })
    setModalMode('retiro')
  }

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setModalMode(null)
    try {
      await crearMeta({
        nombre: formData.nombre,
        monto_objetivo: sinMetaFija ? null : Number(formData.monto_objetivo),
        moneda: formData.moneda,
        fecha_objetivo: formData.fecha_objetivo || null
      })
    } catch {
      toastError({ title: 'Error al crear', message: 'No se pudo crear la meta de ahorro.' })
    }
  }

  const handleAporteSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!metaActual) return

    let cuenta = null;
    if (!aporteData.esFuenteExterna) {
      cuenta = cuentas?.find(c => c.id === aporteData.cuenta_id)
      if (!cuenta) {
        toastWarning({ title: 'Cuenta requerida', message: 'Seleccione una cuenta origen.' })
        return
      }
    }

    try {
      setModalMode(null)
      await agregarAporte({
        meta_id: metaActual.id,
        cuenta_id: aporteData.esFuenteExterna ? null : cuenta!.id,
        monto: Number(aporteData.monto),
        moneda_cuenta: aporteData.esFuenteExterna ? metaActual.moneda : cuenta!.moneda,
        fecha: new Date()
      })
    } catch (err) {
      toastError({ title: 'Error al registrar aporte', message: err instanceof Error ? err.message : 'No se pudo registrar el aporte.' })
    }
  }

  const calcularMaximoRetirable = (meta: Meta, cuentaMoneda: string) => {
    const montoActual = meta.monto_actual || 0
    if (!tasaActual || tasaActual <= 0 || meta.moneda === cuentaMoneda) {
      return montoActual
    }
    if (meta.moneda === 'USD' && cuentaMoneda === 'VES') {
      return montoActual * tasaActual
    }
    if (meta.moneda === 'VES' && cuentaMoneda === 'USD') {
      return montoActual / tasaActual
    }
    return montoActual
  }

  const handleRetiroSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!metaActual) return

    const cuenta = cuentas?.find(c => c.id === retiroData.cuenta_id)
    if (!cuenta) {
      toastWarning({ title: 'Cuenta requerida', message: 'Seleccione una cuenta destino.' })
      return
    }

    const monto = Number(retiroData.monto)
    if (!monto || monto <= 0) {
      toastWarning({ title: 'Monto inválido', message: 'Ingrese un monto válido.' })
      return
    }

    const maximoRetirable = calcularMaximoRetirable(metaActual, cuenta.moneda)
    if (monto > maximoRetirable + 0.001) {
      toastWarning({ title: 'Monto excedido', message: `El máximo retirable es ${formatMoney(maximoRetirable, cuenta.moneda)}.` })
      return
    }

    try {
      setModalMode(null)
      await retirarAhorro({
        meta_id: metaActual.id,
        cuenta_id: cuenta.id,
        monto: monto,
        moneda_cuenta: cuenta.moneda,
        fecha: new Date(),
        descripcion: retiroData.descripcion.trim() || undefined
      })
    } catch (err) {
      toastError({ title: 'Error al retirar', message: err instanceof Error ? err.message : 'No se pudo registrar el retiro.' })
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('¿Confirma la eliminación de esta meta? Esta acción no se puede deshacer.')) {
      try {
        await eliminarMeta(id)
      } catch (err) {
        toastError({ title: 'Error al eliminar', message: err instanceof Error ? err.message : 'No se pudo eliminar la meta.' })
      }
    }
  }

  const formatMoney = (val: number, mon: string) => new Intl.NumberFormat(mon === 'USD' ? 'en-US' : 'es-VE', { style: 'currency', currency: mon }).format(val)

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-5xl mx-auto pb-24 md:pb-8">
      <FadeIn as="header" className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Metas de Ahorro</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Registro y seguimiento del progreso hacia sus objetivos</p>
        </div>
        <AnimatedButton onClick={openCreate}>
          <Plus className="w-5 h-5" />
          Nueva Meta
        </AnimatedButton>
      </FadeIn>

      {isLoading ? (
        <div className="flex justify-center p-12"><AnimatedLoader size={40} color="#10b981" /></div>
      ) : metas?.length === 0 ? (
        <FadeIn>
          <AnimatedCard className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center text-slate-500 dark:text-slate-400 shadow-sm flex flex-col items-center cursor-default">
            <PiggyBank className="w-16 h-16 text-slate-300 dark:text-slate-600 mb-4" />
            <p className="text-lg font-medium text-slate-900 dark:text-slate-200">No hay metas de ahorro</p>
            <p className="text-sm mt-1 mb-6">Establece un objetivo para empezar a ahorrar.</p>
          </AnimatedCard>
        </FadeIn>
      ) : (
        <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 gap-6" staggerDelay={120}>
          {metas?.map(meta => {
            const tieneObjetivo = meta.monto_objetivo !== null && meta.monto_objetivo > 0
            const progreso = tieneObjetivo ? Math.min((meta.monto_actual / meta.monto_objetivo!) * 100, 100) : 0
            const completado = tieneObjetivo ? progreso >= 100 : false
            const puedeRetirar = (meta.monto_actual || 0) > 0

            return (
              <AnimatedCard
                data-anime
                key={meta.id}
                className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 flex flex-col justify-between cursor-default group relative"
              >
                <button
                  onClick={() => handleDelete(meta.id)}
                  className="absolute top-4 right-4 p-2 text-slate-300 dark:text-slate-600 hover:text-red-600 dark:hover:text-red-400 transition-all z-10"
                  title="Eliminar meta"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
                <div>
                  <div className="flex justify-between items-start mb-4 pr-8 gap-2">
                    <div className="min-w-0">
                      <h3 className="font-bold text-lg text-slate-900 dark:text-slate-200 truncate">{meta.nombre}</h3>
                      {meta.fecha_objetivo && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Objetivo: {new Date(meta.fecha_objetivo).toLocaleDateString()}</p>
                      )}
                    </div>
                    {tieneObjetivo ? (
                      <div className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-bold px-3 py-1 rounded-full text-sm shrink-0">
                        {Math.round(progreso)}%
                      </div>
                    ) : (
                      <div className="bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 font-bold px-3 py-1 rounded-full text-sm shrink-0">
                        Ahorro Libre
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row justify-between text-sm mb-2 gap-1">
                    <span className="text-slate-600 dark:text-slate-300 font-medium">
                      {tieneObjetivo ? (
                        <AnimatedNumber value={meta.monto_actual} formatter={(v) => formatMoney(v, meta.moneda)} duration={1000} />
                      ) : (
                        <>Total ahorrado: <AnimatedNumber value={meta.monto_actual} formatter={(v) => formatMoney(v, meta.moneda)} duration={1000} /></>
                      )}
                    </span>
                    {tieneObjetivo && (
                      <span className="text-slate-400 dark:text-slate-500">
                        / <AnimatedNumber value={meta.monto_objetivo!} formatter={(v) => formatMoney(v, meta.moneda)} duration={1000} delay={100} />
                      </span>
                    )}
                  </div>

                  {tieneObjetivo ? (
                    <AnimatedProgressBar
                      progress={progreso}
                      color={completado ? 'bg-primary-500 dark:bg-primary-400' : 'bg-blue-500 dark:bg-blue-400'}
                      height={16}
                      duration={1200}
                      className="mb-6"
                    />
                  ) : (
                    <div className="mb-6" />
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={() => openAporte(meta)}
                    disabled={completado}
                    className={`flex-1 py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors ${
                      completado
                      ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 cursor-default'
                      : 'bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    {completado ? (
                      '¡Meta Completada!'
                    ) : (
                      <>
                        <ArrowUpCircle className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                        Agregar Aporte
                      </>
                    )}
                  </button>

                  {puedeRetirar && (
                    <button
                      onClick={() => openRetiro(meta)}
                      className="flex-1 py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-900/40 text-orange-700 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/30"
                    >
                      <ArrowDownCircle className="w-5 h-5" />
                      Retirar
                    </button>
                  )}
                </div>
              </AnimatedCard>
            )
          })}
        </StaggerContainer>
      )}

      {/* Modal Crear Meta */}
      {modalMode === 'create' && (
        <div className="fixed inset-0 bg-slate-900/50 dark:bg-slate-950/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm transition-all">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-xl overflow-visible border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center p-5 border-b border-slate-100 dark:border-slate-800/60">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Nueva Meta de Ahorro</h2>
              <button onClick={() => setModalMode(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateSubmit} className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Nombre de la meta</label>
                <input required type="text" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} className="w-full px-4 py-2 border dark:border-slate-700 rounded-lg focus:ring-2 outline-none bg-transparent text-slate-900 dark:text-slate-100 transition-colors" placeholder="Ej: Viaje, Fondo de Emergencia" />
              </div>
              <div className="grid grid-cols-1 gap-4">
                <div className="flex items-center gap-2 mt-2 mb-2">
                  <input 
                    type="checkbox" 
                    id="sinMetaFija"
                    checked={sinMetaFija} 
                    onChange={e => setSinMetaFija(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                  />
                  <label htmlFor="sinMetaFija" className="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                    Sin monto objetivo (ahorro libre)
                  </label>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className={`text-sm font-medium ${sinMetaFija ? 'text-slate-400 dark:text-slate-600' : 'text-slate-700 dark:text-slate-300'}`}>Objetivo</label>
                  <input required={!sinMetaFija} disabled={sinMetaFija} type="number" step="0.01" min="1" value={formData.monto_objetivo} onChange={e => setFormData({...formData, monto_objetivo: e.target.value})} className="w-full px-4 py-2 font-bold border dark:border-slate-700 rounded-lg outline-none bg-transparent text-slate-900 dark:text-slate-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" placeholder="0.00" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Moneda</label>
                <AnimatedSelect
                  value={formData.moneda}
                  onChange={(v) => setFormData({...formData, moneda: v})}
                  options={[
                    { value: 'USD', label: 'USD' },
                    { value: 'VES', label: 'VES' },
                  ]}
                  placeholder="Seleccione moneda"
                  accent="emerald"
                />
                </div>
              </div>
              <div className="space-y-1">
                <AnimatedDatePicker
                  label="Fecha Límite (Opcional)"
                  value={formData.fecha_objetivo}
                  onChange={(v) => setFormData({...formData, fecha_objetivo: v})}
                  accent="emerald"
                />
              </div>
              <button type="submit" className="w-full bg-primary-600 text-white font-medium py-2.5 rounded-lg hover:bg-primary-700 transition-colors">Crear Meta</button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Agregar Aporte */}
      {modalMode === 'aporte' && (
        <div className="fixed inset-0 bg-slate-900/50 dark:bg-slate-950/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm transition-all">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-xl overflow-visible border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center p-5 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50 dark:bg-slate-950 rounded-t-2xl transition-colors">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Agregar Aporte</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">{metaActual?.nombre}</p>
              </div>
              <button onClick={() => setModalMode(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleAporteSubmit} className="p-5 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <input 
                  type="checkbox" 
                  id="fuenteExterna"
                  checked={aporteData.esFuenteExterna} 
                  onChange={e => setAporteData({...aporteData, esFuenteExterna: e.target.checked})}
                  className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                />
                <label htmlFor="fuenteExterna" className="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                  El dinero proviene de una fuente externa (no descontar de mis cuentas)
                </label>
              </div>

              {!aporteData.esFuenteExterna && (
                <div className="space-y-1 transition-all">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Cuenta de origen</label>
                  <AnimatedSelect
                    value={aporteData.cuenta_id}
                    onChange={(v) => setAporteData({...aporteData, cuenta_id: v})}
                    options={[
                      { value: '', label: 'Seleccione una cuenta', disabled: true },
                      ...(cuentas?.filter(c => c.activa).map(c => ({
                        value: c.id,
                        label: `${c.nombre} - Disp: ${formatMoney(c.saldo_cache, c.moneda)}`
                      })) || [])
                    ]}
                    placeholder="Seleccione una cuenta"
                    required={!aporteData.esFuenteExterna}
                    accent="emerald"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Monto del Aporte {aporteData.esFuenteExterna ? `(en ${metaActual?.moneda})` : ''}
                </label>
                <input required type="number" step="0.01" min="0.01" value={aporteData.monto} onChange={e => setAporteData({...aporteData, monto: e.target.value})} className="w-full px-4 py-2 text-xl font-bold border dark:border-slate-700 rounded-lg outline-none bg-transparent text-slate-900 dark:text-slate-100 transition-colors" placeholder="0.00" />
              </div>

              {!aporteData.esFuenteExterna ? (
                <p className="text-xs text-slate-500 dark:text-slate-400 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-900/50 transition-colors">
                  Se creará una transacción de tipo <strong className="dark:text-slate-300">gasto</strong> en la cuenta seleccionada, categorizada como &quot;Ahorro&quot;, y se sumará a esta meta.
                </p>
              ) : (
                <p className="text-xs text-slate-500 dark:text-slate-400 bg-primary-50 dark:bg-primary-900/20 p-3 rounded-lg border border-primary-100 dark:border-primary-900/50 transition-colors">
                  El monto se sumará directamente al ahorro <strong className="dark:text-slate-300">sin crear una transacción de gasto</strong> ni alterar los balances.
                </p>
              )}
              
              <button type="submit" className="w-full bg-primary-600 text-white font-medium py-2.5 rounded-lg hover:bg-primary-700 transition-colors">Registrar Aporte</button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Retiro de Emergencia */}
      {modalMode === 'retiro' && metaActual && (
        <div className="fixed inset-0 bg-slate-900/50 dark:bg-slate-950/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm transition-all">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-xl overflow-visible border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center p-5 border-b border-slate-100 dark:border-slate-800/60 bg-orange-50 dark:bg-orange-950 rounded-t-2xl transition-colors">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Retiro de Emergencia</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">{metaActual.nombre}</p>
              </div>
              <button onClick={() => setModalMode(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleRetiroSubmit} className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Cuenta de destino</label>
                <AnimatedSelect
                  value={retiroData.cuenta_id}
                  onChange={(v) => setRetiroData({...retiroData, cuenta_id: v})}
                  options={[
                    { value: '', label: 'Seleccione una cuenta', disabled: true },
                    ...(cuentas?.filter(c => c.activa).map(c => ({
                      value: c.id,
                      label: `${c.nombre} (${c.moneda})`
                    })) || [])
                  ]}
                  placeholder="Seleccione una cuenta"
                  required
                  accent="orange"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Monto a retirar
                  {(() => {
                    const cuenta = cuentas?.find(c => c.id === retiroData.cuenta_id)
                    if (!cuenta || !metaActual) return null
                    const maximo = calcularMaximoRetirable(metaActual, cuenta.moneda)
                    return (
                      <span className="block text-xs font-normal text-slate-500 dark:text-slate-400 mt-0.5">
                        Máximo disponible: {formatMoney(maximo, cuenta.moneda)}
                      </span>
                    )
                  })()}
                </label>
                <input 
                  required 
                  type="number" 
                  step="0.01" 
                  min="0.01" 
                  value={retiroData.monto} 
                  onChange={e => setRetiroData({...retiroData, monto: e.target.value})} 
                  className="w-full px-4 py-2 text-xl font-bold border dark:border-slate-700 rounded-lg outline-none bg-transparent text-slate-900 dark:text-slate-100 transition-colors" 
                  placeholder="0.00" 
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Motivo de la emergencia (opcional)</label>
                <input 
                  type="text" 
                  value={retiroData.descripcion} 
                  onChange={e => setRetiroData({...retiroData, descripcion: e.target.value})} 
                  className="w-full px-4 py-2 border dark:border-slate-700 rounded-lg outline-none bg-transparent text-slate-900 dark:text-slate-100 transition-colors" 
                  placeholder="Retiro de ahorro" 
                />
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg border border-orange-100 dark:border-orange-900/50 transition-colors">
                Se descontará el monto de esta meta y se acreditará en la cuenta destino como un ajuste interno. No contará como ingreso del mes.
              </p>
              
              <button 
                type="submit" 
                className="w-full bg-orange-600 text-white font-medium py-2.5 rounded-lg hover:bg-orange-700 transition-colors"
              >
                Confirmar Retiro
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
