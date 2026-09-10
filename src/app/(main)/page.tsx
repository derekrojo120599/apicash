'use client'

import Link from 'next/link'
import { useBalanceNeto, useResumenMes } from '@/hooks/useDashboard'
import { useUltimasTransacciones } from '@/hooks/useTransacciones'
import { Wallet, TrendingUp, TrendingDown, PiggyBank, Receipt, ArrowRightLeft, Plus } from 'lucide-react'
import {
  FadeIn,
  StaggerContainer,
  AnimatedNumber,
  AnimatedCard,
  AnimatedLoader,
  AnimatedButton,
} from '@/components/animations'

export const dynamic = 'force-dynamic';

export default function DashboardPage() {
  const { data: balance, isLoading: loadingBalance } = useBalanceNeto()
  const { data: resumen, isLoading: loadingResumen } = useResumenMes()
  const { data: transacciones, isLoading: loadingTx } = useUltimasTransacciones(5)

  const formatUSD = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
  }

  const formatVES = (value: number) => {
    return new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'VES' }).format(value)
  }

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      <FadeIn as="header" className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Resumen Financiero</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Control de tus finanzas en USD y VES</p>
        </div>
        <Link href="/transacciones">
          <AnimatedButton>
            <Plus className="w-4 h-4" />
            Nuevo movimiento
          </AnimatedButton>
        </Link>
      </FadeIn>

      {/* Main Balance Card */}
      <FadeIn delay={100}>
        <AnimatedCard className="bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Wallet className="w-32 h-32" />
          </div>
          <div className="relative z-10">
            <p className="text-emerald-100 font-medium mb-1">Balance Neto (USD)</p>
            <div className="flex items-end gap-3">
              {loadingBalance ? (
                <AnimatedLoader size={36} color="rgba(255,255,255,0.7)" />
              ) : (
                <h2 className="text-4xl font-bold">
                  <AnimatedNumber
                    value={balance?.balance_neto || 0}
                    formatter={formatUSD}
                    duration={1500}
                  />
                </h2>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-white/20">
              <div>
                <p className="text-emerald-100 text-sm mb-1">Total USD Fijo</p>
                {loadingBalance ? (
                  <AnimatedLoader size={24} color="rgba(255,255,255,0.7)" />
                ) : (
                  <p className="text-xl font-semibold">
                    <AnimatedNumber
                      value={balance?.usd_fijo || 0}
                      formatter={formatUSD}
                      duration={1200}
                      delay={200}
                    />
                  </p>
                )}
              </div>
              <div>
                <p className="text-emerald-100 text-sm mb-1">Total VES</p>
                {loadingBalance ? (
                  <AnimatedLoader size={24} color="rgba(255,255,255,0.7)" />
                ) : (
                  <div className="flex flex-col">
                    <p className="text-xl font-semibold">
                      <AnimatedNumber
                        value={balance?.ves_total || 0}
                        formatter={formatVES}
                        duration={1200}
                        delay={300}
                      />
                    </p>
                    <p className="text-xs text-emerald-200">
                      ≈ <AnimatedNumber value={balance?.ves_en_usd || 0} formatter={formatUSD} duration={1200} delay={400} /> a tasa de {balance?.tasa_usada || 0}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </AnimatedCard>
      </FadeIn>

      {/* Grid of smaller cards */}
      <StaggerContainer className="grid grid-cols-2 lg:grid-cols-4 gap-4" staggerDelay={120}>
        {/* Ingresos del Mes */}
        <AnimatedCard data-anime className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between cursor-default">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-emerald-100 dark:bg-emerald-900/30 p-2 rounded-full">
              <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Ingresos del mes</p>
          </div>
          {loadingResumen ? (
            <AnimatedLoader size={28} color="#10b981" />
          ) : (
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              <AnimatedNumber value={resumen?.ingresos || 0} formatter={formatUSD} duration={1200} />
            </p>
          )}
        </AnimatedCard>

        {/* Gastos del Mes */}
        <AnimatedCard data-anime className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between cursor-default">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-red-100 dark:bg-red-900/30 p-2 rounded-full">
              <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Gastos del mes</p>
          </div>
          {loadingResumen ? (
            <AnimatedLoader size={28} color="#ef4444" />
          ) : (
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              <AnimatedNumber value={resumen?.gastos || 0} formatter={formatUSD} duration={1200} />
            </p>
          )}
        </AnimatedCard>

        {/* Ahorros */}
        <AnimatedCard data-anime className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between cursor-default">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-full">
              <PiggyBank className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Ahorros</p>
          </div>
          {loadingResumen ? (
            <AnimatedLoader size={28} color="#3b82f6" />
          ) : (
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              <AnimatedNumber value={resumen?.ahorros || 0} formatter={formatUSD} duration={1200} />
            </p>
          )}
        </AnimatedCard>

        {/* Deuda */}
        <AnimatedCard data-anime className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between cursor-default">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-orange-100 dark:bg-orange-900/30 p-2 rounded-full">
              <Receipt className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Deuda actual</p>
          </div>
          {loadingResumen ? (
            <AnimatedLoader size={28} color="#f97316" />
          ) : (
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              <AnimatedNumber value={resumen?.deuda || 0} formatter={formatUSD} duration={1200} />
            </p>
          )}
        </AnimatedCard>
      </StaggerContainer>

      {/* Transacciones Recientes */}
      <FadeIn delay={400} className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Transacciones Recientes</h3>
          <Link href="/transacciones" className="text-sm text-emerald-600 dark:text-emerald-400 font-medium hover:underline">Ver todas</Link>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm transition-colors">
          {loadingTx ? (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400">
              <AnimatedLoader size={40} color="#10b981" className="mb-3" />
              <p>Cargando transacciones...</p>
            </div>
          ) : !transacciones || transacciones.length === 0 ? (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400">
              <ArrowRightLeft className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
              <p>Aún no hay transacciones para mostrar.</p>
              <p className="text-sm mt-1">Registra tu primer movimiento para ver el historial aquí.</p>
            </div>
          ) : (
            <StaggerContainer
              className="divide-y divide-slate-100 dark:divide-slate-800/50"
              staggerDelay={80}
              duration={500}
            >
              {transacciones.slice(0, 5).map(tx => (
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
                      <h4 className={`font-medium truncate ${tx.anulada ? 'line-through text-slate-500' : 'text-slate-900 dark:text-slate-200'}`}>
                        {tx.descripcion || tx.categorias?.nombre || 'Sin categoría'}
                      </h4>
                      <div className="flex flex-col text-xs text-slate-500 dark:text-slate-400 mt-1 gap-y-0.5">
                        <span className="font-medium text-slate-600 dark:text-slate-300">{tx.cuentas?.nombre}</span>
                        <div className="flex gap-x-2">
                          <span>{new Date(tx.fecha).toLocaleDateString('es-ES')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start justify-end gap-4 shrink-0 pl-4">
                    <div className="text-right flex-none">
                    <p className={`font-bold ${
                      tx.tipo === 'ingreso' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-slate-200'
                    } ${tx.anulada ? 'line-through' : ''}`}>
                      {tx.tipo === 'ingreso' ? '+' : '-'}{tx.moneda_original === 'USD' ? formatUSD(tx.monto_original) : formatVES(tx.monto_original)}
                    </p>
                    {tx.moneda_original === 'VES' && (
                      <p className="text-xs text-slate-400 dark:text-slate-500">
                        ≈ {formatUSD(tx.monto_usd_calculado)}
                      </p>
                    )}
                    </div>
                  </div>
                </AnimatedCard>
              ))}
            </StaggerContainer>
          )}
        </div>
      </FadeIn>
    </div>
  )
}
