'use client'

import { useState, useMemo } from 'react'
import { useTransacciones, useCrearTransaccion, useAnularTransaccion, Transaccion } from '@/hooks/useTransacciones'
import { useCuentas } from '@/hooks/useCuentas'
import { useCategorias, useTasaActual } from '@/hooks/useAuxiliares'
import { Plus, X, Loader2, ArrowRightLeft, Search, Calendar as CalendarIcon, Ban } from 'lucide-react'
import { FadeIn, StaggerContainer, AnimatedCard, AnimatedButton, AnimatedLoader, AnimatedNumber, AnimatedSelect } from '@/components/animations'

export const dynamic = 'force-dynamic';

type ModalMode = 'create' | null

export default function TransaccionesPage() {
  const [mesActual, setMesActual] = useState(new Date())
  const [modalMode, setModalMode] = useState<ModalMode>(null)
  
  // Data Fetching
  const { data: transacciones, isLoading: loadingTx } = useTransacciones(mesActual)
  const { data: cuentas } = useCuentas()
  const { data: categorias } = useCategorias()
  const { data: tasaActual } = useTasaActual()
  
  // Mutations
  const { mutateAsync: crearTransaccion, isPending: isCreating } = useCrearTransaccion()
  const { mutateAsync: anularTransaccion, isPending: isAnulando } = useAnularTransaccion()

  // Form State
  const [formData, setFormData] = useState({
    cuenta_id: '',
    categoria_id: '',
    tipo: 'gasto',
    monto_original: '',
    descripcion: ''
  })
  const [error, setError] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('')

  const openCreateModal = () => {
    setFormData({
      cuenta_id: cuentas?.find(c => c.activa)?.id || '',
      categoria_id: '',
      tipo: 'gasto',
      monto_original: '',
      descripcion: ''
    })
    setError('')
    setModalMode('create')
  }

  const closeModal = () => {
    setModalMode(null)
  }

  const cuentaSeleccionada = useMemo(() => {
    return cuentas?.find(c => c.id === formData.cuenta_id)
  }, [formData.cuenta_id, cuentas])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    
    if (!cuentaSeleccionada) {
      setError('Seleccione una cuenta válida')
      return
    }

    if (!formData.categoria_id) {
      setError('Seleccione una categoría')
      return
    }

    try {
      await crearTransaccion({
        cuenta_id: formData.cuenta_id,
        categoria_id: formData.categoria_id || undefined,
        tipo: formData.tipo,
        monto_original: Number(formData.monto_original),
        moneda_original: cuentaSeleccionada.moneda,
        descripcion: formData.descripcion
      })
      closeModal()
    } catch (err: any) {
      // Manejar el error personalizado del trigger u otros errores
      const msg = err.message || 'Error al guardar la transacción'
      setError(msg.includes('No hay tasa de cambio') ? 'No hay tasa de cambio disponible. Contacte soporte.' : msg)
    }
  }

  const handleAnular = async (id: string) => {
    if (confirm('¿Estás seguro de que deseas anular esta transacción? (Esta acción no se puede deshacer)')) {
      try {
        await anularTransaccion(id)
      } catch (err) {
        console.error("Error anulando:", err)
        alert('Error al anular transacción')
      }
    }
  }

  const formatMoney = (monto: number, moneda: string) => {
    return new Intl.NumberFormat(moneda === 'USD' ? 'en-US' : 'es-VE', { 
      style: 'currency', 
      currency: moneda 
    }).format(monto)
  }

  const txFiltradas = transacciones?.filter(tx => {
    if (filtroCategoria && tx.categoria_id !== filtroCategoria) return false;
    return true;
  })

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto pb-24 md:pb-8">
      <FadeIn as="header" className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Transacciones</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Registra y revisa tus movimientos del mes</p>
        </div>
        <AnimatedButton onClick={openCreateModal}>
          <Plus className="w-5 h-5" />
          Nueva transacción
        </AnimatedButton>
      </FadeIn>

      {/* Filtros */}
      <FadeIn delay={100}>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row gap-4 items-center justify-between transition-colors">
        <div className="flex items-center gap-2 overflow-x-auto flex-nowrap w-full md:w-auto pb-2 md:pb-0 scrollbar-hide">
          <button 
            className="p-2 shrink-0 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400 transition-colors"
            onClick={() => {
              const d = new Date(mesActual)
              d.setMonth(d.getMonth() - 1)
              setMesActual(d)
            }}
          >
            &larr;
          </button>
          <div className="flex items-center gap-2 shrink-0 font-medium text-slate-700 dark:text-slate-200 min-w-[140px] justify-center">
            <CalendarIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            {mesActual.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
          </div>
          <button 
            className="p-2 shrink-0 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400 transition-colors"
            onClick={() => {
              const d = new Date(mesActual)
              d.setMonth(d.getMonth() + 1)
              setMesActual(d)
            }}
          >
            &rarr;
          </button>
        </div>
        
        <div className="w-full md:w-auto flex-1 md:max-w-xs">
          <AnimatedSelect
            value={filtroCategoria}
            onChange={setFiltroCategoria}
            options={[
              { value: '', label: 'Todas las categorías' },
              ...(categorias?.map(c => ({ value: c.id, label: c.nombre })) || [])
            ]}
            placeholder="Todas las categorías"
            accent="emerald"
          />
        </div>
        </div>
      </FadeIn>

      {/* Lista */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors mt-6">
        {loadingTx ? (
          <div className="p-8 flex justify-center">
            <AnimatedLoader size={40} color="#10b981" />
          </div>
        ) : txFiltradas?.length === 0 ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400">
            <Search className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
            <p className="text-lg font-medium text-slate-900 dark:text-slate-200">No hay transacciones</p>
            <p className="text-sm mt-1">No se encontraron movimientos para este mes.</p>
          </div>
        ) : (
          <StaggerContainer className="divide-y divide-slate-100 dark:divide-slate-800/50" staggerDelay={60} duration={450}>
            {txFiltradas?.map(tx => (
              <AnimatedCard
                data-anime
                key={tx.id}
                className={`p-4 flex flex-row items-start justify-between gap-4 cursor-default ${tx.anulada ? 'bg-slate-50/50 dark:bg-slate-900/50 opacity-60' : ''}`}
              >
                <div className="flex items-start gap-4 min-w-0">
                  <div className={`shrink-0 p-3 rounded-full ${
                    tx.tipo === 'ingreso' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' :
                    tx.tipo === 'gasto' ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' :
                    'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                  }`}>
                    <ArrowRightLeft className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className={`font-medium truncate ${tx.anulada ? 'line-through text-slate-500 dark:text-slate-500' : 'text-slate-900 dark:text-slate-200'}`}>
                      {tx.descripcion || tx.categorias?.nombre || 'Sin categoría'}
                    </h4>
                    <div className="flex flex-col text-xs text-slate-500 dark:text-slate-400 mt-1 gap-y-0.5">
                      <span className="font-medium text-slate-600 dark:text-slate-300">{tx.cuentas?.nombre}</span>
                      <div className="flex gap-x-2">
                        <span>{new Date(tx.fecha).toLocaleDateString('es-ES')}</span>
                        {tx.tasa_al_momento && (
                          <span className="hidden sm:inline-flex sm:items-center sm:gap-x-2">
                            <span>•</span>
                            <span title="Tasa usada al momento de la transacción">Tasa: {tx.tasa_al_momento}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-start justify-end gap-4 shrink-0 pl-4">
                  <div className="text-right flex-none">
                    <p className={`font-bold ${
                      tx.tipo === 'ingreso' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-slate-200'
                    } ${tx.anulada ? 'line-through' : ''}`}>
                      {tx.tipo === 'ingreso' ? '+' : '-'}
                      <AnimatedNumber
                        value={tx.monto_original}
                        formatter={(v) => formatMoney(v, tx.moneda_original)}
                        duration={800}
                      />
                    </p>
                    {tx.moneda_original === 'VES' && (
                      <p className="text-xs text-slate-400 dark:text-slate-500">
                        ≈ <AnimatedNumber value={tx.monto_usd_calculado} formatter={(v) => formatMoney(v, 'USD')} duration={800} />
                      </p>
                    )}
                  </div>

                  {!tx.anulada && (
                    <button
                      onClick={() => handleAnular(tx.id)}
                      disabled={isAnulando}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 dark:hover:text-red-400 rounded-lg transition-colors"
                      title="Anular transacción"
                    >
                      <Ban className="w-4 h-4" />
                    </button>
                  )}
                  {tx.anulada && (
                    <span className="text-xs font-bold text-red-500 dark:text-red-400 bg-red-100 dark:bg-red-900/30 px-2 py-1 rounded">ANULADA</span>
                  )}
                </div>
              </AnimatedCard>
            ))}
          </StaggerContainer>
        )}
      </div>

      {/* Modal Crear */}
      {modalMode === 'create' && (
        <div className="fixed inset-0 bg-slate-900/50 dark:bg-slate-950/80 flex items-center justify-center p-4 z-50 overflow-y-auto backdrop-blur-sm transition-all">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-xl overflow-visible my-8 border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800/60 sticky top-0 bg-white dark:bg-slate-900 rounded-t-2xl z-10 transition-colors">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Nueva Transacción</h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="flex flex-wrap gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => setFormData({...formData, tipo: 'gasto'})}
                  className={`flex-1 min-w-[120px] py-2 rounded-lg font-medium border-2 transition-all ${
                    formData.tipo === 'gasto' ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400' : 'border-transparent bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  Gasto
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({...formData, tipo: 'ingreso'})}
                  className={`flex-1 min-w-[120px] py-2 rounded-lg font-medium border-2 transition-all ${
                    formData.tipo === 'ingreso' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400' : 'border-transparent bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  Ingreso
                </button>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Cuenta origen/destino</label>
                <AnimatedSelect
                  value={formData.cuenta_id}
                  onChange={(v) => setFormData({...formData, cuenta_id: v})}
                  options={[
                    { value: '', label: 'Seleccione una cuenta', disabled: true },
                    ...(cuentas?.filter(c => c.activa).map(c => ({
                      value: c.id,
                      label: `${c.nombre} (${c.moneda}) - ${formatMoney(c.saldo_cache, c.moneda)}`
                    })) || [])
                  ]}
                  placeholder="Seleccione una cuenta"
                  required
                  accent="emerald"
                />
                
                {/* AVISO IMPORTANTE SOBRE LA TASA DE CAMBIO */}
                {cuentaSeleccionada?.moneda === 'VES' && (
                  <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 rounded-lg text-sm text-blue-800 dark:text-blue-300 flex flex-col gap-1 transition-colors">
                    <span className="font-semibold">Información de conversión:</span>
                    {tasaActual ? (
                      <>
                        <span>Tasa actual: <strong className="text-blue-900 dark:text-blue-200 font-bold">{tasaActual} VES/USD</strong>.</span>
                        {formData.monto_original && Number(formData.monto_original) > 0 && (
                          <span className="mt-1 bg-white/50 dark:bg-slate-950/50 px-2 py-1 rounded inline-block w-max">
                            Equivalente estimado: <strong className="text-emerald-700 dark:text-emerald-400">≈ ${(Number(formData.monto_original) / tasaActual).toFixed(2)} USD</strong>
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-red-600 dark:text-red-400 font-bold">¡Atención! No hay tasa de cambio registrada en el sistema. La transacción fallará.</span>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Monto ({cuentaSeleccionada?.moneda || '...'})</label>
                <input
                  type="number"
                  required
                  step="0.01"
                  min="0.01"
                  value={formData.monto_original}
                  onChange={e => setFormData({...formData, monto_original: e.target.value})}
                  className="w-full px-4 py-2 text-xl font-bold border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-transparent text-slate-900 dark:text-slate-100 transition-colors"
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Categoría</label>
                <AnimatedSelect
                  value={formData.categoria_id}
                  onChange={(v) => setFormData({...formData, categoria_id: v})}
                  options={[
                    { value: '', label: 'Seleccione una categoría', disabled: true },
                    ...(categorias?.filter(c => c.tipo === formData.tipo || c.tipo === 'ahorro' || c.tipo === 'deuda').map(c => ({
                      value: c.id,
                      label: c.nombre
                    })) || [])
                  ]}
                  placeholder="Seleccione una categoría"
                  required
                  accent="emerald"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Descripción (Opcional)</label>
                <input
                  type="text"
                  value={formData.descripcion}
                  onChange={e => setFormData({...formData, descripcion: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-transparent text-slate-900 dark:text-slate-100 transition-colors"
                  placeholder="Ej: Mercado quincenal"
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg border border-red-100 dark:border-red-900/50">
                  {error}
                </div>
              )}

              <div className="pt-4 flex gap-3 pb-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium flex justify-center items-center"
                >
                  {isCreating ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
