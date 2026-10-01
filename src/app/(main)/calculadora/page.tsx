'use client'

import { useState, useMemo } from 'react'
import { useTasasFuentes } from '@/hooks/useTasasFuentes'
import { useTasaActual } from '@/hooks/useAuxiliares'
import { Calculator, ArrowRightLeft, Sparkles, TrendingUp, RefreshCw, Copy, Check } from 'lucide-react'
import { FadeIn, AnimatedCard, AnimatedSelect } from '@/components/animations'

export default function CalculadoraPage() {
  const { data: fuentes, isLoading: loadingFuentes, refetch: refetchFuentes } = useTasasFuentes()
  const { data: tasaActualDefecto } = useTasaActual()

  const [monto, setMonto] = useState<string>('')
  const [direccion, setDireccion] = useState<'USD_A_VES' | 'VES_A_USD'>('USD_A_VES')
  const [fuenteSeleccionada, setFuenteSeleccionada] = useState<string>('')
  const [tasaPersonalizada, setTasaPersonalizada] = useState<string>('')
  const [copiado, setCopiado] = useState(false)

  // Determinar la tasa efectiva para el cálculo
  const tasaEfectiva = useMemo(() => {
    if (fuenteSeleccionada === 'custom') {
      const parsed = parseFloat(tasaPersonalizada)
      return !isNaN(parsed) && parsed > 0 ? parsed : null
    }

    if (fuenteSeleccionada && fuentes) {
      const encontrada = fuentes.find(f => f.fuente === fuenteSeleccionada)
      if (encontrada) return encontrada.tasa
    }

    // Por defecto, la tasa preferida o la primera disponible
    return tasaActualDefecto || (fuentes && fuentes.length > 0 ? fuentes[0].tasa : null)
  }, [fuenteSeleccionada, tasaPersonalizada, fuentes, tasaActualDefecto])

  // Cálculo del resultado
  const resultado = useMemo(() => {
    const val = parseFloat(monto)
    if (isNaN(val) || val <= 0 || !tasaEfectiva) return null

    if (direccion === 'USD_A_VES') {
      return val * tasaEfectiva
    } else {
      return val / tasaEfectiva
    }
  }, [monto, direccion, tasaEfectiva])

  const formatMoneda = (val: number, moneda: 'USD' | 'VES') => {
    return new Intl.NumberFormat(moneda === 'USD' ? 'en-US' : 'es-VE', {
      style: 'currency',
      currency: moneda,
      minimumFractionDigits: 2,
      maximumFractionDigits: moneda === 'USD' ? 2 : 2
    }).format(val)
  }

  const intercambiarDireccion = () => {
    setDireccion(prev => prev === 'USD_A_VES' ? 'VES_A_USD' : 'USD_A_VES')
  }

  const copiarAlPortapapeles = async () => {
    if (!resultado) return
    const valorTexto = resultado.toFixed(2)
    try {
      await navigator.clipboard.writeText(valorTexto)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      // Ignorar si falla el portapapeles
    }
  }

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-4xl mx-auto pb-24 md:pb-8">
      {/* Encabezado */}
      <FadeIn as="header" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <div className="p-2 bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-xl">
              <Calculator className="w-6 h-6" />
            </div>
            Calculadora de Conversión
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Consulte conversiones instantáneas en USD y VES con tasas del mercado
          </p>
        </div>
      </FadeIn>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Panel Principal de Cálculo */}
        <div className="lg:col-span-7 space-y-6">
          <FadeIn delay={100}>
            <AnimatedCard className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-5">
              {/* Selector de Dirección de Conversión */}
              <div className="flex items-center justify-between p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl">
                <button
                  type="button"
                  onClick={() => setDireccion('USD_A_VES')}
                  className={`flex-1 py-2 text-xs md:text-sm font-semibold rounded-lg transition-all ${
                    direccion === 'USD_A_VES'
                      ? 'bg-white dark:bg-slate-900 text-primary-700 dark:text-primary-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  Dólares (USD) → Bolívares (VES)
                </button>
                <button
                  type="button"
                  onClick={intercambiarDireccion}
                  className="p-2 text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                  title="Invertir dirección"
                >
                  <ArrowRightLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setDireccion('VES_A_USD')}
                  className={`flex-1 py-2 text-xs md:text-sm font-semibold rounded-lg transition-all ${
                    direccion === 'VES_A_USD'
                      ? 'bg-white dark:bg-slate-900 text-primary-700 dark:text-primary-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  Bolívares (VES) → Dólares (USD)
                </button>
              </div>

              {/* Selector de Tasa / Fuente */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Tasa de cambio de referencia
                </label>
                <AnimatedSelect
                  value={fuenteSeleccionada}
                  onChange={(v) => setFuenteSeleccionada(v)}
                  options={[
                    { value: '', label: `Por defecto (${tasaActualDefecto ? `${tasaActualDefecto} VES` : 'Cargando...'})` },
                    ...(fuentes?.map(f => ({
                      value: f.fuente,
                      label: `${f.fuente} — ${f.tasa} VES/USD`
                    })) || []),
                    { value: 'custom', label: '✏️ Ingresar tasa manual personalizada' }
                  ]}
                  placeholder="Seleccione la tasa a utilizar"
                  accent="emerald"
                />
              </div>

              {/* Entrada de Tasa Personalizada */}
              {fuenteSeleccionada === 'custom' && (
                <div className="space-y-1.5 animate-in fade-in duration-200">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Tasa manual (VES por cada USD)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={tasaPersonalizada}
                    onChange={(e) => setTasaPersonalizada(e.target.value)}
                    placeholder="Ej: 52.40"
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-transparent text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary-500 outline-none font-medium"
                  />
                </div>
              )}

              {/* Monto a Convertir */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Monto a convertir ({direccion === 'USD_A_VES' ? 'USD' : 'VES'})
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-slate-400">
                    {direccion === 'USD_A_VES' ? '$' : 'Bs.'}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={monto}
                    onChange={(e) => setMonto(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-12 pr-4 py-3 text-2xl font-bold border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-800/40 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary-500 outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Tarjeta de Resultado */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-primary-600 to-primary-800 text-white shadow-md relative overflow-hidden">
                <div className="flex items-center justify-between text-xs text-primary-200 uppercase font-semibold tracking-wider mb-1">
                  <span>Resultado estimado</span>
                  {tasaEfectiva && (
                    <span>Tasa: {tasaEfectiva} VES/USD</span>
                  )}
                </div>

                <div className="flex items-baseline justify-between gap-4 mt-2">
                  <div className="text-3xl md:text-4xl font-extrabold tracking-tight truncate">
                    {resultado !== null ? (
                      formatMoneda(resultado, direccion === 'USD_A_VES' ? 'VES' : 'USD')
                    ) : (
                      <span className="text-primary-300/80 font-normal text-2xl md:text-3xl">Ingrese un monto</span>
                    )}
                  </div>

                  {resultado !== null && (
                    <button
                      type="button"
                      onClick={copiarAlPortapapeles}
                      className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition-all text-white flex items-center gap-1.5 text-xs font-semibold shrink-0"
                      title="Copiar resultado"
                    >
                      {copiado ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-300" />
                          <span>Copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </AnimatedCard>
          </FadeIn>
        </div>

        {/* Panel Lateral: Tasas del Mercado Disponibles */}
        <div className="lg:col-span-5 space-y-4">
          <FadeIn delay={200}>
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                  Tasas Registradas
                </h3>
                <button
                  type="button"
                  onClick={() => refetchFuentes()}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors"
                  title="Actualizar tasas"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingFuentes ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {loadingFuentes ? (
                <div className="py-8 text-center text-slate-400 text-sm">Cargando tasas del mercado...</div>
              ) : !fuentes || fuentes.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-sm">No hay tasas registradas.</div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {fuentes.map((f) => (
                    <div
                      key={f.fuente}
                      onClick={() => setFuenteSeleccionada(f.fuente)}
                      className={`py-3 px-3 rounded-xl transition-all cursor-pointer flex items-center justify-between ${
                        fuenteSeleccionada === f.fuente
                          ? 'bg-primary-50 dark:bg-primary-950/40 border border-primary-200 dark:border-primary-800/60'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{f.fuente}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {new Date(f.ultima_fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-base font-bold text-slate-900 dark:text-white">
                          {f.tasa}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 ml-1">VES</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-primary-500 shrink-0 mt-0.5" />
                <span>
                  Puede hacer clic en cualquiera de las tasas de la lista para usarla de inmediato en la calculadora.
                </span>
              </div>
            </div>
          </FadeIn>
        </div>
      </div>
    </div>
  )
}
