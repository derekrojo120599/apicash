'use client'

import { useMemo, useSyncExternalStore } from 'react'
import { useTasasFuentes } from '@/hooks/useTasasFuentes'
import { useTasaActual } from '@/hooks/useAuxiliares'
import { calcularBrechaCambiaria, formatMoney } from '@apicash/shared'
import { MonitorBrechaWidget } from '@/components/MonitorBrechaWidget'
import { FadeIn, StaggerContainer, AnimatedCard } from '@/components/animations'
import { TrendingUp, Quote, Star } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default function MonitorTasasPage() {
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )

  const { data: fuentes, isLoading } = useTasasFuentes()
  const { data: tasaPredeterminada } = useTasaActual()

  // Same official (BCV) vs P2P detection used by the mobile screen and the widget
  const { tasaOficial, tasaParalelo } = useMemo(() => {
    if (!fuentes || fuentes.length === 0) return { tasaOficial: 0, tasaParalelo: 0 }

    const bcv = fuentes.find(f =>
      f.fuente.toLowerCase().includes('bcv') || f.fuente.toLowerCase().includes('banco central')
    )
    const p2p = fuentes.find(f =>
      f.fuente.toLowerCase().includes('p2p') ||
      f.fuente.toLowerCase().includes('paralelo') ||
      f.fuente.toLowerCase().includes('binance')
    )

    return {
      tasaOficial: bcv ? bcv.tasa : fuentes[0].tasa,
      tasaParalelo: p2p ? p2p.tasa : (fuentes.length > 1 ? fuentes[1].tasa : fuentes[0].tasa)
    }
  }, [fuentes])

  const brecha = useMemo(() => calcularBrechaCambiaria(tasaOficial, tasaParalelo), [tasaOficial, tasaParalelo])

  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-3xl mx-auto pb-24 md:pb-8">
      {/* Header */}
      <FadeIn as="header">
        <div className="flex items-center gap-3">
          <div className="bg-primary-100 dark:bg-primary-900/30 p-2 rounded-xl text-primary-600 dark:text-primary-400">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Monitor de Tasas</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
              Cotizaciones en vivo y brecha cambiaria entre la tasa oficial y el mercado P2P
            </p>
          </div>
        </div>
      </FadeIn>

      {/* Brecha cambiaria (reuses the shared web widget) */}
      <FadeIn delay={100}>
        <MonitorBrechaWidget />
      </FadeIn>

      {/* Live gap advice, mirroring the mobile screen */}
      {!isLoading && brecha.porcentajeBrecha > 0 && mounted && (
        <FadeIn delay={150}>
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-2xl p-4 flex items-start gap-2.5">
            <TrendingUp className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs md:text-sm text-amber-800 dark:text-amber-300">
              Tu dinero rinde un {brecha.porcentajeBrecha}% más en comercios que cobran a tasa BCV si antes cambias divisas por P2P.
            </p>
          </div>
        </FadeIn>
      )}

      {/* Market quotes per source */}
      <FadeIn delay={200}>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Quote className="w-5 h-5 text-primary-500" />
          Cotizaciones del Mercado
        </h2>
      </FadeIn>

      <div className="space-y-3">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400">Cargando cotizaciones...</div>
        ) : !fuentes || fuentes.length === 0 ? (
          <FadeIn>
            <AnimatedCard className="bg-white dark:bg-slate-900 rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-800">
              <h3 className="font-semibold text-slate-700 dark:text-slate-200 text-lg">Sin cotizaciones aún</h3>
              <p className="text-slate-400 text-sm mt-1 max-w-sm mx-auto">
                No hay tasas registradas todavía. Vuelve a intentar en unos minutos cuando se actualicen las fuentes.
              </p>
            </AnimatedCard>
          </FadeIn>
        ) : (
          <StaggerContainer className="space-y-3">
            {fuentes.map((t) => (
              <AnimatedCard
                key={t.fuente}
                className="bg-white dark:bg-slate-900 p-4 md:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-900 dark:text-white truncate">{t.fuente}</span>
                    {tasaPredeterminada === t.tasa && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-900/50">
                        <Star className="w-3 h-3" />
                        Tu tasa
                      </span>
                    )}
                  </div>
                  {mounted && (
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                      {formatearFecha(t.ultima_fecha)}
                    </p>
                  )}
                </div>
                <p className="text-lg font-black text-primary-600 dark:text-primary-400 shrink-0">
                  Bs. {formatMoney(t.tasa)}
                </p>
              </AnimatedCard>
            ))}
          </StaggerContainer>
        )}
      </div>
    </div>
  )
}
