'use client'

import { useState } from 'react'
import { useProgresoPresupuesto, useGuardarPresupuesto, useCopiarPresupuestosAnterior, ProgresoPresupuesto } from '@/hooks/usePresupuestos'
import { useCategorias } from '@/hooks/useAuxiliares'
import { Target, Calendar as CalendarIcon, Copy, Plus, X, Loader2, AlertCircle } from 'lucide-react'

export const dynamic = 'force-dynamic';

export default function PresupuestoPage() {
  const [mesActual, setMesActual] = useState(new Date())
  const [modalOpen, setModalOpen] = useState(false)
  const [presupuestoEdit, setPresupuestoEdit] = useState<{categoria_id: string, monto: string} | null>(null)
  
  const { data: progreso, isLoading: loadingProgreso } = useProgresoPresupuesto(mesActual)
  const { data: categorias } = useCategorias()
  
  const { mutateAsync: guardarPresupuesto, isPending: isSaving } = useGuardarPresupuesto()
  const { mutateAsync: copiarAnterior, isPending: isCopying } = useCopiarPresupuestosAnterior()

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
    } catch (err: any) {
      alert(err.message || 'Error al copiar los presupuestos.')
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
    } catch (err) {
      alert('Error al guardar presupuesto')
    }
  }

  // Las categorías que son gastos y no están en el progreso actual
  const categoriasGasto = categorias?.filter(c => c.tipo === 'gasto') || []
  const categoriasDisponibles = categoriasGasto.filter(c => 
    !progreso?.some(p => p.categoria_id === c.id)
  )

  const getBarColor = (porcentaje: number) => {
    if (porcentaje >= 100) return 'bg-red-500'
    if (porcentaje >= 90) return 'bg-orange-500'
    return 'bg-emerald-500'
  }

  const totalPlaneado = progreso?.reduce((acc, curr) => acc + curr.monto_planeado, 0) || 0
  const totalGastado = progreso?.reduce((acc, curr) => acc + curr.monto_gastado, 0) || 0

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-4xl mx-auto pb-24 md:pb-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
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
            <CalendarIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span className="capitalize">{mesActual.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</span>
          </div>
          <button 
            onClick={() => handleMoverMes(1)}
            className="p-2 shrink-0 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400 transition-colors"
          >
            &rarr;
          </button>
        </div>
      </header>

      {/* Resumen Global */}
      {!loadingProgreso && progreso && progreso.length > 0 && (
        <div className="bg-emerald-600 dark:bg-emerald-800 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row gap-6 justify-between items-center relative overflow-hidden transition-colors">
          <Target className="absolute -right-4 -top-4 w-32 h-32 text-emerald-500 dark:text-emerald-700 opacity-20" />
          <div className="relative z-10 w-full md:w-auto">
            <p className="text-emerald-100 dark:text-emerald-200 mb-1 text-sm">Presupuesto Total Planeado</p>
            <p className="text-3xl font-bold">{formatUSD(totalPlaneado)}</p>
          </div>
          <div className="relative z-10 w-full md:w-auto text-left md:text-right">
            <p className="text-emerald-100 dark:text-emerald-200 mb-1 text-sm">Total Gastado</p>
            <p className="text-2xl font-bold">{formatUSD(totalGastado)}</p>
          </div>
        </div>
      )}

      {/* Lista de Presupuestos */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors mt-6">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800/60 flex justify-between items-center">
          <h2 className="font-semibold text-slate-800 dark:text-slate-200">Desglose por Categoría</h2>
          <button
            onClick={() => handleOpenEdit()}
            className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Añadir categoría</span>
          </button>
        </div>

        {loadingProgreso ? (
          <div className="p-12 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600 dark:text-emerald-400" />
          </div>
        ) : progreso?.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center text-slate-500 dark:text-slate-400">
            <Target className="w-16 h-16 text-slate-300 dark:text-slate-600 mb-4" />
            <p className="text-lg font-medium text-slate-900 dark:text-slate-200 mb-2">No has definido presupuestos</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-sm">
              Empieza a planificar tus gastos para este mes y toma el control de tu dinero.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => handleOpenEdit()}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Crear desde cero
              </button>
              <button
                onClick={handleCopiar}
                disabled={isCopying}
                className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 px-5 py-2.5 rounded-lg font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isCopying ? <Loader2 className="w-5 h-5 animate-spin" /> : <Copy className="w-5 h-5" />}
                Copiar del mes anterior
              </button>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
            {progreso?.map(p => {
              const alertaMascota = p.porcentaje_usado >= 90;
              return (
                <div key={p.categoria_id} className="p-5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
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
                      <p className="font-bold text-slate-900 dark:text-white">{formatUSD(p.monto_gastado)} <span className="text-sm font-normal text-slate-500 dark:text-slate-400">/ {formatUSD(p.monto_planeado)}</span></p>
                    </div>
                  </div>
                  
                  <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-2 relative">
                    <div 
                      className={`h-full transition-all duration-500 rounded-full ${getBarColor(p.porcentaje_usado)}`}
                      style={{ width: `${Math.min(p.porcentaje_usado, 100)}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 items-center">
                    <span>{p.porcentaje_usado}% utilizado</span>
                    <div className="flex items-center gap-3">
                      <span className={p.restante < 0 ? 'text-red-600 dark:text-red-400 font-medium' : ''}>
                        {p.restante < 0 ? 'Excedido por ' : 'Restante: '}{formatUSD(Math.abs(p.restante))}
                      </span>
                      <button 
                        onClick={() => handleOpenEdit(p)}
                        className="text-emerald-600 dark:text-emerald-400 font-medium hover:underline transition-opacity"
                      >
                        Editar
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 dark:bg-slate-950/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm transition-all">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm shadow-xl overflow-hidden border border-slate-200 dark:border-slate-800">
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
                  <select
                    required
                    value={presupuestoEdit?.categoria_id || ''}
                    onChange={e => setPresupuestoEdit(prev => ({...prev!, categoria_id: e.target.value}))}
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors"
                  >
                    <option value="" disabled>Selecciona una categoría</option>
                    {categoriasDisponibles.map(c => (
                      <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
                  </select>
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
                  className="w-full px-4 py-2 text-xl font-bold border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-transparent text-slate-900 dark:text-slate-100 transition-colors"
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
                  className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium flex justify-center items-center disabled:opacity-50"
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
