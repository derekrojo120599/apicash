'use client'

import { useRef, useState, useSyncExternalStore } from 'react'
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

interface DatosComprobante {
  beneficiario?: string
  referencia?: string
  monto?: number | string
  moneda?: string
  fecha?: string
  categoria?: string
}

type MonedaComprobante = 'USD' | 'VES'
type TipoVinculo = 'ninguno' | 'deuda' | 'meta'

export default function ComprobantePage() {
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )

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
  const [comercio, setComercio] = useState('')
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

  const categoriasGasto = (categorias ?? []).filter(c => c.tipo === 'gasto')

  const resetearFormulario = () => {
    setArchivo(null)
    setPreviewUrl(null)
    setComprobanteListo(false)
    setPreviewAmpliado(false)
    setComercio('')
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
        setComercio(edgeData.beneficiario || 'Comercio / Destinatario')
        setReferencia(edgeData.referencia || 'S/REF')
        setMonto(String(edgeData.monto))
        setMoneda(edgeData.moneda === 'USD' ? 'USD' : 'VES')
        setFechaDetectada(edgeData.fecha || '')
        const sugerida = edgeData.categoria
        const coincidencia = categoriasGasto.find(c => c.nombre === sugerida)
        setCategoriaId(coincidencia?.id ?? '')
        toastSuccess({ title: 'Comprobante analizado', message: 'Verifica los datos antes de registrar el movimiento.' })
      } else {
        setComercio('Comercio o Destinatario')
        setFechaDetectada('')
        toastWarning({
          title: 'Análisis automático no disponible',
          message: 'Ingresa manualmente el monto y la referencia verificando con la captura.'
        })
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'No se pudo analizar la captura.'
      toastError({ title: 'Error al analizar', message: msg })
      setComercio('Comercio o Destinatario')
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
    if (!cuentaId) {
      toastWarning({ title: 'Falta la cuenta', message: 'Selecciona la cuenta donde se registrará el gasto.' })
      return
    }

    setRegistrando(true)
    try {
      const { data: userData, error: authError } = await supabase.auth.getUser()
      if (authError || !userData.user) throw new Error('Sesión no válida. Vuelve a iniciar sesión.')

      // Mirrors the mobile flow: analyze and register the expense. No storage upload (parity with mobile).
      await crearTransaccion({
        cuenta_id: cuentaId,
        categoria_id: categoriaId || undefined,
        tipo: 'gasto',
        monto_original: montoNum,
        moneda_original: moneda,
        descripcion: comercio || 'Gasto',
        fecha: new Date().toISOString(),
        deuda_id: vinculoTipo === 'deuda' && vinculoId ? vinculoId : null,
        meta_id: vinculoTipo === 'meta' && vinculoId ? vinculoId : null
      })

      toastSuccess({
        title: 'Movimiento registrado',
        message: 'El gasto se ha guardado correctamente en tu cuenta.'
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
              Registra un gasto desde la captura de tu Pago Móvil, transferencia o ticket
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

              <div className="space-y-1.5">
                <label className={labelClass} htmlFor="comprobante-comercio">Comercio o Destinatario</label>
                <input
                  id="comprobante-comercio"
                  className={inputClass}
                  value={comercio}
                  onChange={(e) => setComercio(e.target.value)}
                  placeholder="Ej. Comercio o Destinatario"
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
                      ...categoriasGasto.map(c => ({ value: c.id, label: c.nombre }))
                    ]}
                  />
                </div>
              </div>

              {mounted && fechaDetectada && (
                <p className="text-[11px] text-slate-400">Fecha detectada: {fechaDetectada}</p>
              )}
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
                  <label className={labelClass} htmlFor="comprobante-cuenta">Cuenta del gasto</label>
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
                  El gasto se registrará como un movimiento en la cuenta seleccionada.
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
