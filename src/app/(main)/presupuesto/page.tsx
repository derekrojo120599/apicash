'use client'

import { useState } from 'react'
import { useProgresoPresupuesto, useGuardarPresupuesto, useCopiarPresupuestosAnterior, ProgresoPresupuesto } from '@/hooks/usePresupuestos'
import { useCategorias } from '@/hooks/useAuxiliares'
import { useToast } from '@/hooks/useToast'
import { Target, Calendar as CalendarIcon, Copy, Plus, X, Loader2, AlertCircle } from 'lucide-react'
import { FadeIn, StaggerContainer, AnimatedCard, AnimatedButton, AnimatedLoader, AnimatedNumber, AnimatedProgressBar, AnimatedSelect } from '@/components/animations'

export const dynamic = 'force-dynamic';

export default function PresupuestoPage() {
  const [mesActual, setMesActual] = useState(new Date())
  const [modalOpen, setModalOpen] = useState(false)
  const [presupuestoEdit, setPresupuestoEdit] = useState<{categoria_id: string, monto: string} | null>(null)
  
  const { data: progreso, isLoading: loadingProgreso } = useProgresoPresupuesto(mesActual)
  const { data: categorias } = useCategorias()
  
  const { mutateAsync: guardarPresupuesto, isPending: isSaving } = useGuardarPresupuesto()
  const { mutateAsync: copiarAnterior, isPending: isCopying } = useCopiarPresupuestosAnterior()

  const { error: toastError } = useToast()

  const formatUSD = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val)

  const handleMoverMes = (offset: number) => {
    const d = new Date(mesActual)
    d.setMonth(d.getMonth() + offset)
    setMesActual(d)
  }

  const handleCopiar = async () => {
    const mesAnterior = new Date(mesActual)
    mesAnterior.setMonth(mesAnterior.getMonth() - 1)
    
    try {
      await copiarAnterior({ mesOrigen: mesAnterior, mesDestino: mesActual })
    } catch (err) {
      toastError({ title: 'Error al copiar', message: err instanceof Error ? err.message : 'No se pudieron copiar los presupuestos.' })
    }
  }

  const handleOpenEdit = (prog?: ProgresoPresupuesto) => {
    if (prog) {
      setPresupuestoEdit({ categoria_id: prog.categoria_id, monto: prog.monto_planeado.toString() })
    } else {
      setPresupuestoEdit({ categoria_id: '', monto: '' })
    }
    setModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!presupuestoEdit?.categoria_id || !presupuestoEdit.monto) return

    try {
      await guardarPresupuesto({
        categoria_id: presupuestoEdit.categoria_id,
        monto_planeado: Number(presupuestoEdit.monto),
        mes: mesActual
      })
      setModalOpen(false)
    } catch {
      toastError({ title: 'Error al guardar', message: 'No se pudo guardar el presupuesto.' })
    }
  }

  // Las categorías que son gastos y no están en el progreso actual
  const categoriasGasto = categorias?.filter(c => c.tipo === 'gasto') || []
  const categoriasDisponibles = categoriasGasto.filter(c => 
    !progreso?.some(p => p.categoria_id === c.id)
  )

  const totalPlaneado = progreso?.reduce((acc, curr) => acc + curr.monto_planeado, 0) || 0
  const totalGastado = progreso?.reduce((acc, curr) => acc + curr.monto_gastado, 0) || 0

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-4xl mx-auto pb-24 md:pb-8">
      <FadeIn as="header" className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Presupuesto</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Planea tus gastos mensuales en USD</p>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto flex-nowrap bg-white dark:bg-slate-900 p-2 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 transition-colors scrollbar-hide">
          <button 
            onClick={() => handleMoverMes(-1)}
            className="p-2 shrink-0 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400 transition-colors"
          >
            &larr;
          </button>
          <div className="flex items-center gap-2 shrink-0 font-medium text-slate-700 dark:text-slate-200 min-w-[140px] justify-center">
            <CalendarIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            <span className="capitalize">{mesActual.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</span>
          </div>
          <button
            onClick={() => handleMoverMes(1)}
            className="p-2 shrink-0 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400 transition-colors"
          >
            &rarr;
          </button>
        </div>
      </FadeIn>

      {/* Resumen Global */}
      {!loadingProgreso && progreso && progreso.length > 0 && (
        <FadeIn delay={100}>
          <AnimatedCard className="bg-primary-600 dark:bg-primary-800 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row gap-6 justify-between items-center relative overflow-hidden cursor-default">
            <Target className="absolute -right-4 -top-4 w-32 h-32 text-primary-500 dark:text-primary-700 opacity-20" />
            <div className="relative z-10 w-full md:w-auto">
              <p className="text-primary-100 dark:text-primary-200 mb-1 text-sm">Presupuesto Total Planeado</p>
              <p className="text-3xl font-bold">
                <AnimatedNumber value={totalPlaneado} formatter={formatUSD} duration={1500} />
              </p>
            </div>
            <div className="relative z-10 w-full md:w-auto text-left md:text-right">
              <p className="text-primary-100 dark:text-primary-200 mb-1 text-sm">Total Gastado</p>
              <p className="text-2xl font-bold">
                <AnimatedNumber value={totalGastado} formatter={formatUSD} duration={1500} delay={200} />
              </p>
            </div>
          </AnimatedCard>
        </FadeIn>
      )}

      {/* Lista de Presupuestos */}
      <FadeIn delay={200}>
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors mt-6">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800/60 flex justify-between items-center">
            <h2 className="font-semibold text-slate-800 dark:text-slate-200">Desglose por Categoría</h2>
            <AnimatedButton variant="secondary" onClick={() => handleOpenEdit()} className="!px-3 !py-1.5 text-sm">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Añadir categoría</span>
            </AnimatedButton>
          </div>

          {loadingProgreso ? (
            <div className="p-12 flex justify-center">
              <AnimatedLoader size={40} color="#10b981" />
            </div>
          ) : progreso?.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center text-slate-500 dark:text-slate-400">
              <Target className="w-16 h-16 text-slate-300 dark:text-slate-600 mb-4" />
              <p className="text-lg font-medium text-slate-900 dark:text-slate-200 mb-2">No has definido presupuestos</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-sm">
                Empieza a planificar tus gastos para este mes y toma el control de tu dinero.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <AnimatedButton onClick={() => handleOpenEdit()}>
                  <Plus className="w-5 h-5" />
                  Crear desde cero
                </AnimatedButton>
                <AnimatedButton variant="secondary" onClick={handleCopiar} disabled={isCopying}>
                  {isCopying ? <Loader2 className="w-5 h-5 animate-spin" /> : <Copy className="w-5 h-5" />}
                  Copiar del mes anterior
                </AnimatedButton>
              </div>
            </div>
          ) : (
            <StaggerContainer className="divide-y divide-slate-100 dark:divide-slate-800/50" staggerDelay={80} duration={500}>
              {progreso?.map(p => {
                const alertaMascota = p.porcentaje_usado >= 90;
                return (
                  <AnimatedCard
                    data-anime
                    key={p.categoria_id}
                    className="p-5 cursor-default"
                  >
                    <div className="flex justify-between items-end mb-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-slate-900 dark:text-slate-200">{p.categoria_nombre}</h3>
                        {alertaMascota && (
                          <div title="Presupuesto casi excedido o excedido">
                            <AlertCircle className={`w-4 h-4 ${p.porcentaje_usado >= 100 ? 'text-red-500 dark:text-red-400' : 'text-orange-500 dark:text-orange-400'}`} />
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-slate-900 dark:text-white">
                          <AnimatedNumber value={p.monto_gastado} formatter={formatUSD} duration={1000} />{' '}
                          <span className="text-sm font-normal text-slate-500 dark:text-slate-400">
                            / <AnimatedNumber value={p.monto_planeado} formatter={formatUSD} duration={1000} delay={100} />
                          </span>
                        </p>
                      </div>
                    </div>

                    <AnimatedProgressBar
                      progress={p.porcentaje_usado}
                      color={p.porcentaje_usado >= 100 ? 'bg-red-500' : p.porcentaje_usado >= 90 ? 'bg-orange-500' : 'bg-primary-500'}
                      height={12}
                      duration={1200}
                      className="mb-2"
                    />

                    <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 items-center">
                      <span>{p.porcentaje_usado}% utilizado</span>
                      <div className="flex items-center gap-3">
                        <span className={p.restante < 0 ? 'text-red-600 dark:text-red-400 font-medium' : ''}>
                          {p.restante < 0 ? 'Excedido por ' : 'Restante: '}
                          <AnimatedNumber value={Math.abs(p.restante)} formatter={formatUSD} duration={1000} delay={200} />
                        </span>
                        <button
                          onClick={() => handleOpenEdit(p)}
                          className="text-primary-600 dark:text-primary-400 font-medium hover:underline transition-opacity"
                        >
                          Editar
                        </button>
                      </div>
                    </div>
                  </AnimatedCard>
                )
              })}
            </StaggerContainer>
          )}
        </div>
      </FadeIn>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 dark:bg-slate-950/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm transition-all">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm shadow-xl overflow-visible border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center p-5 border-b border-slate-100 dark:border-slate-800/60 transition-colors">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {presupuestoEdit?.categoria_id && !categoriasDisponibles.find(c => c.id === presupuestoEdit.categoria_id) 
                  ? 'Editar Presupuesto' 
                  : 'Añadir Presupuesto'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Categoría</label>
                {presupuestoEdit?.categoria_id && !categoriasDisponibles.find(c => c.id === presupuestoEdit.categoria_id) ? (
                  // Si estamos editando uno existente
                  <div className="px-4 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 font-medium transition-colors">
                    {progreso?.find(p => p.categoria_id === presupuestoEdit.categoria_id)?.categoria_nombre}
                  </div>
                ) : (
                  // Si estamos creando uno nuevo
                  <AnimatedSelect
                    value={presupuestoEdit?.categoria_id || ''}
                    onChange={(v) => setPresupuestoEdit(prev => ({...prev!, categoria_id: v}))}
                    options={[
                      { value: '', label: 'Selecciona una categoría', disabled: true },
                      ...categoriasDisponibles.map(c => ({ value: c.id, label: c.nombre }))
                    ]}
                    placeholder="Selecciona una categoría"
                    required
                    accent="emerald"
                  />
                )}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Monto Planeado (USD)</label>
                <input
                  type="number"
                  required
                  step="0.01"
                  min="0.01"
                  value={presupuestoEdit?.monto || ''}
                  onChange={e => setPresupuestoEdit(prev => ({...prev!, monto: e.target.value}))}
                  className="w-full px-4 py-2 text-xl font-bold border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none bg-transparent text-slate-900 dark:text-slate-100 transition-colors"
                  placeholder="0.00"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !presupuestoEdit?.categoria_id || !presupuestoEdit.monto}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium flex justify-center items-center disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
