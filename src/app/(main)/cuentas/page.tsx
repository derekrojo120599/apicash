'use client'

import { useState } from 'react'
import { useCuentas, useCrearCuenta, useActualizarCuenta, Cuenta } from '@/hooks/useCuentas'
import { WalletCards, Plus, MoreVertical, Building2, Coins, Landmark, Smartphone, Loader2, X } from 'lucide-react'
import { FadeIn, StaggerContainer, AnimatedCard, AnimatedButton, AnimatedLoader, AnimatedNumber, AnimatedSelect } from '@/components/animations'

export const dynamic = 'force-dynamic';

type ModalMode = 'create' | 'edit' | null

export default function CuentasPage() {
  const { data: cuentas, isLoading } = useCuentas()
  const { mutateAsync: crearCuenta, isPending: isCreating } = useCrearCuenta()
  const { mutateAsync: actualizarCuenta, isPending: isUpdating } = useActualizarCuenta()

  const [modalMode, setModalMode] = useState<ModalMode>(null)
  const [cuentaActual, setCuentaActual] = useState<Partial<Cuenta> | null>(null)
  const [error, setError] = useState('')

  const openCreateModal = () => {
    setCuentaActual({ nombre: '', tipo: 'banco', moneda: 'USD' })
    setError('')
    setModalMode('create')
  }

  const openEditModal = (cuenta: Cuenta) => {
    setCuentaActual(cuenta)
    setError('')
    setModalMode('edit')
  }

  const closeModal = () => {
    setModalMode(null)
    setCuentaActual(null)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    
    try {
      if (modalMode === 'create') {
        await crearCuenta({
          nombre: cuentaActual!.nombre!,
          tipo: cuentaActual!.tipo as any,
          moneda: cuentaActual!.moneda as any,
        })
      } else if (modalMode === 'edit') {
        await actualizarCuenta({
          id: cuentaActual!.id!,
          nombre: cuentaActual!.nombre!,
          tipo: cuentaActual!.tipo as any,
          // La moneda NO se envía en la actualización intencionalmente
        })
      }
      closeModal()
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error')
    }
  }

  const handleToggleActiva = async (cuenta: Cuenta) => {
    try {
      await actualizarCuenta({
        id: cuenta.id,
        activa: !cuenta.activa
      })
    } catch (err) {
      console.error('Error al cambiar estado', err)
    }
  }

  const getIcon = (tipo: string) => {
    switch(tipo) {
      case 'banco': return <Building2 className="w-5 h-5" />
      case 'efectivo': return <Coins className="w-5 h-5" />
      case 'exchange': return <Landmark className="w-5 h-5" />
      case 'billetera_digital': return <Smartphone className="w-5 h-5" />
      default: return <WalletCards className="w-5 h-5" />
    }
  }

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      <FadeIn as="header" className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Mis Cuentas</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Administra tus billeteras y cuentas bancarias</p>
        </div>
        <AnimatedButton onClick={openCreateModal}>
          <Plus className="w-5 h-5" />
          Nueva cuenta
        </AnimatedButton>
      </FadeIn>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <AnimatedLoader size={48} color="#10b981" />
        </div>
      ) : cuentas?.length === 0 ? (
        <FadeIn>
          <AnimatedCard className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center text-slate-500 dark:text-slate-400 shadow-sm flex flex-col items-center cursor-default">
            <WalletCards className="w-16 h-16 text-slate-300 dark:text-slate-600 mb-4" />
            <p className="text-lg font-medium text-slate-900 dark:text-slate-200">No tienes cuentas registradas</p>
            <p className="text-sm mt-1 mb-6">Crea tu primera cuenta para empezar a registrar transacciones.</p>
            <AnimatedButton variant="secondary" onClick={openCreateModal}>
              Crear primera cuenta
            </AnimatedButton>
          </AnimatedCard>
        </FadeIn>
      ) : (
        <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" staggerDelay={100}>
          {cuentas?.map(cuenta => (
            <AnimatedCard
              data-anime
              key={cuenta.id}
              className={`bg-white dark:bg-slate-900 rounded-2xl border ${cuenta.activa ? 'border-slate-200 dark:border-slate-800' : 'border-slate-200 dark:border-slate-800 opacity-60'} p-5 shadow-sm relative overflow-hidden cursor-default`}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${cuenta.moneda === 'USD' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'}`}>
                    {getIcon(cuenta.tipo)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-slate-200">{cuenta.nombre}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">{cuenta.tipo.replace('_', ' ')} • {cuenta.moneda}</p>
                  </div>
                </div>

                {/* Opciones */}
                <div className="flex gap-2">
                  <button
                    onClick={() => openEditModal(cuenta)}
                    className="text-slate-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors text-sm font-medium px-2 py-1"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleToggleActiva(cuenta)}
                    className={`text-sm font-medium px-2 py-1 rounded-md transition-colors ${cuenta.activa ? 'text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20' : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'}`}
                  >
                    {cuenta.activa ? 'Desactivar' : 'Activar'}
                  </button>
                </div>
              </div>

              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Saldo actual</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  <AnimatedNumber
                    value={cuenta.saldo_cache}
                    formatter={(v) => new Intl.NumberFormat(cuenta.moneda === 'USD' ? 'en-US' : 'es-VE', { style: 'currency', currency: cuenta.moneda }).format(v)}
                    duration={1200}
                  />
                </p>
              </div>

              {!cuenta.activa && (
                <div className="absolute top-0 right-0 bg-slate-800 dark:bg-slate-700 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg">
                  INACTIVA
                </div>
              )}
            </AnimatedCard>
          ))}
        </StaggerContainer>
      )}

      {/* Modal */}
      {modalMode && (
        <div className="fixed inset-0 bg-slate-900/50 dark:bg-slate-950/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm transition-all">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-xl overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800/60">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {modalMode === 'create' ? 'Nueva Cuenta' : 'Editar Cuenta'}
              </h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Nombre de la cuenta</label>
                <input
                  type="text"
                  required
                  value={cuentaActual?.nombre || ''}
                  onChange={e => setCuentaActual({...cuentaActual, nombre: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-transparent text-slate-900 dark:text-slate-100 transition-colors"
                  placeholder="Ej: Banesco, Binance, Efectivo..."
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Tipo de cuenta</label>
                <AnimatedSelect
                  value={cuentaActual?.tipo || 'banco'}
                  onChange={(v) => setCuentaActual({...cuentaActual, tipo: v as Cuenta['tipo']})}
                  options={[
                    { value: 'banco', label: 'Banco' },
                    { value: 'efectivo', label: 'Efectivo' },
                    { value: 'exchange', label: 'Exchange (Ej: Binance)' },
                    { value: 'billetera_digital', label: 'Billetera Digital (Ej: Zinli, Paypal)' },
                  ]}
                  placeholder="Seleccione tipo de cuenta"
                  accent="emerald"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Moneda</label>
                <AnimatedSelect
                  value={cuentaActual?.moneda || 'USD'}
                  onChange={(v) => setCuentaActual({...cuentaActual, moneda: v as Cuenta['moneda']})}
                  options={[
                    { value: 'USD', label: 'Dólar Estadounidense (USD)' },
                    { value: 'VES', label: 'Bolívar Soberano (VES)' },
                  ]}
                  placeholder="Seleccione moneda"
                  disabled={modalMode === 'edit'}
                  accent="emerald"
                />
                {modalMode === 'edit' && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">La moneda no se puede cambiar una vez creada la cuenta.</p>
                )}
              </div>

              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg border border-red-100 dark:border-red-900/50">
                  {error}
                </div>
              )}

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreating || isUpdating}
                  className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium flex justify-center items-center"
                >
                  {isCreating || isUpdating ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
