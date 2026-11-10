'use client'

import { useState, useMemo } from 'react'
import { useTasasFuentes } from '@/hooks/useTasasFuentes'
import { useTasaActual } from '@/hooks/useAuxiliares'
import { 
  Calculator, 
  ArrowRightLeft, 
  Sparkles, 
  TrendingUp, 
  RefreshCw, 
  Copy, 
  Check, 
  Info,
  Calendar,
  Coins
} from 'lucide-react'
import { FadeIn, AnimatedCard, AnimatedSelect } from '@/components/animations'
import { MonitorBrechaWidget } from '@/components/MonitorBrechaWidget'

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

  // Nombre de la fuente activa para mostrar en el badge
  const nombreFuenteActiva = useMemo(() => {
    if (fuenteSeleccionada === 'custom') return 'Tasa personalizada'
    if (fuenteSeleccionada) return fuenteSeleccionada
    return 'Tasa predeterminada'
  }, [fuenteSeleccionada])

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
      maximumFractionDigits: 2
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

  const presets = direccion === 'USD_A_VES' ? [5, 10, 20, 50, 100] : [200, 500, 1000, 2500, 5000]

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-5xl mx-auto pb-24 md:pb-8">
      {/* Encabezado */}
      <FadeIn as="header" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <div className="p-2.5 bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-2xl shadow-sm border border-primary-200/50 dark:border-primary-800/50">
              <Calculator className="w-6 h-6" />
            </div>
            Calculadora de Divisas
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Herramienta rápida de consulta y conversión entre dólares (USD) y bolívares (VES)
          </p>
        </div>
      </FadeIn>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Panel Principal de Cálculo */}
        <div className="lg:col-span-7 space-y-6">
          <FadeIn delay={100}>
            <AnimatedCard className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 p-6 md:p-7 shadow-sm space-y-6">
              
              {/* Selector de Dirección de Conversión */}
              <div className="p-1.5 bg-slate-100 dark:bg-slate-800/70 rounded-2xl flex items-center justify-between gap-1.5 border border-slate-200/50 dark:border-slate-700/50">
                <button
                  type="button"
                  onClick={() => setDireccion('USD_A_VES')}
                  className={`flex-1 py-2.5 px-3 text-xs md:text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-2 ${
                    direccion === 'USD_A_VES'
                      ? 'bg-white dark:bg-slate-900 text-primary-700 dark:text-primary-400 shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <Coins className="w-4 h-4 text-emerald-500" />
                  <span>USD → VES</span>
                </button>

                <button
                  type="button"
                  onClick={intercambiarDireccion}
                  className="p-2 text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-all shadow-none hover:shadow-sm"
                  title="Invertir dirección"
                >
                  <ArrowRightLeft className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setDireccion('VES_A_USD')}
                  className={`flex-1 py-2.5 px-3 text-xs md:text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-2 ${
                    direccion === 'VES_A_USD'
                      ? 'bg-white dark:bg-slate-900 text-primary-700 dark:text-primary-400 shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <Coins className="w-4 h-4 text-blue-500" />
                  <span>VES → USD</span>
                </button>
              </div>

              {/* Selector de Tasa / Fuente */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Tasa de cambio de referencia
                  </label>
                  {tasaEfectiva && (
                    <span className="text-xs font-medium text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/50 px-2 py-0.5 rounded-md border border-primary-200/50 dark:border-primary-800/50">
                      1 USD = {tasaEfectiva} VES
                    </span>
                  )}
                </div>
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
                <div className="space-y-1.5 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 animate-in fade-in duration-200">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Tasa manual (VES por cada USD)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={tasaPersonalizada}
                    onChange={(e) => setTasaPersonalizada(e.target.value)}
                    placeholder="Ej: 52.40"
                    className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary-500 outline-none font-semibold"
                  />
                </div>
              )}

              {/* Monto a Convertir */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Monto a convertir ({direccion === 'USD_A_VES' ? 'USD' : 'VES'})
                  </label>
                  {monto && (
                    <button
                      type="button"
                      onClick={() => setMonto('')}
                      className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                    >
                      Limpiar
                    </button>
                  )}
                </div>
                
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-slate-400 font-bold text-lg select-none">
                    <span>{direccion === 'USD_A_VES' ? '$' : 'Bs.'}</span>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={monto}
                    onChange={(e) => setMonto(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-14 pr-4 py-3.5 text-2xl font-bold border border-slate-300 dark:border-slate-700 rounded-2xl bg-slate-50/60 dark:bg-slate-800/40 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary-500 outline-none transition-all placeholder:text-slate-400"
                  />
                </div>

                {/* Accesos rápidos de montos */}
                <div className="flex items-center gap-1.5 pt-1 overflow-x-auto no-scrollbar">
                  <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider shrink-0 mr-1">Rápido:</span>
                  {presets.map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setMonto(p.toString())}
                      className="px-2.5 py-1 text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-primary-50 hover:text-primary-700 dark:hover:bg-primary-950/40 dark:hover:text-primary-300 rounded-lg text-slate-600 dark:text-slate-400 transition-all shrink-0"
                    >
                      +{p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tarjeta de Resultado Elegante */}
              <div className="p-6 rounded-3xl bg-gradient-to-br from-primary-600 via-primary-700 to-teal-800 text-white shadow-lg shadow-primary-900/10 relative overflow-hidden">
                {/* Glow decorativo de fondo */}
                <div className="absolute -right-8 -top-8 w-36 h-36 bg-white/10 rounded-full blur-2xl pointer-events-none" />

                <div className="flex items-center justify-between text-xs text-primary-100 font-semibold tracking-wide mb-2">
                  <span className="uppercase tracking-wider">Resultado de la conversión</span>
                  <span className="px-2 py-0.5 rounded-full bg-white/15 text-[11px] backdrop-blur-sm">
                    {nombreFuenteActiva}
                  </span>
                </div>

                <div className="flex items-end justify-between gap-4 mt-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-3xl md:text-4xl font-black tracking-tight truncate drop-shadow-sm">
                      {resultado !== null ? (
                        formatMoneda(resultado, direccion === 'USD_A_VES' ? 'VES' : 'USD')
                      ) : (
                        <span className="text-primary-200/70 font-medium text-xl md:text-2xl">
                          {monto ? 'Tasa no válida' : 'Ingrese un monto arriba'}
                        </span>
                      )}
                    </p>
                    {resultado !== null && (
                      <p className="text-xs text-primary-100 mt-1 font-medium">
                        {direccion === 'USD_A_VES'
                          ? `${formatMoneda(parseFloat(monto) || 0, 'USD')} calculados a ${tasaEfectiva} VES/USD`
                          : `${formatMoneda(parseFloat(monto) || 0, 'VES')} divididos entre ${tasaEfectiva} VES/USD`}
                      </p>
                    )}
                  </div>

                  {resultado !== null && (
                    <button
                      type="button"
                      onClick={copiarAlPortapapeles}
                      className="p-3 bg-white/15 hover:bg-white/25 active:scale-95 rounded-2xl transition-all text-white flex items-center gap-1.5 text-xs font-bold shrink-0 backdrop-blur-sm border border-white/20"
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

        {/* Panel Lateral: Tasas Registradas del Mercado */}
        <div className="lg:col-span-5 space-y-4">
          <FadeIn delay={200}>
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 p-5 md:p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 rounded-lg">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Tasas del Mercado
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => refetchFuentes()}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
                  title="Actualizar tasas"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingFuentes ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {loadingFuentes ? (
                <div className="py-10 text-center text-slate-400 text-sm flex flex-col items-center gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin text-primary-500" />
                  <span>Consultando tasas actualizadas...</span>
                </div>
              ) : !fuentes || fuentes.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-sm">No hay tasas registradas.</div>
              ) : (
                <div className="space-y-2">
                  {fuentes.map((f) => {
                    const isSelected = fuenteSeleccionada === f.fuente || (!fuenteSeleccionada && f.tasa === tasaActualDefecto);
                    return (
                      <div
                        key={f.fuente}
                        onClick={() => setFuenteSeleccionada(f.fuente)}
                        className={`p-3 rounded-2xl transition-all cursor-pointer flex items-center justify-between border ${
                          isSelected
                            ? 'bg-primary-50/80 dark:bg-primary-950/40 border-primary-300 dark:border-primary-800/80 shadow-sm'
                            : 'bg-slate-50/50 dark:bg-slate-800/30 border-slate-200/60 dark:border-slate-800/60 hover:bg-slate-100/70 dark:hover:bg-slate-800/70'
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
                            {f.fuente}
                          </p>
                          <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
                            <Calendar className="w-3 h-3" />
                            <span>
                              {new Date(f.ultima_fecha).toLocaleDateString('es-ES', { 
                                day: '2-digit', 
                                month: 'short', 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-base font-black text-slate-900 dark:text-white">
                            {f.tasa}
                          </span>
                          <span className="text-xs text-slate-400 ml-1 font-semibold">VES</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-primary-500 shrink-0 mt-0.5" />
                <span>
                  Pulse cualquier tasa de la lista para aplicarla de inmediato a la conversión activa.
                </span>
              </div>
            </div>
          </FadeIn>

          <FadeIn delay={250}>
            <MonitorBrechaWidget />
          </FadeIn>
        </div>
      </div>
    </div>
  )
}
