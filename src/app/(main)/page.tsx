'use client'

import Link from 'next/link'
import { useBalanceNeto, useResumenMes } from '@/hooks/useDashboard'
import { useTransacciones } from '@/hooks/useTransacciones'
import { Wallet, TrendingUp, TrendingDown, PiggyBank, Receipt, ArrowRightLeft } from 'lucide-react'

export const dynamic = 'force-dynamic';

export default function DashboardPage() {
  const { data: balance, isLoading: loadingBalance } = useBalanceNeto()
  const { data: resumen, isLoading: loadingResumen } = useResumenMes()
  const { data: transacciones, isLoading: loadingTx } = useTransacciones(new Date())

  const formatUSD = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
  }

  const formatVES = (value: number) => {
    return new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'VES' }).format(value)
  }

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Resumen Financiero</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Control de tus finanzas en USD y VES</p>
      </header>

      {/* Main Balance Card */}
      <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Wallet className="w-32 h-32" />
        </div>
        <div className="relative z-10">
          <p className="text-emerald-100 font-medium mb-1">Balance Neto (USD)</p>
          <div className="flex items-end gap-3">
            {loadingBalance ? (
              <div className="h-10 w-48 bg-white/20 rounded animate-pulse" />
            ) : (
              <>
                <h2 className="text-4xl font-bold">{formatUSD(balance?.balance_neto || 0)}</h2>
              </>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-white/20">
            <div>
              <p className="text-emerald-100 text-sm mb-1">Total USD Fijo</p>
              {loadingBalance ? (
                <div className="h-6 w-24 bg-white/20 rounded animate-pulse" />
              ) : (
                <p className="text-xl font-semibold">{formatUSD(balance?.usd_fijo || 0)}</p>
              )}
            </div>
            <div>
              <p className="text-emerald-100 text-sm mb-1">Total VES</p>
              {loadingBalance ? (
                <div className="h-6 w-24 bg-white/20 rounded animate-pulse" />
              ) : (
                <div className="flex flex-col">
                  <p className="text-xl font-semibold">{formatVES(balance?.ves_total || 0)}</p>
                  <p className="text-xs text-emerald-200">
                    ≈ {formatUSD(balance?.ves_en_usd || 0)} a tasa de {balance?.tasa_usada || 0}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Grid of smaller cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Ingresos del Mes */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between transition-colors">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-emerald-100 dark:bg-emerald-900/30 p-2 rounded-full">
              <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Ingresos del mes</p>
          </div>
          {loadingResumen ? (
            <div className="h-7 w-24 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
          ) : (
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{formatUSD(resumen?.ingresos || 0)}</p>
          )}
        </div>

        {/* Gastos del Mes */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between transition-colors">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-red-100 dark:bg-red-900/30 p-2 rounded-full">
              <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Gastos del mes</p>
          </div>
          {loadingResumen ? (
            <div className="h-7 w-24 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
          ) : (
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{formatUSD(resumen?.gastos || 0)}</p>
          )}
        </div>

        {/* Ahorros */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between transition-colors">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-full">
              <PiggyBank className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Ahorros</p>
          </div>
          {loadingResumen ? (
            <div className="h-7 w-24 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
          ) : (
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{formatUSD(resumen?.ahorros || 0)}</p>
          )}
        </div>

        {/* Deuda */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between transition-colors">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-orange-100 dark:bg-orange-900/30 p-2 rounded-full">
              <Receipt className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Deuda actual</p>
          </div>
          {loadingResumen ? (
            <div className="h-7 w-24 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
          ) : (
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{formatUSD(resumen?.deuda || 0)}</p>
          )}
        </div>
      </div>

      {/* Transacciones Recientes */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Transacciones Recientes</h3>
          <Link href="/transacciones" className="text-sm text-emerald-600 dark:text-emerald-400 font-medium hover:underline">Ver todas</Link>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm transition-colors">
          {loadingTx ? (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400">
              <p>Cargando transacciones...</p>
            </div>
          ) : !transacciones || transacciones.length === 0 ? (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400">
              <ArrowRightLeft className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
              <p>Aún no hay transacciones para mostrar.</p>
              <p className="text-sm mt-1">Registra tu primer movimiento para ver el historial aquí.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {transacciones.slice(0, 5).map(tx => (
                <div key={tx.id} className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${tx.anulada ? 'bg-slate-50/50 dark:bg-slate-900/50 opacity-60' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}>
                  <div className="flex items-center gap-4 min-w-0">
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
                      <div className="flex flex-wrap gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400 mt-1">
                        <span>{new Date(tx.fecha).toLocaleDateString('es-ES')}</span>
                        <span>•</span>
                        <span>{tx.cuentas?.nombre}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-left sm:text-right shrink-0">
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
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
