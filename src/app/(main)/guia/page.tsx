import Link from 'next/link'
import { 
  LayoutDashboard, 
  WalletCards, 
  ArrowRightLeft, 
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
  Sparkle
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
    subtitle: 'Tu centro de control financiero',
    icon: LayoutDashboard,
    color: 'bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400',
    steps: [
      'Es la vista principal cada vez que inicias sesión.',
      'Muestra tu Balance Neto total consolidado en dólares.',
      'Permite ver de un vistazo: ingresos, gastos, ahorros y deudas.',
      'Presenta el resumen de tus transacciones y movimientos recientes.'
    ],
    href: '/',
    extra: 'Es el termómetro de tu salud financiera: te permite saber de inmediato cuál es tu situación actual.'
  },
  {
    id: 'cuentas',
    title: 'Cuentas',
    subtitle: 'Administra tus billeteras y bancos',
    icon: WalletCards,
    color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    steps: [
      'Antes de registrar transacciones, crea al menos una cuenta.',
      'Puedes crear cuentas en USD (dólares) o VES (bolívares).',
      'Ejemplos: Billetera de efectivo, Cuenta bancaria, Pago Móvil, Zelle o Tarjeta.',
      'Cada transacción que agregues afectará el saldo de la cuenta seleccionada.'
    ],
    href: '/cuentas',
    extra: 'Si manejas dinero en diferentes plataformas o bancos, crea una cuenta para cada una para mantener tus saldos exactos.'
  },
  {
    id: 'categorias',
    title: 'Categorías',
    subtitle: 'Organiza y clasifica tus movimientos',
    icon: FolderOpen,
    color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
    steps: [
      'Crea etiquetas personalizadas para clasificar tus gastos e ingresos.',
      'Ejemplos: Alimentación, Transporte, Servicios, Entretenimiento, Ropa.',
      'Entre más específicas sean tus categorías, mejor entenderás tus hábitos de consumo.',
      'Sirven como base para generar gráficas, estadísticas y presupuestos.'
    ],
    href: '/categorias',
    extra: 'Evita agrupar todo en una categoría genérica como "Otros". Nombrar cada gasto con precisión es la clave del control.'
  },
  {
    id: 'transacciones',
    title: 'Movimientos (Transacciones)',
    subtitle: 'El registro diario de tus ingresos y gastos',
    icon: ArrowRightLeft,
    color: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
    steps: [
      'Registra cada ingreso o gasto en el momento en que ocurre.',
      'Selecciona el tipo: Ingreso (dinero recibido) o Gasto (dinero que sale).',
      'Asigna la cuenta de origen y la categoría correspondiente.',
      'Si el movimiento es en bolívares, el sistema calcula la conversión a dólares automáticamente con la tasa del momento.'
    ],
    href: '/transacciones',
    extra: 'Registra tus compras en el mismo instante en que las realizas. Evitarás olvidar montos pequeños que luego descuadran tu balance.'
  },
  {
    id: 'presupuesto',
    title: 'Presupuesto',
    subtitle: 'Establece límites inteligentes de gasto',
    icon: Target,
    color: 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400',
    steps: [
      'Define un límite mensual de gasto para cada categoría.',
      'Por ejemplo: "Máximo $50 al mes en Restaurantes y Salidas".',
      'El sistema te indicará con barras de color cuando estés cerca del límite o si lo has superado.',
      'Te ayuda a planificar tus finanzas y evitar quedarte sin fondos antes de fin de mes.'
    ],
    href: '/presupuesto',
    extra: 'Un presupuesto no es una limitación, es una herramienta para decidir conscientemente a dónde quieres que vaya tu dinero.'
  },
  {
    id: 'ahorros',
    title: 'Metas de Ahorro',
    subtitle: 'Alcanza tus objetivos financieros',
    icon: PiggyBank,
    color: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400',
    steps: [
      'Crea metas claras: un viaje, fondo de emergencia, estudios o un dispositivo nuevo.',
      'Define el monto objetivo y la fecha estimada para completarlo.',
      'Registra tus aportes periódicos y observa la barra de progreso avanzar.',
      'Mantén tu motivación visualizando qué porcentaje te falta para cumplir tu meta.'
    ],
    href: '/ahorros',
    extra: 'La constancia vence a la cantidad: destinar una pequeña suma cada semana tiene un gran impacto a mediano y largo plazo.'
  },
  {
    id: 'deudas',
    title: 'Control de Deudas',
    subtitle: 'Cuentas claras y compromisos al día',
    icon: Receipt,
    color: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
    steps: [
      'Registra tanto el dinero que debes (Por Pagar) como el dinero que te deben (Por Cobrar).',
      'Indica la persona o entidad, el monto, la fecha límite y una descripción.',
      'Marca las deudas como pagadas o liquidadas a medida que se completen.',
      'Evita olvidos y mantén el control exacto de tus compromisos crediticios.'
    ],
    href: '/deudas',
    extra: 'Tener un registro claro de préstamos evita desacuerdos y te ayuda a priorizar el pago de tus obligaciones.'
  }
]

const quickStartSteps: QuickStartStep[] = [
  { number: '1', title: 'Crea tus Cuentas', description: 'Define dónde tienes tu dinero (efectivo, banco, etc.).' },
  { number: '2', title: 'Crea tus Categorías', description: 'Clasifica en qué sueles gastar o recibir ingresos.' },
  { number: '3', title: 'Registra tus Movimientos', description: 'Anota cada ingreso o gasto del día a día.' }
]

const goldenTips: string[] = [
  'Registra tus compras en el momento. Los pequeños gastos cotidianos son los que más rápido reducen tu balance.',
  'Mantén la honestidad con tus números: registra cada detalle para que tus balances reflejen tu realidad financiera.',
  'Revisa tu Panel Principal al menos una vez por semana para evaluar tu progreso.',
  'Busca un equilibrio en tus categorías: no crees demasiadas para no complicarte, ni muy pocas para no perder visibilidad.',
  'Utiliza las metas de ahorro para proteger tu capital de compras impulsivas.'
]

export default function GuidePage() {
  return (
    <div className="p-4 md:p-8 space-y-8 max-w-5xl mx-auto pb-24 md:pb-8">
      {/* Header */}
      <div className="text-center md:text-left">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 text-sm font-medium mb-4">
          <Sparkles className="w-4 h-4" />
          Guía de Introducción
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-3">
          ¡Bienvenido a tu Control Financiero! 💸
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-lg max-w-3xl">
          Gestionar tu dinero de forma inteligente no tiene que ser complejo. En esta guía te explicamos
          paso a paso cómo aprovechar al máximo cada herramienta de Apicash, en dólares (USD) y bolívares (VES).
        </p>
      </div>

      {/* Quick start 3-step banner */}
      <div className="bg-gradient-to-br from-primary-600 to-primary-800 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center gap-3 mb-4">
          <BookOpen className="w-6 h-6 text-primary-100" />
          <h2 className="text-xl font-bold">¿Cómo empezar en 3 pasos?</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {quickStartSteps.map((item) => (
            <div key={item.number} className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
              <span className="text-2xl font-bold text-primary-200">{item.number}.</span>
              <h3 className="font-semibold text-white mt-1">{item.title}</h3>
              <p className="text-primary-50 text-sm mt-0.5">{item.description}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-primary-100 text-sm">
          Al completar estos tres pasos, el Panel Principal comenzará a actualizar tus estadísticas y balances de forma automática.
        </p>
      </div>

      {/* PWA Native Installation Section */}
      <div id="instalar-app" className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 text-white shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30">
              <Smartphone className="w-7 h-7" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">
                <Sparkle className="w-3.5 h-3.5" />
                Experiencia Recomendada
              </div>
              <h2 className="text-2xl font-bold text-white">Instalar como Aplicación Nativa</h2>
            </div>
          </div>
          <p className="text-sm text-slate-400 md:max-w-xs">
            Disfruta de Apicash a pantalla completa, sin barras del navegador y con acceso instantáneo desde tu pantalla de inicio.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Android Chrome / Brave Guide Card */}
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
                <Download className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">En teléfonos Android (Chrome / Brave)</h3>
            </div>
            <ol className="space-y-3 text-sm text-slate-300">
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold shrink-0 mt-0.5">1</span>
                <span>Abre <strong>Apicash</strong> en el navegador <strong>Google Chrome</strong> o <strong>Brave</strong>.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold shrink-0 mt-0.5">2</span>
                <span>Toca el botón de los <strong>tres puntos (⋮)</strong> en la esquina superior derecha del navegador.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold shrink-0 mt-0.5">3</span>
                <span>Selecciona la opción <strong>&quot;Instalar aplicación&quot;</strong> o <strong>&quot;Agregar a la pantalla principal&quot;</strong>.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold shrink-0 mt-0.5">4</span>
                <span>Cierra el navegador y abre la app desde el <strong>icono de Apicash</strong> creado en tu escritorio.</span>
              </li>
            </ol>
          </div>

          {/* iOS Safari Guide Card */}
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-teal-500/10 text-teal-400 rounded-xl">
                <Share2 className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">En iPhone y iPad (Safari)</h3>
            </div>
            <ol className="space-y-3 text-sm text-slate-300">
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-teal-500/20 text-teal-400 text-xs font-bold shrink-0 mt-0.5">1</span>
                <span>Abre el enlace de <strong>Apicash</strong> exclusivamente en el navegador <strong>Safari</strong>.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-teal-500/20 text-teal-400 text-xs font-bold shrink-0 mt-0.5">2</span>
                <span>Toca el botón <strong>Compartir</strong> <Share2 className="inline w-3.5 h-3.5 mx-1" /> (el cuadro con la flecha hacia arriba en la barra inferior).</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-teal-500/20 text-teal-400 text-xs font-bold shrink-0 mt-0.5">3</span>
                <span>Desplázate hacia abajo y pulsa <strong>&quot;Agregar al inicio&quot;</strong> <PlusSquare className="inline w-3.5 h-3.5 mx-1" /> (Add to Home Screen).</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-teal-500/20 text-teal-400 text-xs font-bold shrink-0 mt-0.5">4</span>
                <span>Confirma tocando <strong>&quot;Agregar&quot;</strong> en la esquina superior derecha y ábrela desde tu pantalla principal.</span>
              </li>
            </ol>
          </div>
        </div>

        <div className="p-4 bg-emerald-950/40 border border-emerald-500/20 rounded-2xl flex items-center gap-3 text-xs text-emerald-200/90">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>
            <strong>Ventajas de instalar la app:</strong> Ocupa menos de 2 MB de almacenamiento, no requiere descargas pesadas de tiendas y se ejecuta con animaciones fluidas sin barras de búsqueda.
          </span>
        </div>
      </div>

      {/* Detailed Module Sections */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Módulos de la Aplicación</h2>
        
        <div className="grid gap-6">
          {guideSections.map((section) => (
            <div 
              key={section.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors"
            >
              <div className="p-6">
                <div className="flex items-start gap-4">
                  <div className={`shrink-0 p-3 rounded-xl ${section.color}`}>
                    <section.icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                      <div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">{section.title}</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">{section.subtitle}</p>
                      </div>
                      <Link
                        href={section.href}
                        className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
                      >
                        Ir a {section.title}
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </div>
                    
                    <ul className="mt-4 space-y-2">
                      {section.steps.map((step, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
                          <CheckCircle2 className="w-5 h-5 text-primary-500 shrink-0 mt-0.5" />
                          <span>{step}</span>
                        </li>
                      ))}
                    </ul>
                    
                    <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border-l-4 border-primary-500">
                      <p className="text-sm text-slate-600 dark:text-slate-400 italic">
                        💡 {section.extra}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Best Practice Tips */}
      <div className="bg-slate-900 dark:bg-slate-800 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center gap-3 mb-4">
          <Lightbulb className="w-6 h-6 text-yellow-400" />
          <h2 className="text-xl font-bold">Recomendaciones para el éxito financiero</h2>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {goldenTips.map((tip, idx) => (
            <div key={idx} className="flex items-start gap-3 p-3 bg-white/10 rounded-xl">
              <span className="text-yellow-400 font-bold shrink-0">{idx + 1}.</span>
              <p className="text-slate-100 text-sm">{tip}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Guide Footer Call-To-Action */}
      <div className="text-center p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
          ¡Todo listo para comenzar! 🚀
        </h3>
        <p className="text-slate-600 dark:text-slate-400 mb-4 max-w-xl mx-auto">
          No necesitas ser un experto en finanzas. El secreto es la constancia en tus registros diarios.
          Crea tus cuentas, define tus categorías y registra tu primer movimiento.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/cuentas"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-xl transition-colors"
          >
            <WalletCards className="w-5 h-5" />
            Crear mi primera cuenta
          </Link>
          <Link
            href="/categorias"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium rounded-xl transition-colors"
          >
            <FolderOpen className="w-5 h-5" />
            Crear categorías
          </Link>
        </div>
      </div>
    </div>
  )
}
