'use client'

import { useState } from 'react'
import { useMetas, useCrearMeta, useAgregarAporte, Meta } from '@/hooks/useMetas'
import { useCuentas } from '@/hooks/useCuentas'
import { PiggyBank, Plus, X, Loader2, ArrowUpCircle } from 'lucide-react'

export const dynamic = 'force-dynamic';

export default function AhorrosPage() {
  const { data: metas, isLoading } = useMetas()
  const { data: cuentas } = useCuentas()
  
  const { mutateAsync: crearMeta, isPending: isCreating } = useCrearMeta()
  const { mutateAsync: agregarAporte, isPending: isAdding } = useAgregarAporte()

  const [modalMode, setModalMode] = useState<'create' | 'aporte' | null>(null)
  const [metaActual, setMetaActual] = useState<Meta | null>(null)
  
  const [formData, setFormData] = useState({
    nombre: '',
    monto_objetivo: '',
    moneda: 'USD',
    fecha_objetivo: ''
  })
  
  const [aporteData, setAporteData] = useState({
    cuenta_id: '',
    monto: ''
  })

  const openCreate = () => {
    setFormData({ nombre: '', monto_objetivo: '', moneda: 'USD', fecha_objetivo: '' })
    setModalMode('create')
  }

  const openAporte = (meta: Meta) => {
    setMetaActual(meta)
    setAporteData({ cuenta_id: cuentas?.find(c => c.activa)?.id || '', monto: '' })
    setModalMode('aporte')
  }

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await crearMeta({
        nombre: formData.nombre,
        monto_objetivo: Number(formData.monto_objetivo),
        moneda: formData.moneda,
        fecha_objetivo: formData.fecha_objetivo || null
      })
      setModalMode(null)
    } catch (err) {
      alert('Error al crear meta')
    }
  }

  const handleAporteSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!metaActual) return
    const cuenta = cuentas?.find(c => c.id === aporteData.cuenta_id)
    if (!cuenta) return

    try {
      await agregarAporte({
        meta_id: metaActual.id,
        cuenta_id: cuenta.id,
        monto: Number(aporteData.monto),
        moneda_cuenta: cuenta.moneda,
        fecha: new Date()
      })
      setModalMode(null)
    } catch (err: any) {
      alert(err.message || 'Error al registrar aporte')
    }
  }

  const formatMoney = (val: number, mon: string) => new Intl.NumberFormat(mon === 'USD' ? 'en-US' : 'es-VE', { style: 'currency', currency: mon }).format(val)

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-5xl mx-auto pb-24 md:pb-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Metas de Ahorro</h1>
          <p className="text-slate-500 text-sm mt-1">Registra y sigue tu progreso para alcanzar tus objetivos</p>
        </div>
        <button
          onClick={openCreate}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nueva Meta
        </button>
      </header>

      {isLoading ? (
        <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>
      ) : metas?.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 shadow-sm flex flex-col items-center">
          <PiggyBank className="w-16 h-16 text-slate-300 mb-4" />
          <p className="text-lg font-medium text-slate-900">No hay metas de ahorro</p>
          <p className="text-sm mt-1 mb-6">Establece un objetivo para empezar a ahorrar.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {metas?.map(meta => {
            const progreso = Math.min((meta.monto_actual / meta.monto_objetivo) * 100, 100)
            const completado = progreso >= 100

            return (
              <div key={meta.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-lg text-slate-900">{meta.nombre}</h3>
                      {meta.fecha_objetivo && (
                        <p className="text-xs text-slate-500 mt-1">Objetivo: {new Date(meta.fecha_objetivo).toLocaleDateString()}</p>
                      )}
                    </div>
                    <div className="bg-blue-50 text-blue-700 font-bold px-3 py-1 rounded-full text-sm">
                      {Math.round(progreso)}%
                    </div>
                  </div>

                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-600 font-medium">{formatMoney(meta.monto_actual, meta.moneda)}</span>
                    <span className="text-slate-400">/ {formatMoney(meta.monto_objetivo, meta.moneda)}</span>
                  </div>
                  
                  <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden mb-6">
                    <div 
                      className={`h-full transition-all duration-1000 rounded-full ${completado ? 'bg-emerald-500' : 'bg-blue-500'}`}
                      style={{ width: `${progreso}%` }}
                    />
                  </div>
                </div>

                <button
                  onClick={() => openAporte(meta)}
                  disabled={completado}
                  className={`w-full py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors ${
                    completado 
                    ? 'bg-emerald-50 text-emerald-600 cursor-default' 
                    : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {completado ? (
                    '¡Meta Completada!'
                  ) : (
                    <>
                      <ArrowUpCircle className="w-5 h-5 text-emerald-600" />
                      Agregar Aporte
                    </>
                  )}
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal Crear Meta */}
      {modalMode === 'create' && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
            <div className="flex justify-between items-center p-5 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">Nueva Meta de Ahorro</h2>
              <button onClick={() => setModalMode(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateSubmit} className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Nombre de la meta</label>
                <input required type="text" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} className="w-full px-4 py-2 border rounded-lg focus:ring-2 outline-none" placeholder="Ej: Viaje, Fondo de Emergencia" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Objetivo</label>
                  <input required type="number" step="0.01" min="1" value={formData.monto_objetivo} onChange={e => setFormData({...formData, monto_objetivo: e.target.value})} className="w-full px-4 py-2 font-bold border rounded-lg outline-none" placeholder="0.00" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Moneda</label>
                  <select value={formData.moneda} onChange={e => setFormData({...formData, moneda: e.target.value})} className="w-full px-4 py-2 border rounded-lg bg-white outline-none">
                    <option value="USD">USD</option>
                    <option value="VES">VES</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Fecha Límite (Opcional)</label>
                <input type="date" value={formData.fecha_objetivo} onChange={e => setFormData({...formData, fecha_objetivo: e.target.value})} className="w-full px-4 py-2 border rounded-lg outline-none" />
              </div>
              <button type="submit" disabled={isCreating} className="w-full bg-emerald-600 text-white font-medium py-2.5 rounded-lg flex justify-center">{isCreating ? <Loader2 className="w-5 h-5 animate-spin"/> : 'Crear Meta'}</button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Agregar Aporte */}
      {modalMode === 'aporte' && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
            <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Agregar Aporte</h2>
                <p className="text-sm text-slate-500">{metaActual?.nombre}</p>
              </div>
              <button onClick={() => setModalMode(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleAporteSubmit} className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Cuenta de origen (De dónde sale el dinero)</label>
                <select required value={aporteData.cuenta_id} onChange={e => setAporteData({...aporteData, cuenta_id: e.target.value})} className="w-full px-4 py-2 border rounded-lg bg-white outline-none">
                  {cuentas?.filter(c => c.activa).map(c => (
                    <option key={c.id} value={c.id}>{c.nombre} - Disp: {formatMoney(c.saldo_cache, c.moneda)}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Monto del Aporte</label>
                <input required type="number" step="0.01" min="0.01" value={aporteData.monto} onChange={e => setAporteData({...aporteData, monto: e.target.value})} className="w-full px-4 py-2 text-xl font-bold border rounded-lg outline-none" placeholder="0.00" />
              </div>
              <p className="text-xs text-slate-500 bg-blue-50 p-3 rounded-lg border border-blue-100">
                Se creará una transacción de tipo <strong>gasto</strong> en la cuenta seleccionada, categorizada como "Ahorro", y se sumará a esta meta.
              </p>
              <button type="submit" disabled={isAdding} className="w-full bg-emerald-600 text-white font-medium py-2.5 rounded-lg flex justify-center">{isAdding ? <Loader2 className="w-5 h-5 animate-spin"/> : 'Registrar Aporte'}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
