'use client';

import { useState, useMemo } from 'react'
import { X } from 'lucide-react'
import { useCuentas } from '@/hooks/useCuentas'
import { useCategorias, useTasaActual } from '@/hooks/useAuxiliares'
import { useCrearTransaccion, useCrearTransferencia } from '@/hooks/useTransacciones'
import { useComisionesConfig } from '@/hooks/useComisionesConfig'
import { previewComision } from '@/utils/comisiones'
import { AnimatedSelect } from '@/components/animations'
import { CreatableCategorySelect } from '@/components/CreatableCategorySelect'

interface NewTransactionModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function NewTransactionModal({ isOpen, onClose, onSuccess }: NewTransactionModalProps) {
  const { data: accounts } = useCuentas()
  const { data: categories } = useCategorias()
  const { data: currentRate } = useTasaActual()
  const { data: commissionsConfig } = useComisionesConfig()
  const { mutateAsync: createTransaction } = useCrearTransaccion()
  const { mutateAsync: createTransfer } = useCrearTransferencia()

  const [formData, setFormData] = useState({
    cuenta_id: '',
    cuenta_destino_id: '',
    categoria_id: '',
    tipo: 'gasto',
    monto_original: '',
    descripcion: ''
  })
  const [operationSubtype, setOperationSubtype] = useState<string | null>(null)
  const [isFailed, setIsFailed] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Sync default account when opening the modal if no account is selected
  const activeAccountId = useMemo(() => {
    return accounts?.find(c => c.activa)?.id || ''
  }, [accounts])

  const selectedAccount = useMemo(() => {
    const accountId = formData.cuenta_id || activeAccountId
    return accounts?.find(c => c.id === accountId)
  }, [formData.cuenta_id, activeAccountId, accounts])

  const currentComision = useMemo(() => {
    if (!operationSubtype || !formData.monto_original || !commissionsConfig) return null;
    const config = commissionsConfig.find(c => c.subtipo_operacion === operationSubtype);
    if (!config) return null;

    try {
      return previewComision(
        formData.monto_original,
        config,
        isFailed
      );
    } catch {
      return null;
    }
  }, [operationSubtype, formData.monto_original, commissionsConfig, isFailed])

  const formatMoney = (monto: number, moneda: string) => {
    return new Intl.NumberFormat(moneda === 'USD' ? 'en-US' : 'es-VE', { 
      style: 'currency', 
      currency: moneda 
    }).format(monto)
  }

  const handleClose = () => {
    setError('')
    setOperationSubtype(null)
    setIsFailed(false)
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (isSubmitting) return
    setError('')
    
    const currentAccount = selectedAccount
    if (!currentAccount) {
      setError('Seleccione una cuenta válida')
      return
    }

    const accountId = formData.cuenta_id || currentAccount.id

    if (formData.tipo !== 'transferencia' && !formData.categoria_id) {
      setError('Seleccione una categoría')
      return
    }

    if (formData.tipo === 'transferencia' && !formData.cuenta_destino_id) {
      setError('Seleccione una cuenta de destino')
      return
    }

    if (formData.tipo === 'transferencia' && accountId === formData.cuenta_destino_id) {
      setError('La cuenta origen y destino no pueden ser la misma')
      return
    }

    if ((formData.tipo === 'gasto' || formData.tipo === 'transferencia') && Number(formData.monto_original) > currentAccount.saldo_cache) {
      setError(`El monto principal supera el saldo disponible. Hay ${formatMoney(currentAccount.saldo_cache, currentAccount.moneda)} en esta cuenta.`)
      return
    }

    setIsSubmitting(true)
    try {
      if (formData.tipo === 'transferencia') {
        const destinationAccount = accounts?.find(c => c.id === formData.cuenta_destino_id)
        if (!destinationAccount) throw new Error('Cuenta destino inválida')
        
        if (currentAccount.moneda !== destinationAccount.moneda) {
          setError('Por ahora solo se permiten transferencias entre cuentas con la misma moneda')
          return
        }

        // Registrar transferencia atómica (partida doble con tipo='transferencia')
        await createTransfer({
          cuenta_origen_id: accountId,
          cuenta_destino_id: formData.cuenta_destino_id,
          monto: Number(formData.monto_original),
          moneda: currentAccount.moneda,
          descripcion: formData.descripcion || undefined,
          tasa_cambio: currentRate || null
        })

      } else {
        await createTransaction({
          cuenta_id: accountId,
          categoria_id: formData.categoria_id || undefined,
          tipo: formData.tipo,
          monto_original: Number(formData.monto_original),
          moneda_original: currentAccount.moneda,
          descripcion: formData.descripcion,
          subtipo_operacion: operationSubtype || null,
          es_fallida: isFailed,
          tasa_cambio: currentRate || null
        })
      }

      handleClose()
      onSuccess?.()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al guardar la transacción'
      setError(msg.includes('No hay tasa de cambio') ? 'No hay tasa de cambio disponible. Contacte a soporte.' : msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-slate-900/50 dark:bg-slate-950/80 flex items-end md:items-center justify-center md:p-4 z-50 transition-all">
      <div className="bg-white dark:bg-slate-900 rounded-t-2xl md:rounded-2xl w-full md:max-w-md shadow-xl overflow-visible mt-auto md:my-8 border-t md:border border-slate-200 dark:border-slate-800 max-h-[90vh] md:max-h-none flex flex-col">
        <div className="flex justify-between items-center p-4 md:p-6 border-b border-slate-100 dark:border-slate-800/60 sticky top-0 bg-white dark:bg-slate-900 rounded-t-2xl z-10 transition-colors">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Nueva Transacción</h2>
          <button onClick={handleClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4 overflow-y-auto">
          <div className="flex flex-wrap gap-2 mb-4">
            <div className="flex-1 min-w-[100px]">
              <button
                type="button"
                onClick={() => setFormData({...formData, tipo: 'gasto'})}
                className={`w-full py-2 px-2 rounded-lg font-medium border-2 transition-all text-sm sm:text-base ${
                  formData.tipo === 'gasto' ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400' : 'border-transparent bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                Gasto
              </button>
            </div>
            <div className="flex-1 min-w-[100px]">
              <button
                type="button"
                onClick={() => setFormData({...formData, tipo: 'ingreso'})}
                className={`w-full py-2 px-2 rounded-lg font-medium border-2 transition-all text-sm sm:text-base ${
                  formData.tipo === 'ingreso' ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400' : 'border-transparent bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                Ingreso
              </button>
            </div>
            <div className="flex-1 min-w-[100px]">
              <button
                type="button"
                onClick={() => setFormData({...formData, tipo: 'transferencia'})}
                className={`w-full py-2 px-2 rounded-lg font-medium border-2 transition-all text-sm sm:text-base ${
                  formData.tipo === 'transferencia' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400' : 'border-transparent bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                Traspaso
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {formData.tipo === 'transferencia' ? 'Cuenta origen' : 'Cuenta origen/destino'}
            </label>
            <AnimatedSelect
              value={formData.cuenta_id || activeAccountId}
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
            
            {/* Exchange rate warning */}
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

          {formData.tipo === 'gasto' && selectedAccount?.tipo === 'banco' && (
            <div className="space-y-4 mb-4">
              <div className="space-y-1 animate-in fade-in zoom-in-95 duration-200">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Método de pago</label>
                <AnimatedSelect
                  value={operationSubtype || ''}
                  onChange={(v) => setOperationSubtype(v === '' ? null : v)}
                  options={
                    selectedAccount.moneda === 'VES' ? [
                      { value: '', label: 'Seleccione un método', disabled: true },
                      { value: 'pm_p2p', label: '📱 Pago Móvil' },
                      { value: 'pm_p2c', label: '🏢 Pago Móvil Empresa (P2C)' },
                      { value: 'punto_venta', label: '💳 Punto de Venta' },
                      { value: 'transferencia_mismo_banco', label: '🏦 Transferencia (Mismo Banco)' },
                      { value: 'transferencia_interbancaria', label: '⏳ Transferencia (Otros Bancos)' }
                    ] : [
                      { value: '', label: 'Seleccione un método', disabled: true },
                      { value: 'tarjeta_usd_nacional', label: '💳 Tarjeta en Dólares (Aplica IGTF)' },
                      { value: 'transferencia_usd', label: '🏦 Transferencia / Retiro' }
                    ]
                  }
                  placeholder="Seleccione el método"
                  accent="emerald"
                />
              </div>

              {operationSubtype && ['pm_p2p', 'pm_p2c', 'transferencia_interbancaria'].includes(operationSubtype) && (
                <label className="flex items-center gap-2 cursor-pointer animate-in fade-in duration-200">
                  <input 
                    type="checkbox" 
                    checked={isFailed}
                    onChange={e => setIsFailed(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Operación fallida (solo cobra comisión por intento)
                  </span>
                </label>
              )}

              {currentComision && (
                <div className="mt-2 p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/50 rounded-lg text-sm text-indigo-800 dark:text-indigo-300 flex flex-col gap-1 transition-colors animate-in fade-in zoom-in-95 duration-200">
                  <span className="font-semibold">Comisión estimada (BCV):</span>
                  <span>Se cobrará una comisión de <strong className="text-indigo-900 dark:text-indigo-200 font-bold">{currentComision.comisionFinal} VES</strong>.</span>
                  {Number(currentComision.comisionFinal) > 0 && currentRate && (
                    <span className="mt-1 bg-white/50 dark:bg-slate-950/50 px-2 py-1 rounded inline-block w-max">
                      Equivalente: <strong className="text-indigo-900 dark:text-indigo-200">≈ ${(Number(currentComision.comisionFinal) / currentRate).toFixed(2)} USD</strong>
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {formData.tipo === 'transferencia' && (
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Cuenta destino</label>
              <AnimatedSelect
                value={formData.cuenta_destino_id}
                onChange={(v) => setFormData({...formData, cuenta_destino_id: v})}
                options={[
                  { value: '', label: 'Seleccione una cuenta destino', disabled: true },
                  ...(accounts?.filter(c => c.activa && c.moneda === selectedAccount?.moneda && c.id !== (formData.cuenta_id || activeAccountId)).map(c => ({
                    value: c.id,
                    label: `${c.nombre} (${c.moneda})`
                  })) || [])
                ]}
                placeholder="Seleccione una cuenta destino"
                required
                accent="emerald"
              />
              {formData.tipo === 'transferencia' && selectedAccount && accounts?.filter(c => c.activa && c.moneda === selectedAccount.moneda && c.id !== (formData.cuenta_id || activeAccountId)).length === 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                  No dispone de otra cuenta en {selectedAccount.moneda} diferente a la de origen para recibir la transferencia.
                </p>
              )}
            </div>
          )}

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

          {formData.tipo !== 'transferencia' && (
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
          )}

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
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium flex justify-center items-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
