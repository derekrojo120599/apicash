import Link from 'next/link'
import { 
  LayoutDashboard, 
  WalletCards, 
  ArrowRightLeft, 
  Calculator,
  Target, 
  FolderOpen, 
  PiggyBank, 
  Receipt, 
  Sparkles,
  Lightbulb,
  CheckCircle2,
  BookOpen,
  ChevronRight,
  Smartphone,
  Download,
  Share2,
  PlusSquare,
  Sparkle,
  Zap,
  HelpCircle
} from 'lucide-react'

interface GuideSection {
  id: string
  title: string
  subtitle: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  steps: string[]
  href: string
  extra: string
}

interface QuickStartStep {
  number: string
  title: string
  description: string
}

const guideSections: GuideSection[] = [
  {
    id: 'dashboard',
    title: 'Panel Principal (Dashboard)',
    subtitle: 'Centro de control financiero',
    icon: LayoutDashboard,
    color: 'bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400',
    steps: [
      'Vista panorámica que consolida el Balance Neto en dólares y bolívares.',
      'Permite registrar transacciones instantáneamente con el botón «Nuevo movimiento» sin salir del panel.',
      'Muestra de un vistazo los ingresos, gastos, ahorros acumulados y deudas vigentes.',
      'Lista los últimos movimientos con conversión de moneda calculada al momento.'
    ],
    href: '/',
    extra: 'Es el termómetro de la salud financiera: permite conocer de inmediato el estado global del patrimonio.'
  },
  {
    id: 'cuentas',
    title: 'Cuentas',
    subtitle: 'Billeteras, bancos y plataformas',
    icon: WalletCards,
    color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    steps: [
      'Paso inicial obligatorio: cree al menos una cuenta antes de registrar transacciones.',
      'Soporta cuentas en USD (dólares) y en VES (bolívares).',
      'Ejemplos prácticos: Efectivo, Banco mercantil/Banesco, Pago Móvil, Zelle o Binance.',
      'Cada movimiento registrado actualiza en tiempo real el saldo de la cuenta asociada.'
    ],
    href: '/cuentas',
    extra: 'Si maneja fondos en múltiples entidades o billeteras, cree una cuenta independiente para cada una para garantizar saldos contables exactos.'
  },
  {
    id: 'calculadora',
    title: 'Calculadora de Divisas',
    subtitle: 'Conversión rápida y consulta de mercado',
    icon: Calculator,
    color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
    steps: [
      'Herramienta de consulta rápida para calcular conversiones bidireccionales (USD ↔ VES).',
      'Permite elegir entre tasas oficiales registradas (BCV, Cotizave, etc.) o ingresar una tasa manual.',
      'Incluye botones de montos frecuentes (+5, +10, +20, +50...) y botón de copiado de resultado.',
      'Es exclusivamente consultiva: no altera sus balances ni registra movimientos contables.'
    ],
    href: '/calculadora',
    extra: 'Úsela para verificar presupuestos en la calle o cotizar compras antes de realizar pagos en bolívares o dólares.'
  },
  {
    id: 'transacciones',
    title: 'Movimientos (Transacciones)',
    subtitle: 'Registro continuo de ingresos, gastos y traspasos',
    icon: ArrowRightLeft,
    color: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
    steps: [
      'Registre cada movimiento al momento de producirse para evitar desfases de saldo.',
      'Soporta Gastos, Ingresos y Traspasos entre cuentas de la misma divisa.',
      'Para pagos en bancos venezolanos calcula automáticamente comisiones bancarias (Pago Móvil, transferencias, punto de venta).',
      'Si el movimiento es en bolívares, guarda el equivalente en dólares con la tasa oficial del día.'
    ],
    href: '/transacciones',
    extra: 'Registrar los consumos al instante previene el olvido de microgastos cotidianos que merman el balance general.'
  },
  {
    id: 'presupuesto',
    title: 'Presupuesto Mensual',
    subtitle: 'Límites inteligentes de gasto',
    icon: Target,
    color: 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400',
    steps: [
      'Defina un tope mensual de gasto para cada una de sus categorías.',
      'El sistema ilustra el progreso con barras de color visuales y alertas preventivas al alcanzar el 90%.',
      'Posibilidad de replicar la configuración del mes previo con un solo clic.',
      'Previene el agotamiento de fondos antes del cierre de quincena o fin de mes.'
    ],
    href: '/presupuesto',
    extra: 'Un presupuesto no es una limitación arbitraria; es una decisión consciente sobre el destino óptimo de sus recursos.'
  },
  {
    id: 'categorias',
    title: 'Categorías',
    subtitle: 'Clasificación organizada con pestañas y buscador',
    icon: FolderOpen,
    color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
    steps: [
      'Organice sus movimientos con etiquetas precisas (Alimentación, Transporte, Servicios, etc.).',
      'Nueva interfaz con pestañas rápidas (Todas, Gastos, Ingresos) y buscador reactivo en tiempo real.',
      'Puede crear categorías al vuelo directamente desde el formulario de transacciones.',
      'Constituyen la base para los reportes analíticos y gráficos del perfil.'
    ],
    href: '/categorias',
    extra: 'Evite acumular conceptos en categorías genéricas. El rigor en los nombres es el factor crítico para identificar oportunidades de ahorro.'
  },
  {
    id: 'ahorros',
    title: 'Metas de Ahorro',
    subtitle: 'Objetivos financieros estructurados',
    icon: PiggyBank,
    color: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400',
    steps: [
      'Defina objetivos tangibles: fondo de emergencias, viajes, educación o adquisiciones de capital.',
      'Establezca el capital deseado y la fecha estimada de cumplimiento.',
      'Realice depósitos o retiros manteniendo visibilidad del porcentaje completado.',
      'Protege los fondos asignados para evitar consumos impulsivos.'
    ],
    href: '/ahorros',
    extra: 'La constancia supera a la cantidad: aportes pequeños pero sistemáticos consolidan un patrimonio sólido en el tiempo.'
  },
  {
    id: 'deudas',
    title: 'Control de Deudas',
    subtitle: 'Obligaciones y cuentas por cobrar al día',
    icon: Receipt,
    color: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
    steps: [
      'Diferencie entre obligaciones pendientes (Por Pagar) y acreencias a su favor (Por Cobrar).',
      'Indique la contraparte, fecha límite de amortización y notas aclaratorias.',
      'Registre abonos parciales o liquidaciones totales manteniendo historial de amortización.',
      'Previene retrasos en compromisos crediticios y desórdenes en cobranzas personales.'
    ],
    href: '/deudas',
    extra: 'Mantener un balance documentado de compromisos elimina fricciones interpersonales y aclara la prioridad de desembolsos.'
  }
]

const quickStartSteps: QuickStartStep[] = [
  { number: '1', title: 'Crear sus cuentas', description: 'Defina dónde se encuentra su dinero (efectivo, banco, billetera digital).' },
  { number: '2', title: 'Definir categorías', description: 'Personalice las etiquetas de sus gastos e ingresos más frecuentes.' },
  { number: '3', title: 'Registrar movimientos', description: 'Utilice el botón «Nuevo movimiento» para asentar ingresos o pagos al instante.' }
]

const goldenTips: string[] = [
  'Registrar los consumos al momento: los pequeños gastos diarios suelen ser los que más rápido reducen el balance.',
  'Mantener la precisión en las cifras: registrar cada detalle permite que los saldos reflejen la realidad financiera.',
  'Consultar la Calculadora antes de pagar: verifique la tasa del mercado para conocer el valor exacto en bolívares o dólares.',
  'Revisar el Panel Principal semanalmente: mantenga un pulso constante del avance presupuestario y metas de ahorro.',
  'Aprovechar la instalación como app (PWA): acceda a pantalla completa desde el móvil sin depender del navegador.'
]

export default function GuidePage() {
  return (
    <div className="p-4 md:p-8 space-y-8 max-w-5xl mx-auto pb-24 md:pb-8">
      {/* Encabezado accesible con semántica clara */}
      <header className="text-center md:text-left space-y-2">
        <div 
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 text-sm font-semibold mb-2"
          role="status"
        >
          <Sparkles className="w-4 h-4" aria-hidden="true" />
          <span>Guía de Introducción</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Bienvenido al Control Financiero de El Sencillo
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-base md:text-lg max-w-3xl leading-relaxed">
          Esta guía interactiva detalla el funcionamiento paso a paso de cada módulo de El Sencillo. 
          Aprenda a gestionar sus finanzas bimonetarias con precisión, tanto en dólares (USD) como en bolívares (VES).
        </p>
      </header>

      {/* Banner de Inicio Rápido en 3 pasos */}
      <section 
        aria-labelledby="quickstart-title"
        className="bg-gradient-to-br from-primary-600 via-primary-700 to-teal-800 rounded-3xl p-6 md:p-8 text-white shadow-lg relative overflow-hidden"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-sm">
            <Zap className="w-6 h-6 text-primary-100" aria-hidden="true" />
          </div>
          <div>
            <h2 id="quickstart-title" className="text-xl md:text-2xl font-bold">
              ¿Cómo comenzar en 3 pasos sencillos?
            </h2>
            <p className="text-primary-100 text-xs md:text-sm mt-0.5">
              Configure su sistema en menos de 2 minutos para empezar a visualizar sus finanzas.
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {quickStartSteps.map((item) => (
            <div 
              key={item.number} 
              className="bg-white/10 hover:bg-white/15 transition-colors rounded-2xl p-5 backdrop-blur-sm border border-white/10 flex flex-col justify-between"
            >
              <div>
                <span className="text-3xl font-black text-primary-200" aria-hidden="true">{item.number}.</span>
                <h3 className="font-bold text-white text-base mt-2">{item.title}</h3>
                <p className="text-primary-100 text-xs md:text-sm mt-1 leading-relaxed">{item.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 p-3.5 bg-black/15 rounded-xl border border-white/10 text-primary-100 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" aria-hidden="true" />
          <span>
            Al registrar transacciones, el Panel Principal actualizará automáticamente sus balances y conversiones.
          </span>
        </div>
      </section>

      {/* Instalación de la Aplicación PWA */}
      <section 
        id="instalar-app" 
        aria-labelledby="pwa-title"
        className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 text-white shadow-xl space-y-6"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30">
              <Smartphone className="w-7 h-7" aria-hidden="true" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">
                <Sparkle className="w-3.5 h-3.5" aria-hidden="true" />
                Experiencia recomendada
              </div>
              <h2 id="pwa-title" className="text-2xl font-bold text-white">Instalar como Aplicación en su Dispositivo</h2>
            </div>
          </div>
          <p className="text-sm text-slate-400 md:max-w-xs">
            Disfrute de El Sencillo a pantalla completa, sin barras del navegador y con acceso instantáneo desde su pantalla de inicio.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Tarjeta Android con descarga de APK y PWA */}
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/15 text-emerald-400 rounded-xl border border-emerald-500/30">
                <Download className="w-5 h-5" aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Android: APK Nativa (Recomendado)</h3>
                <p className="text-xs text-slate-400">Instalación directa sin depender de la tienda</p>
              </div>
            </div>

            <a
              href="https://jkoxmyefjmokdycjlfqb.supabase.co/storage/v1/object/public/downloads/apicash.apk"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] text-white font-bold flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-950/50 transition-all text-sm cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Descargar APK para Android</span>
              <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-white/20 ml-1">v1.0.0</span>
            </a>

            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 text-xs text-slate-400 space-y-1">
              <p className="font-semibold text-slate-300">🔄 Actualizaciones automáticas:</p>
              <p>La app cuenta con actualización remota continua. No tendrás que volver a descargar el APK para recibir mejoras ni cambios de tasas.</p>
            </div>

            <div className="pt-2 border-t border-slate-800/80">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Alternativa PWA (Desde el Navegador):</p>
              <p className="text-xs text-slate-400 leading-relaxed">
                También puede abrir esta web en <strong>Chrome</strong> o <strong>Brave</strong>, tocar el menú de opciones <strong>(⋮)</strong> y seleccionar <strong>«Instalar aplicación»</strong>.
              </p>
            </div>
          </div>

          {/* Tarjeta iOS */}
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-teal-500/15 text-teal-400 rounded-xl border border-teal-500/30">
                <Share2 className="w-5 h-5" aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">iPhone y iPad (iOS)</h3>
                <p className="text-xs text-slate-400">Acceso instantáneo a pantalla completa en Safari</p>
              </div>
            </div>

            <ol className="space-y-3 text-sm text-slate-300">
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-teal-500/20 text-teal-400 text-xs font-bold shrink-0 mt-0.5" aria-hidden="true">1</span>
                <span>Abra el enlace de <strong>El Sencillo</strong> en <strong>Safari</strong>.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-teal-500/20 text-teal-400 text-xs font-bold shrink-0 mt-0.5" aria-hidden="true">2</span>
                <span>Pulse el botón <strong>Compartir</strong> <Share2 className="inline w-3.5 h-3.5 mx-1" aria-hidden="true" /> en la barra inferior.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-teal-500/20 text-teal-400 text-xs font-bold shrink-0 mt-0.5" aria-hidden="true">3</span>
                <span>Desplácese hacia abajo y pulse <strong>«Agregar al inicio»</strong> <PlusSquare className="inline w-3.5 h-3.5 mx-1" aria-hidden="true" />.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-teal-500/20 text-teal-400 text-xs font-bold shrink-0 mt-0.5" aria-hidden="true">4</span>
                <span>Confirme pulsando <strong>«Agregar»</strong> en la esquina superior derecha.</span>
              </li>
            </ol>

            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 text-xs text-slate-400">
              <span>Apple no permite descargas directas fuera de la tienda oficial, pero al agregarla al inicio se ejecuta a pantalla completa con rendimiento nativo.</span>
            </div>
          </div>
        </div>

        <div className="p-4 bg-emerald-950/40 border border-emerald-500/20 rounded-2xl flex items-center gap-3 text-xs text-emerald-200/90">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" aria-hidden="true" />
          <span>
            <strong>Ventajas:</strong> Espacio de almacenamiento mínimo (&lt; 2 MB), acceso directo inmediato y ejecución fluida a pantalla completa.
          </span>
        </div>
      </section>

      {/* Módulos de la Aplicación */}
      <section aria-labelledby="modules-title" className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 id="modules-title" className="text-2xl font-bold text-slate-900 dark:text-white">
              Módulos del Sistema
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
              Guía descriptiva de cada sección de El Sencillo y sus funciones clave
            </p>
          </div>
        </div>
        
        <div className="grid gap-5">
          {guideSections.map((section) => (
            <article 
              key={section.id}
              aria-labelledby={`section-title-${section.id}`}
              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-all hover:border-slate-300 dark:hover:border-slate-700"
            >
              <div className="p-6">
                <div className="flex items-start gap-4">
                  <div className={`shrink-0 p-3.5 rounded-2xl ${section.color}`} aria-hidden="true">
                    <section.icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                      <div>
                        <h3 id={`section-title-${section.id}`} className="text-xl font-bold text-slate-900 dark:text-white">
                          {section.title}
                        </h3>
                        <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm font-medium">
                          {section.subtitle}
                        </p>
                      </div>
                      <Link
                        href={section.href}
                        className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors px-3 py-1.5 rounded-xl bg-primary-50 dark:bg-primary-950/40 border border-primary-200/50 dark:border-primary-800/50 w-fit"
                        aria-label={`Ir al módulo de ${section.title}`}
                      >
                        <span>Abrir sección</span>
                        <ChevronRight className="w-4 h-4" aria-hidden="true" />
                      </Link>
                    </div>
                    
                    <ul className="mt-4 space-y-2.5" role="list">
                      {section.steps.map((step, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 text-slate-700 dark:text-slate-300 text-sm">
                          <CheckCircle2 className="w-4 h-4 text-primary-500 shrink-0 mt-0.5" aria-hidden="true" />
                          <span>{step}</span>
                        </li>
                      ))}
                    </ul>
                    
                    <div className="mt-4 p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border-l-4 border-primary-500 flex items-start gap-2.5">
                      <HelpCircle className="w-4 h-4 text-primary-500 shrink-0 mt-0.5" aria-hidden="true" />
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 italic">
                        {section.extra}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Consejos de Éxito */}
      <section 
        aria-labelledby="tips-title"
        className="bg-slate-900 dark:bg-slate-800 rounded-3xl p-6 md:p-8 text-white shadow-lg space-y-5"
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-yellow-500/20 text-yellow-400 rounded-xl">
            <Lightbulb className="w-6 h-6" aria-hidden="true" />
          </div>
          <div>
            <h2 id="tips-title" className="text-xl font-bold">
              Buenas prácticas para el éxito financiero
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Recomendaciones clave para mantener sus cuentas saludables
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-3.5">
          {goldenTips.map((tip, idx) => (
            <div key={idx} className="flex items-start gap-3 p-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 transition-colors">
              <span className="text-yellow-400 font-black text-sm shrink-0" aria-hidden="true">{idx + 1}.</span>
              <p className="text-slate-200 text-xs sm:text-sm leading-relaxed">{tip}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Llamada a la Acción Inferior */}
      <footer className="text-center p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <h3 className="text-xl font-bold text-slate-900 dark:text-white">
          Todo listo para dar el primer paso
        </h3>
        <p className="text-slate-600 dark:text-slate-400 text-sm max-w-xl mx-auto leading-relaxed">
          No requiere experiencia contable previa. Comience creando su primera cuenta y pruebe registrar un movimiento para ver el sistema en acción.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Link
            href="/cuentas"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-2xl transition-all shadow-sm"
          >
            <WalletCards className="w-5 h-5" aria-hidden="true" />
            <span>Crear primera cuenta</span>
          </Link>
          <Link
            href="/calculadora"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold rounded-2xl transition-all"
          >
            <Calculator className="w-5 h-5 text-emerald-500" aria-hidden="true" />
            <span>Probar calculadora</span>
          </Link>
        </div>
      </footer>
    </div>
  )
}
