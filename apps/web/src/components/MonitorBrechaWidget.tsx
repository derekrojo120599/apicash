'use client'

import { useState, useMemo } from 'react'
import { useTasasFuentes } from '@/hooks/useTasasFuentes'
import {
  calcularBrechaCambiaria,
  analizarConvenienciaPago
} from '@apicash/shared'
import {
  TrendingUp,
  Percent,
  CheckCircle2,
  DollarSign,
  AlertTriangle,
  Lightbulb,
  ArrowRight
} from 'lucide-react'
import { AnimatedCard, AnimatedNumber } from '@/components/animations'

export function MonitorBrechaWidget({ className = '' }: { className?: string }) {
  const { data: fuentes, isLoading } = useTasasFuentes()
  const [montoSimulado, setMontoSimulado] = useState<string>('50')

  // Identificar tasa oficial (BCV) y alternativa (P2P / Paralelo)
  const { tasaOficial, tasaParalelo, fuenteParaleloNombre } = useMemo(() => {
    if (!fuentes || fuentes.length === 0) {
      return { tasaOficial: 0, tasaParalelo: 0, fuenteParaleloNombre: '' }
    }

    const bcv = fuentes.find(f => f.fuente.toLowerCase().includes('banco central') || f.fuente.toLowerCase().includes('bcv'))
    const p2p = fuentes.find(f =>
      f.fuente.toLowerCase().includes('p2p') ||
      f.fuente.toLowerCase().includes('paralelo') ||
      f.fuente.toLowerCase().includes('binance')
    )

    const of = bcv ? bcv.tasa : fuentes[0].tasa
    const par = p2p ? p2p.tasa : (fuentes.length > 1 ? fuentes[1].tasa : of)

    return {
      tasaOficial: of,
      tasaParalelo: par,
      fuenteParaleloNombre: p2p?.fuente || 'P2P / Paralelo'
    }
  }, [fuentes])

  const brecha = useMemo(() => {
    return calcularBrechaCambiaria(tasaOficial, tasaParalelo)
  }, [tasaOficial, tasaParalelo])

  const analisis = useMemo(() => {
    const val = parseFloat(montoSimulado)
    if (isNaN(val) || val <= 0) return null
    return analizarConvenienciaPago(val, tasaOficial, tasaParalelo)
  }, [montoSimulado, tasaOficial, tasaParalelo])

  const formatMoney = (amount: number, currency: string) => {
    return new Intl.NumberFormat(currency === 'USD' ? 'en-US' : 'es-VE', {
      style: 'currency',
      currency: currency
    }).format(amount)
  }

  if (isLoading) {
    return (
      <div className={`bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 text-center text-slate-400 text-sm ${className}`}>
        Cargando monitor de brecha cambiaria...
      </div>
    )
  }

  if (tasaOficial <= 0 || tasaParalelo <= 0) {
    return null
  }

  return (
    <AnimatedCard className={`bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 p-5 md:p-6 shadow-sm space-y-5 ${className}`}>
      {/* Header Brecha */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Monitor de Brecha Cambiaria
            </h3>
            <p className="text-xs text-slate-400">Oficial (BCV) vs {fuenteParaleloNombre}</p>
          </div>
        </div>

        {brecha.porcentajeBrecha > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 dark:bg-red-950/40 border border-red-200/60 dark:border-red-900/50 text-red-600 dark:text-red-400 font-extrabold text-xs">
            <span>+{brecha.porcentajeBrecha}%</span>
            <span className="text-[10px] uppercase font-semibold">brecha</span>
          </div>
        )}
      </div>

      {/* Grid de Tasas */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Tasa Oficial (BCV)
          </span>
          <p className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
            {formatMoney(tasaOficial, 'VES')}/$
          </p>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            P2P / Paralelo
          </span>
          <p className="text-lg font-black text-primary-600 dark:text-primary-400 mt-0.5">
            {formatMoney(tasaParalelo, 'VES')}/$
          </p>
        </div>
      </div>

      {/* Simulador de Inteligencia de Compra */}
      <div className="bg-gradient-to-br from-primary-50/50 via-teal-50/30 to-emerald-50/50 dark:from-slate-800/60 dark:to-slate-800/30 p-4 rounded-2xl border border-primary-100/60 dark:border-slate-700/60 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
            <Lightbulb className="w-4 h-4 text-amber-500" />
            <span>Inteligencia de Pago: ¿Cómo pagar hoy?</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
            Si la compra cuesta:
          </label>
          <div className="relative flex-1">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">$</span>
            <input
              type="number"
              step="1"
              min="1"
              value={montoSimulado}
              onChange={(e) => setMontoSimulado(e.target.value)}
              className="w-full pl-6 pr-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none"
              placeholder="50"
            />
          </div>
        </div>

        {analisis && (
          <div className="space-y-2 pt-1 text-xs">
            <div className="flex justify-between text-slate-600 dark:text-slate-300">
              <span>A tasa oficial pagarás:</span>
              <strong className="text-slate-900 dark:text-white">{formatMoney(analisis.costoEnVesOficial, 'VES')}</strong>
            </div>

            <div className="flex justify-between text-slate-600 dark:text-slate-300">
              <span>Cambiando en P2P te cuesta solo:</span>
              <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{formatMoney(analisis.usdEquivalenteEnParalelo, 'USD')}</strong>
            </div>

            {analisis.ahorroUsdSiPagaEnVes > 0 && (
              <div className="pt-2 border-t border-primary-200/40 dark:border-slate-700/50 flex items-center justify-between font-extrabold text-emerald-700 dark:text-emerald-300">
                <span>Tu ahorro estimado:</span>
                <span>+{formatMoney(analisis.ahorroUsdSiPagaEnVes, 'USD')} ({analisis.porcentajeAhorro}%)</span>
              </div>
            )}

            <p className="text-[11px] text-slate-500 dark:text-slate-400 italic pt-1">
              💡 {analisis.recomendacion}
            </p>
          </div>
        )}
      </div>
    </AnimatedCard>
  )
}
