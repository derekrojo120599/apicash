'use client'

import { useSyncExternalStore } from 'react'
import Link from 'next/link'
import {
  usePapeleraTransacciones,
  useRestaurarTransaccionPapelera,
  useEliminarTransaccionDefinitiva,
  type Transaccion
} from '@/hooks/useTransacciones'
import { useToast } from '@/hooks/useToast'
import { ArrowLeft, Trash2, RotateCcw, AlertTriangle, Inbox } from 'lucide-react'
import { FadeIn, StaggerContainer, AnimatedCard } from '@/components/animations'
import { ArdillaMascot } from '@/components/ArdillaMascot'

export const dynamic = 'force-dynamic'

export default function TrashPage() {
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )

  const { data: transacciones, isLoading } = usePapeleraTransacciones()
  const { mutateAsync: restaurar, isPending: isRestoring } = useRestaurarTransaccionPapelera()
  const { mutateAsync: purgar, isPending: isPurging } = useEliminarTransaccionDefinitiva()
  const { success: toastSuccess, error: toastError } = useToast()

  const handleRestaurar = async (id: string) => {
    try {
      await restaurar(id)
      toastSuccess({
        title: 'Transacción restaurada',
        message: 'El saldo y presupuesto se han recalculado correctamente.'
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error desconocido'
      toastError({ title: 'Error al restaurar', message: msg })
    }
  }

  const handlePurgar = async (id: string) => {
    if (confirm('¿Eliminar definitivamente? Esta acción no se puede deshacer.')) {
      try {
        await purgar(id)
        toastSuccess({
          title: 'Eliminada definitivamente',
          message: 'La transacción fue purgada del historial.'
        })
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error desconocido'
        toastError({ title: 'Error al eliminar', message: msg })
      }
    }
  }

  const formatMoney = (amount: number, currency: string) => {
    return new Intl.NumberFormat(currency === 'USD' ? 'en-US' : 'es-VE', {
      style: 'currency',
      currency: currency
    }).format(amount)
  }

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-5xl mx-auto pb-24 md:pb-8">
      {/* Header */}
      <FadeIn as="header" className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/transacciones"
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-400 transition-colors"
            title="Volver a transacciones"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Trash2 className="w-6 h-6 text-red-500" />
              Papelera de reciclaje
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
              Movimientos eliminados recientemente
            </p>
          </div>
        </div>
      </FadeIn>

      {/* Info Banner */}
      <FadeIn delay={100}>
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 p-4 rounded-2xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <p className="text-xs md:text-sm text-amber-800 dark:text-amber-300">
            Los elementos enviados a la papelera revierten su impacto contable en cuentas y presupuestos. Permanecen aquí durante 30 días antes de ser eliminados de forma definitiva.
          </p>
        </div>
      </FadeIn>

      {/* List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400">Cargando elementos en papelera...</div>
        ) : !transacciones || transacciones.length === 0 ? (
          <FadeIn delay={200}>
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-800 flex flex-col items-center">
              <ArdillaMascot mood="searching" size={80} className="mb-3" />
              <h3 className="font-semibold text-slate-700 dark:text-slate-200 text-lg">La papelera está vacía</h3>
              <p className="text-slate-400 text-sm mt-1 max-w-sm mx-auto">
                No tienes transacciones eliminadas pendientes de restaurar o purgar.
              </p>
            </div>
          </FadeIn>
        ) : (
          <StaggerContainer className="space-y-3">
            {transacciones.map((tx: Transaccion) => (
              <AnimatedCard
                key={tx.id}
                className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase">
                      {tx.tipo}
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {tx.descripcion || tx.categorias?.nombre || 'Sin descripción'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 dark:text-slate-500 mt-1 flex items-center gap-2">
                    <span>{tx.cuentas?.nombre || 'Cuenta'}</span>
                    <span>•</span>
                    <span>
                      {mounted && tx.deleted_at
                        ? new Date(tx.deleted_at).toLocaleDateString('es-ES', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        : ''}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <p className="font-bold text-slate-700 dark:text-slate-300 line-through">
                      {formatMoney(tx.monto_original, tx.moneda_original)}
                    </p>
                    {tx.moneda_original === 'VES' && (
                      <p className="text-xs text-slate-400">
                        ≈ {formatMoney(tx.monto_usd_calculado, 'USD')}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleRestaurar(tx.id)}
                      disabled={isRestoring}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 rounded-lg transition-colors border border-emerald-200 dark:border-emerald-800/40"
                      title="Restaurar y reintegrar al saldo"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Restaurar
                    </button>
                    <button
                      onClick={() => handlePurgar(tx.id)}
                      disabled={isPurging}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors"
                      title="Eliminar definitivamente"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </AnimatedCard>
            ))}
          </StaggerContainer>
        )}
      </div>
    </div>
  )
}
