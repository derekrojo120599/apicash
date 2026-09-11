'use client'

import { useState } from 'react'
import { useDeudas, useCrearDeuda, useRegistrarPagoDeuda, useEliminarDeuda, Deuda } from '@/hooks/useDeudas'
import { useCuentas } from '@/hooks/useCuentas'
import { Receipt, Plus, X, Loader2, ArrowDownCircle, Trash2 } from 'lucide-react'
import { FadeIn, StaggerContainer, AnimatedCard, AnimatedButton, AnimatedLoader, AnimatedNumber, AnimatedProgressBar, AnimatedSelect, AnimatedDatePicker } from '@/components/animations'

export const dynamic = 'force-dynamic';

export default function DeudasPage() {
  const { data: deudas, isLoading } = useDeudas()
  const { data: cuentas } = useCuentas()
  
  const { mutateAsync: crearDeuda, isPending: isCreating } = useCrearDeuda()
  const { mutateAsync: registrarPago, isPending: isPaying } = useRegistrarPagoDeuda()
  const { mutateAsync: eliminarDeuda, isPending: isDeleting } = useEliminarDeuda()

  const [modalMode, setModalMode] = useState<'create' | 'pago' | null>(null)
  const [deudaActual, setDeudaActual] = useState<Deuda | null>(null)
  
  const [formData, setFormData] = useState({
    nombre: '',
    monto_total: '',
    moneda: 'USD',
    fecha_limite: ''
  })
  
  const [pagoData, setPagoData] = useState({
    cuenta_id: '',
    monto: ''
  })

  const openCreate = () => {
    setFormData({ nombre: '', monto_total: '', moneda: 'USD', fecha_limite: '' })
    setModalMode('create')
  }

  const openPago = (deuda: Deuda) => {
    setDeudaActual(deuda)
    setPagoData({ cuenta_id: cuentas?.find(c => c.activa)?.id || '', monto: '' })
    setModalMode('pago')
  }

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await crearDeuda({
        nombre: formData.nombre,
        monto_total: Number(formData.monto_total),
        moneda: formData.moneda,
        fecha_limite: formData.fecha_limite || null
      })
      setModalMode(null)
    } catch (err) {
      alert('Error al registrar deuda')
    }
  }

  const handlePagoSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!deudaActual) return
    const cuenta = cuentas?.find(c => c.id === pagoData.cuenta_id)
    if (!cuenta) return

    try {
      await registrarPago({
        deuda_id: deudaActual.id,
        cuenta_id: cuenta.id,
        monto: Number(pagoData.monto),
        moneda_cuenta: cuenta.moneda,
        fecha: new Date()
      })
      setModalMode(null)
    } catch (err: any) {
      alert(err.message || 'Error al registrar pago')
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('¿Seguro que quieres eliminar esta deuda? Esta acción no se puede deshacer.')) {
      try {
        await eliminarDeuda(id)
      } catch (err: any) {
        alert(err.message || 'Error al eliminar la deuda')
      }
    }
  }

  const formatMoney = (val: number, mon: string) => new Intl.NumberFormat(mon === 'USD' ? 'en-US' : 'es-VE', { style: 'currency', currency: mon }).format(val)

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-5xl mx-auto pb-24 md:pb-8">
      <FadeIn as="header" className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Gestión de Deudas</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Registra y amortiza tus obligaciones financieras</p>
        </div>
        <AnimatedButton onClick={openCreate} className="!bg-orange-600 hover:!bg-orange-700">
          <Plus className="w-5 h-5" />
          Registrar Deuda
        </AnimatedButton>
      </FadeIn>

      {isLoading ? (
        <div className="flex justify-center p-12"><AnimatedLoader size={40} color="#f97316" /></div>
      ) : deudas?.length === 0 ? (
        <FadeIn>
          <AnimatedCard className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center text-slate-500 dark:text-slate-400 shadow-sm flex flex-col items-center cursor-default">
            <Receipt className="w-16 h-16 text-slate-300 dark:text-slate-600 mb-4" />
            <p className="text-lg font-medium text-slate-900 dark:text-slate-200">Estás libre de deudas</p>
            <p className="text-sm mt-1 mb-6">No tienes deudas activas registradas en el sistema.</p>
          </AnimatedCard>
        </FadeIn>
      ) : (
        <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 gap-6" staggerDelay={120}>
          {deudas?.map(deuda => {
            const montoPagado = deuda.monto_total - deuda.saldo_pendiente
            const progreso = Math.max(0, Math.min((montoPagado / deuda.monto_total) * 100, 100))
            const completado = deuda.saldo_pendiente <= 0

            return (
              <AnimatedCard
                data-anime
                key={deuda.id}
                className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 flex flex-col justify-between cursor-default group relative"
              >
                <button
                  onClick={() => handleDelete(deuda.id)}
                  disabled={isDeleting}
                  className="absolute top-4 right-4 p-2 text-slate-300 dark:text-slate-600 hover:text-red-600 dark:hover:text-red-400 transition-all z-10"
                  title="Eliminar deuda"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
                <div>
                  <div className="flex justify-between items-start mb-4 pr-8 gap-2">
                    <div className="min-w-0">
                      <h3 className="font-bold text-lg text-slate-900 dark:text-slate-200 truncate">{deuda.nombre}</h3>
                      {deuda.fecha_limite && (
                        <p className={`text-xs mt-1 font-medium ${new Date(deuda.fecha_limite) < new Date() && !completado ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}`}>
                          Límite: {new Date(deuda.fecha_limite).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <div className={`${completado ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'} font-bold px-3 py-1 rounded-full text-sm transition-colors shrink-0`}>
                      {Math.round(progreso)}% Pagado
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row justify-between text-sm mb-2 gap-1">
                    <span className="text-slate-600 dark:text-slate-300">
                      Pendiente:{' '}
                      <strong className="text-slate-900 dark:text-slate-100">
                        <AnimatedNumber value={deuda.saldo_pendiente} formatter={(v) => formatMoney(v, deuda.moneda)} duration={1000} />
                      </strong>
                    </span>
                    <span className="text-slate-400 dark:text-slate-500">
                      Total: <AnimatedNumber value={deuda.monto_total} formatter={(v) => formatMoney(v, deuda.moneda)} duration={1000} delay={100} />
                    </span>
                  </div>

                  <AnimatedProgressBar
                    progress={progreso}
                    color={completado ? 'bg-emerald-500 dark:bg-emerald-400' : 'bg-orange-500 dark:bg-orange-400'}
                    height={16}
                    duration={1200}
                    className="mb-6"
                  />
                </div>

                <button
                  onClick={() => openPago(deuda)}
                  disabled={completado}
                  className={`w-full py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors ${
                    completado
                    ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 cursor-default border border-emerald-100 dark:border-emerald-800/50'
                    : 'bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {completado ? (
                    '¡Deuda Saldada!'
                  ) : (
                    <>
                      <ArrowDownCircle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                      Registrar Pago
                    </>
                  )}
                </button>
              </AnimatedCard>
            )
          })}
        </StaggerContainer>
      )}

      {/* Modal Crear Deuda */}
      {modalMode === 'create' && (
        <div className="fixed inset-0 bg-slate-900/50 dark:bg-slate-950/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm transition-all">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-xl overflow-visible border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center p-5 border-b border-slate-100 dark:border-slate-800/60 transition-colors">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Registrar Deuda</h2>
              <button onClick={() => setModalMode(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateSubmit} className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Nombre / Acreedor</label>
                <input required type="text" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} className="w-full px-4 py-2 border dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none bg-transparent text-slate-900 dark:text-slate-100 transition-colors" placeholder="Ej: Préstamo Carro, Tarjeta de Crédito" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Monto Total</label>
                  <input required type="number" step="0.01" min="1" value={formData.monto_total} onChange={e => setFormData({...formData, monto_total: e.target.value})} className="w-full px-4 py-2 font-bold border dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-orange-500 bg-transparent text-slate-900 dark:text-slate-100 transition-colors" placeholder="0.00" />
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
                  accent="orange"
                />
                </div>
              </div>
              <div className="space-y-1">
                <AnimatedDatePicker
                  label="Fecha Límite de Pago (Opcional)"
                  value={formData.fecha_limite}
                  onChange={(v) => setFormData({...formData, fecha_limite: v})}
                  accent="orange"
                />
              </div>
              <button type="submit" disabled={isCreating} className="w-full bg-orange-600 hover:bg-orange-700 text-white font-medium py-2.5 rounded-lg flex justify-center transition-colors">{isCreating ? <Loader2 className="w-5 h-5 animate-spin"/> : 'Guardar Deuda'}</button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Registrar Pago */}
      {modalMode === 'pago' && (
        <div className="fixed inset-0 bg-slate-900/50 dark:bg-slate-950/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm transition-all">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-xl overflow-visible border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center p-5 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50 dark:bg-slate-950 rounded-t-2xl transition-colors">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Amortizar Deuda</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">{deudaActual?.nombre}</p>
              </div>
              <button onClick={() => setModalMode(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handlePagoSubmit} className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Cuenta de origen (Con qué vas a pagar)</label>
                <AnimatedSelect
                  value={pagoData.cuenta_id}
                  onChange={(v) => setPagoData({...pagoData, cuenta_id: v})}
                  options={[
                    { value: '', label: 'Seleccione una cuenta', disabled: true },
                    ...(cuentas?.filter(c => c.activa).map(c => ({
                      value: c.id,
                      label: `${c.nombre} - Disp: ${formatMoney(c.saldo_cache, c.moneda)}`
                    })) || [])
                  ]}
                  placeholder="Seleccione una cuenta"
                  required
                  accent="orange"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Monto del Pago</label>
                <input required type="number" step="0.01" min="0.01" max={deudaActual?.saldo_pendiente} value={pagoData.monto} onChange={e => setPagoData({...pagoData, monto: e.target.value})} className="w-full px-4 py-2 text-xl font-bold border dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-orange-500 bg-transparent text-slate-900 dark:text-slate-100 transition-colors" placeholder="0.00" />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Saldo pendiente: {formatMoney(deudaActual?.saldo_pendiente || 0, deudaActual?.moneda || 'USD')}</p>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg border border-orange-100 dark:border-orange-900/50 transition-colors">
                Se creará una transacción de tipo <strong className="dark:text-slate-300">gasto</strong> en la cuenta seleccionada, categorizada como "Deuda", y se restará del saldo pendiente.
              </p>
              <button type="submit" disabled={isPaying} className="w-full bg-orange-600 hover:bg-orange-700 transition-colors text-white font-medium py-2.5 rounded-lg flex justify-center">{isPaying ? <Loader2 className="w-5 h-5 animate-spin"/> : 'Confirmar Pago'}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
