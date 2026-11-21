'use client'

import { useRef, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useCategorias } from '@/hooks/useAuxiliares'
import { useCuentas } from '@/hooks/useCuentas'
import { useDeudas } from '@/hooks/useDeudas'
import { useMetas } from '@/hooks/useMetas'
import { useCrearTransaccion } from '@/hooks/useTransacciones'
import { useToast } from '@/hooks/useToast'
import { FadeIn, AnimatedCard, AnimatedSelect, StaggerContainer } from '@/components/animations'
import {
  UploadCloud,
  ImagePlus,
  Loader2,
  CheckCircle2,
  Expand,
  X,
  Link2,
  AlertTriangle
} from 'lucide-react'

export const dynamic = 'force-dynamic'

// Fields extracted from the receipt (only monto/moneda/fecha/referencia come from the AI)
interface DatosComprobante {
  monto?: number | string
  moneda?: string
  fecha?: string
  referencia?: string
}

type MonedaComprobante = 'USD' | 'VES'
type TipoVinculo = 'ninguno' | 'deuda' | 'meta'
type TipoMovimiento = 'gasto' | 'ingreso'

// Converts the date shown on receipts (dd/mm/yyyy) to ISO; falls back to now.
function convertirFechaAISO(fecha: string): string {
  const matchManual = fecha.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/)
  if (matchManual) {
    const [, dia, mes, anio] = matchManual
    const date = new Date(`${anio}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}T12:00:00`)
    if (!isNaN(date.getTime())) return date.toISOString()
  }
  const parsed = new Date(fecha)
  return isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString()
}

export default function ComprobantePage() {
  const inputArchivoRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const { data: cuentas } = useCuentas()
  const { data: categorias } = useCategorias()
  const { data: deudas } = useDeudas()
  const { data: metas } = useMetas()
  const { mutateAsync: crearTransaccion } = useCrearTransaccion()
  const { success: toastSuccess, error: toastError, warning: toastWarning } = useToast()

  const [archivo, setArchivo] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [procesando, setProcesando] = useState(false)
  const [comprobanteListo, setComprobanteListo] = useState(false)
  const [previewAmpliado, setPreviewAmpliado] = useState(false)

  // Fields extracted from the receipt
  const [tipoMovimiento, setTipoMovimiento] = useState<TipoMovimiento>('gasto')
  const [descripcion, setDescripcion] = useState('')
  const [referencia, setReferencia] = useState('')
  const [monto, setMonto] = useState('')
  const [moneda, setMoneda] = useState<MonedaComprobante>('VES')
  const [fechaDetectada, setFechaDetectada] = useState('')

  // Web-only persistence fields
  const [cuentaId, setCuentaId] = useState('')
  const [categoriaId, setCategoriaId] = useState('')
  const [vinculoTipo, setVinculoTipo] = useState<TipoVinculo>('ninguno')
  const [vinculoId, setVinculoId] = useState('')
  const [registrando, setRegistrando] = useState(false)

  const categoriasFiltradas = (categorias ?? []).filter(c => c.tipo === tipoMovimiento)

  const resetearFormulario = () => {
    setArchivo(null)
    setPreviewUrl(null)
    setComprobanteListo(false)
    setPreviewAmpliado(false)
    setTipoMovimiento('gasto')
    setDescripcion('')
    setReferencia('')
    setMonto('')
    setMoneda('VES')
    setFechaDetectada('')
    setCuentaId('')
    setCategoriaId('')
    setVinculoTipo('ninguno')
    setVinculoId('')
    if (inputArchivoRef.current) inputArchivoRef.current.value = ''
  }

  const cambiarTipoMovimiento = (nuevo: TipoMovimiento) => {
    setTipoMovimiento(nuevo)
    setCategoriaId('')
  }

  const handleSeleccionarArchivo = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const seleccion = event.target.files?.[0]
    if (!seleccion) return
    if (!seleccion.type.startsWith('image/')) {
      toastError({ title: 'Archivo no válido', message: 'Selecciona una imagen de tu comprobante.' })
      return
    }

    resetearFormulario()
    setPreviewUrl(URL.createObjectURL(seleccion))
    setArchivo(seleccion)
    setProcesando(true)

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          const dataUrl = String(reader.result ?? '')
          resolve(dataUrl.slice(dataUrl.indexOf(',') + 1))
        }
        reader.onerror = () => reject(new Error('No se pudo leer la imagen seleccionada.'))
        reader.readAsDataURL(seleccion)
      })

      // Web has no local MLKit OCR; use the same Supabase edge function as the mobile fallback
      const { data: edgeRespuesta, error: edgeError } = await supabase.functions.invoke('analizar-comprobante', {
        body: { imageBase64: base64 }
      })
      const edgeData = edgeRespuesta as DatosComprobante | null

      if (!edgeError && edgeData && Number(edgeData.monto) > 0) {
        setReferencia(edgeData.referencia || '')
        setMonto(String(edgeData.monto))
        setMoneda(edgeData.moneda === 'USD' ? 'USD' : 'VES')
        setFechaDetectada(edgeData.fecha || '')
        toastSuccess({ title: 'Comprobante analizado', message: 'Completa el nombre, la categoría y verifica los datos antes de registrar.' })
      } else {
        setFechaDetectada('')
        toastWarning({
          title: 'Análisis automático no disponible',
          message: 'Ingresa manualmente el monto y la referencia verificando con la captura.'
        })
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'No se pudo analizar la captura.'
      toastError({ title: 'Error al analizar', message: msg })
      setFechaDetectada('')
    } finally {
      setProcesando(false)
      setComprobanteListo(true)
    }
  }

  const handleConfirmar = async () => {
    if (!archivo) return
    const montoNum = parseFloat(monto.replace(',', '.'))
    if (isNaN(montoNum) || montoNum <= 0) {
      toastError({ title: 'Monto inválido', message: 'Ingresa un monto mayor que cero.' })
      return
    }
    if (!descripcion.trim()) {
      toastError({ title: 'Falta el nombre del movimiento', message: 'Escribe el concepto o nombre del movimiento antes de registrar.' })
      return
    }
    if (!cuentaId) {
      toastWarning({ title: 'Falta la cuenta', message: 'Selecciona la cuenta donde se registrará el movimiento.' })
      return
    }

    // Anti-duplicate guard: references shorter than 4 chars never block
    const referenciaLimpia = referencia.trim()
    if (referenciaLimpia.length >= 4) {
      const { data: comprobanteExistente, error: dedupError } = await supabase
        .from('comprobantes_procesados')
        .select('id')
        .eq('referencia', referenciaLimpia)
        .maybeSingle()
      if (dedupError) {
        toastError({ title: 'Error al verificar', message: 'No se pudo validar la referencia. Intenta de nuevo.' })
        return
      }
      if (comprobanteExistente) {
        toastError({ title: 'Comprobante duplicado', message: `Ya registraste un comprobante con esta referencia: ${referenciaLimpia}.` })
        return
      }
    }

    setRegistrando(true)
    try {
      const { data: userData, error: authError } = await supabase.auth.getUser()
      if (authError || !userData.user) throw new Error('Sesión no válida. Vuelve a iniciar sesión.')

      // Mirrors the mobile flow: analyze and register the movement. No storage upload (parity with mobile).
      const transaccionCreada = await crearTransaccion({
        cuenta_id: cuentaId,
        categoria_id: categoriaId || undefined,
        tipo: tipoMovimiento,
        monto_original: montoNum,
        moneda_original: moneda,
        descripcion: descripcion.trim(),
        fecha: convertirFechaAISO(fechaDetectada),
        deuda_id: vinculoTipo === 'deuda' && vinculoId ? vinculoId : null,
        meta_id: vinculoTipo === 'meta' && vinculoId ? vinculoId : null
      })

      // Persist the used reference so the same receipt cannot be registered twice
      const { error: comprobanteError } = await supabase
        .from('comprobantes_procesados')
        .insert([
          { user_id: userData.user.id, referencia: referenciaLimpia, transaccion_id: transaccionCreada.id }
        ])

      if (comprobanteError && comprobanteError.code === '23505') {
        // Roll back the freshly created transaction to keep state consistent
        await supabase.from('transacciones').delete().eq('id', transaccionCreada.id)
        toastError({ title: 'Comprobante duplicado', message: `Ya registraste un comprobante con esta referencia: ${referenciaLimpia}.` })
        return
      }
      if (comprobanteError) throw new Error(comprobanteError.message)

      toastSuccess({
        title: 'Movimiento registrado',
        message: 'El movimiento se ha guardado correctamente en tu cuenta.'
      })
      resetearFormulario()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error desconocido'
      toastError({ title: 'Error al registrar', message: msg })
    } finally {
      setRegistrando(false)
    }
  }

  const inputClass =
    'w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500 transition-colors'
  const labelClass = 'text-[11px] font-bold uppercase tracking-wider text-slate-400'

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-3xl mx-auto pb-24 md:pb-8">
      {/* Header */}
      <FadeIn as="header">
        <div className="flex items-center gap-3">
          <div className="bg-primary-100 dark:bg-primary-900/30 p-2 rounded-xl text-primary-600 dark:text-primary-400">
            <UploadCloud className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Subir Comprobante</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
              Registra un gasto o ingreso desde la captura de tu Pago Móvil, transferencia o ticket
            </p>
          </div>
        </div>
      </FadeIn>

      {!comprobanteListo ? (
        <FadeIn delay={100}>
          <AnimatedCard className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 p-6 md:p-8 shadow-sm flex flex-col items-center text-center">
            <div className="bg-slate-100 dark:bg-slate-800 p-5 rounded-full text-slate-400 mb-4">
              <ImagePlus className="w-10 h-10" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Sube tu comprobante o captura</h2>
            <p className="text-xs md:text-sm text-slate-400 mt-1 max-w-md leading-relaxed mb-6">
              Selecciona la captura de pantalla de tu Pago Móvil, transferencia o ticket de compra. La analizaremos automáticamente para extraer el monto y la referencia.
            </p>

            {/* Tipo de movimiento: selector visible antes del análisis */}
            <div className="w-full mb-4">
              <label className={labelClass}>Tipo de movimiento</label>
              <div className="grid grid-cols-2 gap-2 mt-1.5">
                <button
                  type="button"
                  onClick={() => cambiarTipoMovimiento('gasto')}
                  className={`py-2.5 rounded-xl text-sm font-bold border transition-colors ${tipoMovimiento === 'gasto' ? 'bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-800 text-red-600 dark:text-red-400' : 'border-slate-200 dark:border-slate-700 text-slate-400 hover:border-slate-300'}`}
                >
                  Gasto
                </button>
                <button
                  type="button"
                  onClick={() => cambiarTipoMovimiento('ingreso')}
                  className={`py-2.5 rounded-xl text-sm font-bold border transition-colors ${tipoMovimiento === 'ingreso' ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400' : 'border-slate-200 dark:border-slate-700 text-slate-400 hover:border-slate-300'}`}
                >
                  Ingreso
                </button>
              </div>
            </div>

            <input
              ref={inputArchivoRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleSeleccionarArchivo}
              disabled={procesando}
            />
            <button
              type="button"
              onClick={() => inputArchivoRef.current?.click()}
              disabled={procesando}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl bg-primary-600 hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-sm transition-colors"
            >
              {procesando ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImagePlus className="w-5 h-5" />}
              {procesando ? 'Analizando captura...' : 'Seleccionar Imagen'}
            </button>
          </AnimatedCard>
        </FadeIn>
      ) : (
        <StaggerContainer className="space-y-4">
          {/* Captured image preview */}
          {previewUrl && (
            <FadeIn>
              <button
                type="button"
                onClick={() => setPreviewAmpliado(true)}
                className="relative block w-full h-48 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-700 group"
                title="Ampliar vista previa"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewUrl} alt="Vista previa del comprobante" className="w-full h-full object-cover" />
                <span className="absolute bottom-3 left-3 right-3 flex items-center justify-center gap-1.5 bg-slate-900/70 text-white text-[11px] font-bold py-1.5 rounded-xl">
                  <Expand className="w-3.5 h-3.5" />
                  Toca para ampliar y ver imagen completa
                </span>
              </button>
            </FadeIn>
          )}

          {/* Extracted data */}
          <FadeIn>
            <AnimatedCard className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 p-5 md:p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-[11px] font-extrabold uppercase tracking-wide">Datos Extraídos de la Captura</span>
              </div>

              {/* Tipo selector: still visible and editable after the analysis */}
              <div className="space-y-1.5">
                <label className={labelClass}>Tipo de movimiento</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => cambiarTipoMovimiento('gasto')}
                    className={`py-2.5 rounded-xl text-sm font-bold border transition-colors ${tipoMovimiento === 'gasto' ? 'bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-800 text-red-600 dark:text-red-400' : 'border-slate-200 dark:border-slate-700 text-slate-400 hover:border-slate-300'}`}
                  >
                    Gasto
                  </button>
                  <button
                    type="button"
                    onClick={() => cambiarTipoMovimiento('ingreso')}
                    className={`py-2.5 rounded-xl text-sm font-bold border transition-colors ${tipoMovimiento === 'ingreso' ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400' : 'border-slate-200 dark:border-slate-700 text-slate-400 hover:border-slate-300'}`}
                  >
                    Ingreso
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className={labelClass} htmlFor="comprobante-descripcion">Nombre del movimiento</label>
                <input
                  id="comprobante-descripcion"
                  className={inputClass}
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Ej. Pago móvil supermercado"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className={labelClass} htmlFor="comprobante-monto">Monto</label>
                  <div className="relative">
                    <input
                      id="comprobante-monto"
                      className={inputClass}
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min="0"
                      value={monto}
                      onChange={(e) => setMonto(e.target.value)}
                      placeholder="0.00"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      {moneda === 'USD' ? '$' : 'Bs.'}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className={labelClass} htmlFor="comprobante-referencia">Nº Referencia</label>
                  <input
                    id="comprobante-referencia"
                    className={inputClass}
                    value={referencia}
                    onChange={(e) => setReferencia(e.target.value)}
                    placeholder="Nº de referencia"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className={labelClass} htmlFor="comprobante-moneda">Moneda</label>
                  <AnimatedSelect
                    id="comprobante-moneda"
                    value={moneda}
                    onChange={(value) => setMoneda(value === 'USD' ? 'USD' : 'VES')}
                    options={[
                      { value: 'VES', label: 'Bs. (VES)' },
                      { value: 'USD', label: 'Dólares (USD)' }
                    ]}
                  />
                </div>

              <div className="space-y-1.5">
                <label className={labelClass} htmlFor="comprobante-categoria">Categoría</label>
                <AnimatedSelect
                  id="comprobante-categoria"
                  value={categoriaId}
                  onChange={setCategoriaId}
                  placeholder="Sin categoría"
                  options={[
                    { value: '', label: 'Sin categoría' },
                    ...categoriasFiltradas.map(c => ({ value: c.id, label: c.nombre }))
                  ]}
                />
              </div>
              </div>

              <div className="space-y-1.5">
                <label className={labelClass} htmlFor="comprobante-fecha">Fecha de la operación</label>
                <input
                  id="comprobante-fecha"
                  className={inputClass}
                  value={fechaDetectada}
                  onChange={(e) => setFechaDetectada(e.target.value)}
                  placeholder="Ej. 2026-11-21"
                />
              </div>
            </AnimatedCard>
          </FadeIn>

          {/* Linking and persistence */}
          <FadeIn delay={100}>
            <AnimatedCard className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 p-5 md:p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-1.5 text-primary-600 dark:text-primary-400">
                <Link2 className="w-4 h-4" />
                <span className="text-[11px] font-extrabold uppercase tracking-wide">Vinculación</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className={labelClass} htmlFor="comprobante-cuenta">Cuenta del movimiento</label>
                  <AnimatedSelect
                    id="comprobante-cuenta"
                    value={cuentaId}
                    onChange={setCuentaId}
                    placeholder="Selecciona una cuenta"
                    options={(cuentas ?? []).map(c => ({
                      value: c.id,
                      label: `${c.nombre} (${c.moneda === 'USD' ? '$' : 'Bs.'})`
                    }))}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className={labelClass} htmlFor="comprobante-vinculo">Vincular a</label>
                  <AnimatedSelect
                    id="comprobante-vinculo"
                    value={vinculoTipo}
                    onChange={(value) => {
                      const tipo = value as TipoVinculo
                      setVinculoTipo(tipo)
                      setVinculoId('')
                    }}
                    options={[
                      { value: 'ninguno', label: 'Ninguno' },
                      { value: 'deuda', label: 'Una deuda' },
                      { value: 'meta', label: 'Una meta de ahorro' }
                    ]}
                  />
                </div>
              </div>

              {vinculoTipo === 'deuda' && (
                <div className="space-y-1.5">
                  <label className={labelClass} htmlFor="comprobante-deuda">Deuda a vincular</label>
                  <AnimatedSelect
                    id="comprobante-deuda"
                    value={vinculoId}
                    onChange={setVinculoId}
                    placeholder="Selecciona una deuda"
                    options={(deudas ?? []).filter(d => d.saldo_pendiente > 0).map(d => ({
                      value: d.id,
                      label: `${d.nombre} - ${moneda === 'USD' ? '$' : 'Bs. '}${Number(d.saldo_pendiente).toFixed(2)}`
                    }))}
                  />
                </div>
              )}

              {vinculoTipo === 'meta' && (
                <div className="space-y-1.5">
                  <label className={labelClass} htmlFor="comprobante-meta">Meta a vincular</label>
                  <AnimatedSelect
                    id="comprobante-meta"
                    value={vinculoId}
                    onChange={setVinculoId}
                    placeholder="Selecciona una meta"
                    options={(metas ?? []).map(m => ({
                      value: m.id,
                      label: `${m.nombre} - ${moneda === 'USD' ? '$' : 'Bs. '}${Number(m.monto_actual).toFixed(2)}`
                    }))}
                  />
                </div>
              )}

              <div className="flex items-start gap-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-2xl p-3.5">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-[11px] md:text-xs text-amber-800 dark:text-amber-300">
                  El movimiento se registrará en la cuenta seleccionada. La imagen no se almacena: solo se usa para leer los datos y luego se descarta.
                </p>
              </div>
            </AnimatedCard>
          </FadeIn>

          <FadeIn delay={200} className="space-y-2">
            <button
              type="button"
              onClick={handleConfirmar}
              disabled={registrando}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl bg-primary-600 hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-sm transition-colors"
            >
              {registrando ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
              {registrando ? 'Registrando movimiento...' : 'Confirmar y Registrar Movimiento'}
            </button>
            <button
              type="button"
              onClick={resetearFormulario}
              disabled={registrando}
              className="w-full py-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-sm font-semibold transition-colors"
            >
              Elegir otra captura
            </button>
          </FadeIn>
        </StaggerContainer>
      )}

      {/* Fullscreen preview overlay */}
      {previewAmpliado && previewUrl && (
        <div
          className="fixed inset-0 z-[60] bg-slate-950/95 flex items-center justify-center p-4"
          onClick={() => setPreviewAmpliado(false)}
        >
          <button
            type="button"
            className="absolute top-6 right-6 p-2 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
            aria-label="Cerrar vista previa"
            onClick={() => setPreviewAmpliado(false)}
          >
            <X className="w-6 h-6" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Comprobante ampliado"
            className="max-h-[85vh] max-w-full object-contain rounded-xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}
