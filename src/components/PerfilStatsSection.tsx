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
  if (isLoading) {
    return (
      <div className="flex justify-center p-12">
        <AnimatedLoader size={40} color="var(--primary-500)" />
      </div>
    )
  }

  if (!stats) return null

  return (
    <div className="space-y-4">
      {/* Resumen numérico */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <AnimatedCard className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
          <p className="text-xl font-bold text-slate-900 dark:text-white">{stats.totalTransacciones}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Transacciones</p>
        </AnimatedCard>
        <AnimatedCard className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
          <p className="text-xl font-bold text-slate-900 dark:text-white">{stats.totalCuentas}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Cuentas</p>
        </AnimatedCard>
        <AnimatedCard className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
          <p className="text-xl font-bold text-slate-900 dark:text-white">{stats.totalMetas}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Metas</p>
        </AnimatedCard>
        <AnimatedCard className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
          <p className="text-xl font-bold text-slate-900 dark:text-white">{stats.totalDeudas}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Deudas</p>
        </AnimatedCard>
      </div>

      {/* Gastos por categoría */}
      {stats.gastosPorCategoria.length > 0 && (
        <AnimatedCard className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary-600 dark:text-primary-400" />
            Gastos por categoría (mes actual)
          </h3>
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
        </AnimatedCard>
      )}

      {/* Ingresos vs Gastos */}
      <AnimatedCard className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary-600 dark:text-primary-400" />
          Ingresos vs Gastos (últimos 6 meses)
        </h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.ingresosGastosMensual} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
              <XAxis dataKey="mes" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} />
              <Tooltip
                contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: 'none', borderRadius: '8px', color: '#fff' }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="ingresos" name="Ingresos" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="gastos" name="Gastos" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
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
