'use client';

import { useState } from 'react';
import { AnimatedCard, AnimatedLoader } from '@/components/animations'
import { BarChart3, Activity } from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
  Cell
} from 'recharts'
import type { StatsPerfil } from '@/hooks/useStatsPerfil'

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316']

interface PerfilStatsSectionProps {
  stats: StatsPerfil | undefined
  isLoading: boolean
}

export function PerfilStatsSection({ stats, isLoading }: PerfilStatsSectionProps) {
  const [selectedMonth, setSelectedMonth] = useState<{ mes: string; ingresos: number; gastos: number } | null>(null);

  if (isLoading) {
    return (
      <div className="flex justify-center p-12">
        <AnimatedLoader size={40} color="var(--primary-500)" />
      </div>
    )
  }

  if (!stats) return null

  const totalGastoMes = stats.gastosPorCategoria.reduce((acc, c) => acc + c.monto, 0);

  return (
    <div className="space-y-4">
      {/* Resumen numérico */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <AnimatedCard className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 text-center shadow-sm">
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.totalTransacciones}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Transacciones</p>
        </AnimatedCard>
        <AnimatedCard className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 text-center shadow-sm">
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.totalCuentas}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Cuentas</p>
        </AnimatedCard>
        <AnimatedCard className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 text-center shadow-sm">
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.totalMetas}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Metas</p>
        </AnimatedCard>
        <AnimatedCard className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 text-center shadow-sm">
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.totalDeudas}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Deudas</p>
        </AnimatedCard>
      </div>

      {/* Gastos por categoría */}
      {stats.gastosPorCategoria.length > 0 && (
        <AnimatedCard className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary-600 dark:text-primary-400" />
              Gastos por categoría (mes actual)
            </h3>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 border border-primary-200 dark:border-primary-800/40">
              Total: ${totalGastoMes.toFixed(2)}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.gastosPorCategoria} layout="vertical" margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} horizontal={false} />
                  <XAxis type="number" stroke="#64748b" fontSize={11} tickFormatter={(v: number) => `$${v}`} />
                  <YAxis dataKey="nombre" type="category" stroke="#64748b" fontSize={11} width={85} />
                  <Tooltip
                    formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Monto']}
                    contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: 'none', borderRadius: '8px', color: '#fff' }}
                  />
                  <Bar dataKey="monto" name="Gastos" radius={[0, 4, 4, 0]}>
                    {stats.gastosPorCategoria.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Desglose en lista con badges idéntico a mobile */}
            <div className="space-y-2.5">
              {stats.gastosPorCategoria.map((cat, idx) => {
                const widthPct = Math.min(100, Math.round((cat.monto / (totalGastoMes || 1)) * 100));
                const col = COLORS[idx % COLORS.length];
                return (
                  <div key={cat.nombre} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: col }} />
                        <span className="font-medium text-slate-700 dark:text-slate-300">{cat.nombre}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ backgroundColor: `${col}18`, color: col }}>
                          {widthPct}%
                        </span>
                        <span className="font-semibold text-slate-900 dark:text-white">${cat.monto.toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${widthPct}%`, backgroundColor: col }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </AnimatedCard>
      )}

      {/* Ingresos vs Gastos */}
      <AnimatedCard className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary-600 dark:text-primary-400" />
            Ingresos vs Gastos (últimos 6 meses)
          </h3>
          <span className="text-xs text-slate-400">Click en una barra para ver detalle</span>
        </div>

        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={stats.ingresosGastosMensual}
              margin={{ top: 5, right: 5, left: -15, bottom: 0 }}
              onClick={(e: any) => {
                if (e && e.activePayload && e.activePayload.length > 0) {
                  const p = e.activePayload[0].payload;
                  setSelectedMonth(selectedMonth?.mes === p.mes ? null : p);
                }
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
              <XAxis dataKey="mes" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} />
              <Tooltip
                contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: 'none', borderRadius: '8px', color: '#fff' }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="ingresos" name="Ingresos" fill="#10b981" radius={[4, 4, 0, 0]} cursor="pointer" />
              <Bar dataKey="gastos" name="Gastos" fill="#ef4444" radius={[4, 4, 0, 0]} cursor="pointer" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Banner interactivo de mes seleccionado idéntico a mobile */}
        {selectedMonth && (
          <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-primary-500/30 flex items-center justify-between text-xs animate-in fade-in">
            <span className="font-bold text-slate-800 dark:text-slate-200">Resumen Mes {selectedMonth.mes}</span>
            <span className="text-emerald-600 font-semibold">Ingresos: +${selectedMonth.ingresos.toFixed(2)}</span>
            <span className="text-rose-600 font-semibold">Gastos: -${selectedMonth.gastos.toFixed(2)}</span>
            <span className={`font-bold ${selectedMonth.ingresos >= selectedMonth.gastos ? 'text-emerald-500' : 'text-rose-500'}`}>
              Neto: {selectedMonth.ingresos >= selectedMonth.gastos ? '+' : '-'}${Math.abs(selectedMonth.ingresos - selectedMonth.gastos).toFixed(2)}
            </span>
          </div>
        )}
      </AnimatedCard>

      {/* Evolución del balance */}
      {stats.evolucionBalance.length > 0 && (
        <AnimatedCard className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary-600 dark:text-primary-400" />
            Evolución del balance neto
          </h3>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.evolucionBalance} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                <XAxis dataKey="mes" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Balance']}
                  contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: 'none', borderRadius: '8px', color: '#fff' }}
                />
                <Line type="monotone" dataKey="balance" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </AnimatedCard>
      )}

      {/* Progreso de metas */}
      {stats.progresoMetas.length > 0 && (
        <AnimatedCard className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Progreso de metas de ahorro</h3>
          <div className="space-y-4">
            {stats.progresoMetas.map((meta, index) => (
              <div key={index}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-slate-900 dark:text-slate-100">{meta.nombre}</span>
                  <span className="text-slate-500 dark:text-slate-400">{meta.porcentaje}%</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
                  <div
                    className="bg-primary-500 h-2.5 rounded-full transition-all"
                    style={{ width: `${Math.max(meta.porcentaje, 5)}%` }}
                  />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  ${meta.actual.toFixed(2)} de ${meta.objetivo.toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        </AnimatedCard>
      )}
    </div>
  )
}
