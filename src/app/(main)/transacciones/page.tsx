'use client'

import { useState, useMemo } from 'react'
import { useTransacciones, useCrearTransaccion, useAnularTransaccion, Transaccion } from '@/hooks/useTransacciones'
import { useCuentas } from '@/hooks/useCuentas'
import { useCategorias, useTasaActual } from '@/hooks/useAuxiliares'
import { useToast } from '@/hooks/useToast'
import { Plus, X, Loader2, ArrowRightLeft, Search, Calendar as CalendarIcon, Ban } from 'lucide-react'
import { FadeIn, StaggerContainer, AnimatedCard, AnimatedButton, AnimatedLoader, AnimatedNumber, AnimatedSelect } from '@/components/animations'
import { CreatableCategorySelect } from '@/components/CreatableCategorySelect'

export const dynamic = 'force-dynamic';

type ModalMode = 'create' | null

export default function TransaccionesPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [modalMode, setModalMode] = useState<ModalMode>(null)
  
  // Data Fetching
  const { data: transactions, isLoading: loadingTx } = useTransacciones(currentMonth)
  const { data: accounts } = useCuentas()
  const { data: categories } = useCategorias()
  const { data: currentRate } = useTasaActual()
  
  // Mutations
  const { mutateAsync: createTransaction, isPending: isCreating } = useCrearTransaccion()
  const { mutateAsync: voidTransaction, isPending: isVoiding } = useAnularTransaccion()

  // Form State
  const [formData, setFormData] = useState({
    cuenta_id: '',
    categoria_id: '',
    tipo: 'gasto',
    monto_original: '',
    descripcion: ''
  })
  const [metodoPago, setMetodoPago] = useState<'tarjeta' | 'pago_movil'>('tarjeta')
  const [error, setError] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [categoriaFiltro, setCategoriaFiltro] = useState('')

  const { error: toastError } = useToast()

  const openCreateModal = () => {
    setFormData({
      cuenta_id: accounts?.find(c => c.activa)?.id || '',
      categoria_id: '',
      tipo: 'gasto',
      monto_original: '',
      descripcion: ''
    })
    setMetodoPago('tarjeta')
    setError('')
    setModalMode('create')
  }

  const closeModal = () => {
    setModalMode(null)
  }

  const selectedAccount = useMemo(() => {
    return accounts?.find(c => c.id === formData.cuenta_id)
  }, [formData.cuenta_id, accounts])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    
    if (!selectedAccount) {
      setError('Seleccione una cuenta válida')
      return
    }

    if (!formData.categoria_id) {
      setError('Seleccione una categoría')
      return
    }

    if (formData.tipo === 'gasto' && Number(formData.monto_original) > selectedAccount.saldo_cache) {
      setError(`Saldo insuficiente. Tienes ${formatMoney(selectedAccount.saldo_cache, selectedAccount.moneda)} en esta cuenta.`)
      return
    }

    let montoFinal = Number(formData.monto_original)
    if (formData.tipo === 'gasto' && selectedAccount.moneda === 'VES' && metodoPago === 'pago_movil') {
      montoFinal += 14.00
    }

    try {
      await createTransaction({
        cuenta_id: formData.cuenta_id,
        categoria_id: formData.categoria_id || undefined,
        tipo: formData.tipo,
        monto_original: montoFinal,
        moneda_original: selectedAccount.moneda,
        descripcion: formData.descripcion
      })
      closeModal()
    } catch (err) {
      // Handle custom trigger error or other errors
      const msg = err instanceof Error ? err.message : 'Error al guardar la transacción'
      setError(msg.includes('No hay tasa de cambio') ? 'No hay tasa de cambio disponible. Contacte soporte.' : msg)
    }
  }

  const handleVoidTransaction = async (id: string) => {
    if (confirm('¿Estás seguro de que deseas anular esta transacción? (Esta acción no se puede deshacer)')) {
      try {
        await voidTransaction(id)
      } catch (err) {
        console.error("Error voiding transaction:", err)
        toastError({ title: 'Error al anular', message: 'No se pudo anular la transacción.' })
      }
    }
  }

  const formatMoney = (monto: number, moneda: string) => {
    return new Intl.NumberFormat(moneda === 'USD' ? 'en-US' : 'es-VE', { 
      style: 'currency', 
      currency: moneda 
    }).format(monto)
  }

  const filteredTransactions = transactions?.filter(tx => {
    if (typeFilter) {
      if (typeFilter === 'ahorro') {
        if (tx.categorias?.tipo !== 'ahorro') return false;
      } else {
        if (tx.tipo !== typeFilter) return false;
      }
    }
    if (categoriaFiltro && tx.categoria_id !== categoriaFiltro) return false;
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

      {/* Filters */}
      <FadeIn delay={100}>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row gap-4 items-center justify-between transition-colors">
        <div className="flex items-center gap-2 overflow-x-auto flex-nowrap w-full md:w-auto pb-2 md:pb-0 scrollbar-hide">
          <button 
            className="p-2 shrink-0 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400 transition-colors"
            onClick={() => {
              const d = new Date(currentMonth)
              d.setMonth(d.getMonth() - 1)
              setCurrentMonth(d)
            }}
          >
            &larr;
          </button>
          <div className="flex items-center gap-2 shrink-0 font-medium text-slate-700 dark:text-slate-200 min-w-[140px] justify-center">
            <CalendarIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            {currentMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
          </div>
          <button 
            className="p-2 shrink-0 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400 transition-colors"
            onClick={() => {
              const d = new Date(currentMonth)
              d.setMonth(d.getMonth() + 1)
              setCurrentMonth(d)
            }}
          >
            &rarr;
          </button>
        </div>
        
        <div className="w-full md:w-auto flex-1 md:max-w-lg flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <AnimatedSelect
              value={typeFilter}
              onChange={(v) => {
                setTypeFilter(v)
                setCategoriaFiltro('')
              }}
              options={[
                { value: '', label: 'Todos los tipos' },
                { value: 'ingreso', label: 'Solo Ingresos' },
                { value: 'gasto', label: 'Solo Gastos' },
                { value: 'ahorro', label: 'Solo Ahorros' }
              ]}
              placeholder="Todos los tipos"
              accent="emerald"
            />
          </div>
          {typeFilter && (
            <div className="flex-1 animate-in fade-in zoom-in-95 duration-200">
              <AnimatedSelect
                value={categoriaFiltro}
                onChange={setCategoriaFiltro}
                options={[
                  { value: '', label: 'Todas las categorías' },
                  ...(categories
                    ?.filter(c => c.tipo === typeFilter)
                    .map(c => ({ value: c.id, label: c.nombre })) || [])
                ]}
                placeholder="Filtrar por categoría"
                accent="emerald"
              />
            </div>
          )}
        </div>
        </div>
      </FadeIn>

      {/* List */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors mt-6">
        {loadingTx ? (
          <div className="p-8 flex justify-center">
            <AnimatedLoader size={40} color="#10b981" />
          </div>
        ) : filteredTransactions?.length === 0 ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400">
            <Search className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
            <p className="text-lg font-medium text-slate-900 dark:text-slate-200">No hay transacciones</p>
            <p className="text-sm mt-1">No se encontraron movimientos para este mes.</p>
          </div>
        ) : (
          <StaggerContainer className="divide-y divide-slate-100 dark:divide-slate-800/50" staggerDelay={60} duration={450}>
            {filteredTransactions?.map(tx => (
              <AnimatedCard
                data-anime
                key={tx.id}
                className={`p-4 flex flex-row items-start justify-between gap-4 cursor-default ${tx.anulada ? 'bg-slate-50/50 dark:bg-slate-900/50 opacity-60' : ''}`}
              >
                <div className="flex items-start gap-4 min-w-0">
                  <div className={`shrink-0 p-3 rounded-full ${
                    tx.tipo === 'ingreso' ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400' :
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
                      tx.tipo === 'ingreso' ? 'text-primary-600 dark:text-primary-400' : 'text-slate-900 dark:text-slate-200'
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
                      onClick={() => handleVoidTransaction(tx.id)}
                      disabled={isVoiding}
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

      {/* Create Modal */}
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
                    formData.tipo === 'ingreso' ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400' : 'border-transparent bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
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
                    ...(accounts?.filter(c => c.activa).map(c => ({
                      value: c.id,
                      label: `${c.nombre} (${c.moneda}) - ${formatMoney(c.saldo_cache, c.moneda)}`
                    })) || [])
                  ]}
                  placeholder="Seleccione una cuenta"
                  required
                  accent="emerald"
                />
                
                {/* IMPORTANT EXCHANGE RATE WARNING */}
                {selectedAccount?.moneda === 'VES' && (
                  <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 rounded-lg text-sm text-blue-800 dark:text-blue-300 flex flex-col gap-1 transition-colors">
                    <span className="font-semibold">Información de conversión:</span>
                    {currentRate ? (
                      <>
                        <span>Tasa actual: <strong className="text-blue-900 dark:text-blue-200 font-bold">{currentRate} VES/USD</strong>.</span>
                        {formData.monto_original && Number(formData.monto_original) > 0 && (
                          <span className="mt-1 bg-white/50 dark:bg-slate-950/50 px-2 py-1 rounded inline-block w-max">
                            Equivalente estimado: <strong className="text-primary-700 dark:text-primary-400">≈ ${(Number(formData.monto_original) / currentRate).toFixed(2)} USD</strong>
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
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Monto ({selectedAccount?.moneda || '...'})</label>
                <input
                  type="number"
                  required
                  step="0.01"
                  min="0.01"
                  value={formData.monto_original}
                  onChange={e => setFormData({...formData, monto_original: e.target.value})}
                  className="w-full px-4 py-2 text-xl font-bold border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none bg-transparent text-slate-900 dark:text-slate-100 transition-colors"
                  placeholder="0.00"
                />
              </div>

              {formData.tipo === 'gasto' && selectedAccount?.moneda === 'VES' && (
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Método de pago</label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setMetodoPago('tarjeta')}
                      className={`flex-1 py-2 rounded-lg font-medium border-2 transition-all ${
                        metodoPago === 'tarjeta' ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400' : 'border-slate-200 dark:border-slate-700 bg-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      Tarjeta
                    </button>
                    <button
                      type="button"
                      onClick={() => setMetodoPago('pago_movil')}
                      className={`flex-1 py-2 rounded-lg font-medium border-2 transition-all ${
                        metodoPago === 'pago_movil' ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400' : 'border-slate-200 dark:border-slate-700 bg-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      Pago Móvil (+14 Bs)
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Categoría</label>
                <CreatableCategorySelect
                  value={formData.categoria_id}
                  onChange={(v) => setFormData({...formData, categoria_id: v})}
                  categories={categories || []}
                  tipo={formData.tipo as 'gasto' | 'ingreso'}
                  placeholder="Seleccionar Categoría..."
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Descripción (Opcional)</label>
                <input
                  type="text"
                  value={formData.descripcion}
                  onChange={e => setFormData({...formData, descripcion: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none bg-transparent text-slate-900 dark:text-slate-100 transition-colors"
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
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium flex justify-center items-center"
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