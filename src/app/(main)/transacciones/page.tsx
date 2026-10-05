'use client'

import { useState, useEffect } from 'react'
import { useTransacciones, useAnularTransaccion, useRestaurarTransaccion, Transaccion } from '@/hooks/useTransacciones'
import { useCategorias } from '@/hooks/useAuxiliares'
import { useToast } from '@/hooks/useToast'
import { Plus, X, ArrowRightLeft, Search, Calendar as CalendarIcon, Ban, RotateCcw } from 'lucide-react'
import { FadeIn, StaggerContainer, AnimatedCard, AnimatedButton, AnimatedLoader, AnimatedNumber, AnimatedSelect } from '@/components/animations'
import { NewTransactionModal } from '@/components/NewTransactionModal'

export const dynamic = 'force-dynamic';

export default function TransaccionesPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [selectedTx, setSelectedTx] = useState<Transaccion | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])
  
  // Data Fetching
  const { data: transactions, isLoading: loadingTx } = useTransacciones(currentMonth)
  const { data: categories } = useCategorias()
  
  // Mutations
  const { mutateAsync: voidTransaction } = useAnularTransaccion()
  const { mutateAsync: restoreTransaction } = useRestaurarTransaccion()

  const [typeFilter, setTypeFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')

  const { error: toastError } = useToast()

  const handleVoidTransaction = async (id: string) => {
    if (confirm('¿Confirma la anulación de esta transacción?')) {
      try {
        await voidTransaction(id)
      } catch (err) {
        console.error("Error voiding transaction:", err)
        toastError({ title: 'Error al anular', message: 'No se pudo anular la transacción.' })
      }
    }
  }

  const handleRestoreTransaction = async (id: string) => {
    if (confirm('¿Desea restaurar esta transacción? Esto restablecerá el balance previo a la anulación.')) {
      try {
        await restoreTransaction(id)
      } catch (err) {
        console.error("Error restoring transaction:", err)
        toastError({ title: 'Error al restaurar', message: 'No se pudo restaurar la transacción.' })
      }
    }
  }

  const formatMoney = (amount: number, currency: string) => {
    return new Intl.NumberFormat(currency === 'USD' ? 'en-US' : 'es-VE', { 
      style: 'currency', 
      currency: currency 
    }).format(amount)
  }

  const filteredTransactions = transactions?.filter(tx => {
    if (typeFilter) {
      if (typeFilter === 'ahorro') {
        if (tx.categorias?.tipo !== 'ahorro') return false;
      } else {
        if (tx.tipo !== typeFilter) return false;
      }
    }
    if (categoryFilter && tx.categoria_id !== categoryFilter) return false;
    return true;
  })

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto pb-24 md:pb-8">
      <FadeIn as="header" className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Transacciones</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Registro y revisión de movimientos del mes</p>
        </div>
        <AnimatedButton onClick={() => setIsCreateModalOpen(true)}>
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
            {mounted
              ? currentMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
              : '\u00A0'}
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
                setCategoryFilter('')
              }}
              options={[
                { value: '', label: 'Todos los tipos' },
                { value: 'ingreso', label: 'Solo Ingresos' },
                { value: 'gasto', label: 'Solo Gastos' },
                { value: 'transferencia', label: 'Solo Traspasos' },
                { value: 'ahorro', label: 'Solo Ahorros' }
              ]}
              placeholder="Todos los tipos"
              accent="emerald"
            />
          </div>
          {typeFilter && (
            <div className="flex-1 animate-in fade-in zoom-in-95 duration-200">
              <AnimatedSelect
                value={categoryFilter}
                onChange={setCategoryFilter}
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
                onClick={() => setSelectedTx(tx)}
                className={`p-4 flex flex-row items-start justify-between gap-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${tx.anulada ? 'bg-slate-50/50 dark:bg-slate-900/50 opacity-60' : ''}`}
              >
                <div className="flex items-start gap-4 min-w-0">
                  <div className={`shrink-0 p-3 rounded-full ${
                    tx.tipo === 'ingreso' || (tx.tipo === 'transferencia' && tx.transferencia_direccion === 'entrada') ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400' :
                    tx.tipo === 'gasto' || (tx.tipo === 'transferencia' && tx.transferencia_direccion === 'salida') ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' :
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
                      tx.tipo === 'ingreso' || (tx.tipo === 'transferencia' && tx.transferencia_direccion === 'entrada') ? 'text-primary-600 dark:text-primary-400' : 'text-slate-900 dark:text-slate-200'
                    } ${tx.anulada ? 'line-through' : ''}`}>
                      {tx.tipo === 'ingreso' || (tx.tipo === 'transferencia' && tx.transferencia_direccion === 'entrada') ? '+' : '-'}
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
                      onClick={(e) => { e.stopPropagation(); handleVoidTransaction(tx.id); }}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 dark:hover:text-red-400 rounded-lg transition-colors"
                      title="Anular transacción"
                    >
                      <Ban className="w-4 h-4" />
                    </button>
                  )}
                  {tx.anulada && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-red-500 dark:text-red-400 bg-red-100 dark:bg-red-900/30 px-2 py-1 rounded">ANULADA</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleRestoreTransaction(tx.id); }}
                        className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-400 rounded-lg transition-colors"
                        title="Restaurar transacción"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </AnimatedCard>
            ))}
          </StaggerContainer>
        )}
      </div>

      {/* Create Modal */}
      <NewTransactionModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      {/* Details Modal */}
      {selectedTx && (
        <div className="fixed inset-0 bg-slate-900/50 dark:bg-slate-950/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm transition-all">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-xl border border-slate-200 dark:border-slate-800 flex flex-col">
            <div className="flex justify-between items-center p-5 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-800/50 rounded-t-2xl">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Detalle del Movimiento
              </h2>
              <button onClick={() => setSelectedTx(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors bg-white dark:bg-slate-800 rounded-full p-1 border border-slate-200 dark:border-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Main Amount */}
              <div className="text-center pb-4 border-b border-slate-100 dark:border-slate-800">
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-1 uppercase tracking-wider">{selectedTx.tipo}</p>
                <p className={`text-4xl font-bold ${
                  selectedTx.tipo === 'ingreso' || (selectedTx.tipo === 'transferencia' && selectedTx.transferencia_direccion === 'entrada') ? 'text-primary-600 dark:text-primary-400' : 'text-slate-900 dark:text-white'
                } ${selectedTx.anulada ? 'line-through text-slate-400 dark:text-slate-500' : ''}`}>
                  {selectedTx.tipo === 'ingreso' || (selectedTx.tipo === 'transferencia' && selectedTx.transferencia_direccion === 'entrada') ? '+' : '-'}
                  {formatMoney(selectedTx.monto_original, selectedTx.moneda_original)}
                </p>
                {selectedTx.moneda_original === 'VES' && (
                  <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">
                    ≈ {formatMoney(selectedTx.monto_usd_calculado, 'USD')}
                  </p>
                )}
                {selectedTx.anulada && (
                  <span className="inline-block mt-3 text-xs font-bold text-red-500 dark:text-red-400 bg-red-100 dark:bg-red-900/30 px-3 py-1 rounded-full">ANULADA</span>
                )}
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-sm">
                <div>
                  <p className="text-slate-500 dark:text-slate-400 mb-1">Fecha</p>
                  <p className="font-medium text-slate-900 dark:text-white">
                    {new Date(selectedTx.fecha).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                </div>
                
                <div>
                  <p className="text-slate-500 dark:text-slate-400 mb-1">Categoría</p>
                  <p className="font-medium text-slate-900 dark:text-white">
                    {selectedTx.categorias?.nombre || 'Sin categoría'}
                  </p>
                </div>

                <div>
                  <p className="text-slate-500 dark:text-slate-400 mb-1">Cuenta</p>
                  <p className="font-medium text-slate-900 dark:text-white">
                    {selectedTx.cuentas?.nombre}
                  </p>
                </div>

                <div>
                  <p className="text-slate-500 dark:text-slate-400 mb-1">Tasa usada</p>
                  <p className="font-medium text-slate-900 dark:text-white">
                    {selectedTx.tasa_al_momento ? `${selectedTx.tasa_al_momento} VES/USD` : '-'}
                  </p>
                </div>

                <div className="col-span-2 mt-2 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                  <p className="text-slate-500 dark:text-slate-400 mb-1 text-xs uppercase tracking-wider">Descripción</p>
                  <p className="font-medium text-slate-900 dark:text-white break-words">
                    {selectedTx.descripcion || 'Sin descripción'}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-800/50 rounded-b-2xl flex justify-end">
              <button
                onClick={() => setSelectedTx(null)}
                className="px-6 py-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors font-medium"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}