'use client'

import { useState, useMemo } from 'react'
import { useTransacciones, useCrearTransaccion, useAnularTransaccion, Transaccion } from '@/hooks/useTransacciones'
import { useCuentas } from '@/hooks/useCuentas'
import { useCategorias, useTasaActual } from '@/hooks/useAuxiliares'
import { Plus, X, Loader2, ArrowRightLeft, Search, Calendar as CalendarIcon, Ban } from 'lucide-react'

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
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Transacciones</h1>
          <p className="text-slate-500 text-sm mt-1">Registra y revisa tus movimientos del mes</p>
        </div>
        <button
          onClick={openCreateModal}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nueva transacción
        </button>
      </header>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <button 
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-600"
            onClick={() => {
              const d = new Date(mesActual)
              d.setMonth(d.getMonth() - 1)
              setMesActual(d)
            }}
          >
            &larr;
          </button>
          <div className="flex items-center gap-2 font-medium text-slate-700 min-w-[140px] justify-center">
            <CalendarIcon className="w-5 h-5 text-emerald-600" />
            {mesActual.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
          </div>
          <button 
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-600"
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
          <select 
            value={filtroCategoria}
            onChange={(e) => setFiltroCategoria(e.target.value)}
            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
          >
            <option value="">Todas las categorías</option>
            {categorias?.map(c => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Lista */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {loadingTx ? (
          <div className="p-8 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          </div>
        ) : txFiltradas?.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Search className="w-12 h-12 mx-auto text-slate-300 mb-4" />
            <p className="text-lg font-medium text-slate-900">No hay transacciones</p>
            <p className="text-sm mt-1">No se encontraron movimientos para este mes.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {txFiltradas?.map(tx => (
              <div key={tx.id} className={`p-4 flex items-center justify-between transition-colors ${tx.anulada ? 'bg-slate-50 opacity-60' : 'hover:bg-slate-50'}`}>
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-full ${
                    tx.tipo === 'ingreso' ? 'bg-emerald-100 text-emerald-600' :
                    tx.tipo === 'gasto' ? 'bg-red-100 text-red-600' :
                    'bg-blue-100 text-blue-600'
                  }`}>
                    <ArrowRightLeft className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className={`font-medium ${tx.anulada ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                      {tx.descripcion || tx.categorias?.nombre || 'Sin categoría'}
                    </h4>
                    <div className="flex gap-2 text-xs text-slate-500 mt-1">
                      <span>{new Date(tx.fecha).toLocaleDateString('es-ES')}</span>
                      <span>•</span>
                      <span>{tx.cuentas?.nombre}</span>
                      {tx.tasa_al_momento && (
                        <>
                          <span>•</span>
                          <span title="Tasa usada al momento de la transacción">Tasa: {tx.tasa_al_momento}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className={`font-bold ${
                      tx.tipo === 'ingreso' ? 'text-emerald-600' : 'text-slate-900'
                    } ${tx.anulada ? 'line-through' : ''}`}>
                      {tx.tipo === 'ingreso' ? '+' : '-'}{formatMoney(tx.monto_original, tx.moneda_original)}
                    </p>
                    {tx.moneda_original === 'VES' && (
                      <p className="text-xs text-slate-400">
                        ≈ {formatMoney(tx.monto_usd_calculado, 'USD')}
                      </p>
                    )}
                  </div>
                  
                  {!tx.anulada && (
                    <button 
                      onClick={() => handleAnular(tx.id)}
                      disabled={isAnulando}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Anular transacción"
                    >
                      <Ban className="w-4 h-4" />
                    </button>
                  )}
                  {tx.anulada && (
                    <span className="text-xs font-bold text-red-500 bg-red-100 px-2 py-1 rounded">ANULADA</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Crear */}
      {modalMode === 'create' && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden my-8">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 sticky top-0 bg-white z-10">
              <h2 className="text-xl font-bold text-slate-900">Nueva Transacción</h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 mb-2">
                <button
                  type="button"
                  onClick={() => setFormData({...formData, tipo: 'gasto'})}
                  className={`py-2 rounded-lg font-medium border-2 transition-all ${
                    formData.tipo === 'gasto' ? 'border-red-500 bg-red-50 text-red-700' : 'border-transparent bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Gasto
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({...formData, tipo: 'ingreso'})}
                  className={`py-2 rounded-lg font-medium border-2 transition-all ${
                    formData.tipo === 'ingreso' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-transparent bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Ingreso
                </button>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Cuenta origen/destino</label>
                <select
                  required
                  value={formData.cuenta_id}
                  onChange={e => setFormData({...formData, cuenta_id: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                >
                  <option value="" disabled>Seleccione una cuenta</option>
                  {cuentas?.filter(c => c.activa).map(c => (
                    <option key={c.id} value={c.id}>{c.nombre} ({c.moneda}) - {formatMoney(c.saldo_cache, c.moneda)}</option>
                  ))}
                </select>
                
                {/* AVISO IMPORTANTE SOBRE LA TASA DE CAMBIO */}
                {cuentaSeleccionada?.moneda === 'VES' && (
                  <div className="mt-2 p-3 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-800 flex flex-col gap-1">
                    <span className="font-semibold">Información de conversión:</span>
                    {tasaActual ? (
                      <>
                        <span>Tasa actual: <strong className="text-blue-900 font-bold">{tasaActual} VES/USD</strong>.</span>
                        {formData.monto_original && Number(formData.monto_original) > 0 && (
                          <span className="mt-1 bg-white/50 px-2 py-1 rounded inline-block w-max">
                            Equivalente estimado: <strong className="text-emerald-700">≈ ${(Number(formData.monto_original) / tasaActual).toFixed(2)} USD</strong>
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-red-600 font-bold">¡Atención! No hay tasa de cambio registrada en el sistema. La transacción fallará.</span>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Monto ({cuentaSeleccionada?.moneda || '...'})</label>
                <input
                  type="number"
                  required
                  step="0.01"
                  min="0.01"
                  value={formData.monto_original}
                  onChange={e => setFormData({...formData, monto_original: e.target.value})}
                  className="w-full px-4 py-2 text-xl font-bold border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Categoría</label>
                <select
                  required
                  value={formData.categoria_id}
                  onChange={e => setFormData({...formData, categoria_id: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                >
                  <option value="" disabled>Seleccione una categoría</option>
                  {categorias?.filter(c => c.tipo === formData.tipo || c.tipo === 'ahorro' || c.tipo === 'deuda').map(c => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Descripción (Opcional)</label>
                <input
                  type="text"
                  value={formData.descripcion}
                  onChange={e => setFormData({...formData, descripcion: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="Ej: Mercado quincenal"
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
                  {error}
                </div>
              )}

              <div className="pt-4 flex gap-3 pb-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
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
