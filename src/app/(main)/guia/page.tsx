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
      'Es la vista principal cada vez que inicias sesiÃ³n.',
      'Muestra el Balance Neto total consolidado en dÃ³lares.',
      'Permite ver de un vistazo: ingresos, gastos, ahorros y deudas.',
      'Presenta el resumen de tus transacciones y movimientos recientes.'
    ],
    href: '/',
    extra: 'Es el termÃ³metro de la salud financiera: permite saber de inmediato cuÃ¡l es tu situaciÃ³n actual.'
  },
  {
    id: 'cuentas',
    title: 'Cuentas',
    subtitle: 'Administra billeteras y bancos',
    icon: WalletCards,
    color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    steps: [
      'Antes de registrar transacciones, crea al menos una cuenta.',
      'Puedes crear cuentas en USD (dÃ³lares) o VES (bolÃ­vares).',
      'Ejemplos: Billetera de efectivo, Cuenta bancaria, Pago MÃ³vil, Zelle o Tarjeta.',
      'Cada transacciÃ³n que agregues afectarÃ¡ el saldo de la cuenta seleccionada.'
    ],
    href: '/cuentas',
    extra: 'Si manejas dinero en diferentes plataformas o bancos, crea una cuenta para cada una para mantener saldos exactos.'
  },
  {
    id: 'categorias',
    title: 'CategorÃ­as',
    subtitle: 'Organiza y clasifica movimientos',
    icon: FolderOpen,
    color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
    steps: [
      'Crear etiquetas personalizadas para clasificar tus gastos e ingresos.',
      'Ejemplos: AlimentaciÃ³n, Transporte, Servicios, Entretenimiento, Ropa.',
      'Entre mÃ¡s especÃ­ficas sean tus categorÃ­as, mejor entenderÃ¡s tus hÃ¡bitos de consumo.',
      'Sirven como base para generar grÃ¡ficas, estadÃ­sticas y presupuestos.'
    ],
    href: '/categorias',
    extra: 'Evitar agrupar todo en una categorÃ­a genÃ©rica como "Otros". Nombrar cada gasto con precisiÃ³n es la clave del control.'
  },
  {
    id: 'transacciones',
    title: 'Movimientos (Transacciones)',
    subtitle: 'El registro diario de ingresos y gastos',
    icon: ArrowRightLeft,
    color: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
    steps: [
      'Registra cada ingreso o gasto en el momento en que ocurre.',
      'Selecciona el tipo: Ingreso (dinero recibido) o Gasto (dinero que sale).',
      'Asigna la cuenta de origen y la categorÃ­a correspondiente.',
      'Si el movimiento es en bolÃ­vares, el sistema calcula la conversiÃ³n a dÃ³lares automÃ¡ticamente con la tasa del momento.'
    ],
    href: '/transacciones',
    extra: 'Registrar compras en el mismo instante en que las realizas. EvitarÃ¡s olvidar montos pequeÃ±os que luego descuadran tu balance.'
  },
  {
    id: 'presupuesto',
    title: 'Presupuesto',
    subtitle: 'Establece lÃ­mites inteligentes de gasto',
    icon: Target,
    color: 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400',
    steps: [
      'Define un lÃ­mite mensual de gasto para cada categorÃ­a.',
      'Por ejemplo: "MÃ¡ximo $50 al mes en Restaurantes y Salidas".',
      'El sistema te indicarÃ¡ con barras de color cuando estÃ©s cerca del lÃ­mite o si lo has superado.',
      'Te ayuda a planificar tus finanzas y evitar quedarte sin fondos antes de fin de mes.'
    ],
    href: '/presupuesto',
    extra: 'Un presupuesto no es una limitaciÃ³n, es una herramienta para decidir conscientemente a dÃ³nde quieres que vaya el dinero.'
  },
  {
    id: 'ahorros',
    title: 'Metas de Ahorro',
    subtitle: 'Alcanza objetivos financieros',
    icon: PiggyBank,
    color: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400',
    steps: [
      'Crea metas claras: un viaje, fondo de emergencia, estudios o un dispositivo nuevo.',
      'Define el monto objetivo y la fecha estimada para completarlo.',
      'Registra tus aportes periÃ³dicos y observa la barra de progreso avanzar.',
      'MantÃ©n tu motivaciÃ³n visualizando quÃ© porcentaje te falta para cumplir tu meta.'
    ],
    href: '/ahorros',
    extra: 'La constancia vence a la cantidad: destinar una pequeÃ±a suma cada semana tiene un gran impacto a mediano y largo plazo.'
  },
  {
    id: 'deudas',
    title: 'Control de Deudas',
    subtitle: 'Cuentas claras y compromisos al dÃ­a',
    icon: Receipt,
    color: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
    steps: [
      'Registra tanto el dinero que debes (Por Pagar) como el dinero que te deben (Por Cobrar).',
      'Indica la persona o entidad, el monto, la fecha lÃ­mite y una descripciÃ³n.',
      'Marca las deudas como pagadas o liquidadas a medida que se completen.',
      'Evita olvidos y mantÃ©n el control exacto de tus compromisos crediticios.'
    ],
    href: '/deudas',
    extra: 'Tener un registro claro de prÃ©stamos evita desacuerdos y te ayuda a priorizar el pago de tus obligaciones.'
  }
]

const quickStartSteps: QuickStartStep[] = [
  { number: '1', title: 'Crea cuentas', description: 'Define dÃ³nde tienes el dinero (efectivo, banco, etc.).' },
  { number: '2', title: 'Crea tus CategorÃ­as', description: 'Clasifica en quÃ© sueles gastar o recibir ingresos.' },
  { number: '3', title: 'Registra movimientos', description: 'Anota cada ingreso o gasto del dÃ­a a dÃ­a.' }
]

const goldenTips: string[] = [
  'Registrar compras en el momento. Los pequeÃ±os gastos cotidianos son los que mÃ¡s rÃ¡pido reducen tu balance.',
  'MantÃ©n la honestidad con tus nÃºmeros: registra cada detalle para que tus balances reflejen tu realidad financiera.',
  'Revisa tu Panel Principal al menos una vez por semana para evaluar tu progreso.',
  'Busca un equilibrio en tus categorÃ­as: no crees demasiadas para no complicarte, ni muy pocas para no perder visibilidad.',
  'Utiliza las metas de ahorro para proteger tu capital de compras impulsivas.'
]

export default function GuidePage() {
  return (
    <div className="p-4 md:p-8 space-y-8 max-w-5xl mx-auto pb-24 md:pb-8">
      {/* Header */}
      <div className="text-center md:text-left">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 text-sm font-medium mb-4">
          <Sparkles className="w-4 h-4" />
          GuÃ­a de IntroducciÃ³n
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-3">
          Â¡Bienvenido a tu Control Financiero! ðŸ’¸
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-lg max-w-3xl">
          Gestionar el dinero de forma inteligente no tiene que ser complejo. En esta guÃ­a te explicamos
          paso a paso cÃ³mo aprovechar al mÃ¡ximo cada herramienta de Apicash, en dÃ³lares (USD) y bolÃ­vares (VES).
        </p>
      </div>

      {/* Quick start 3-step banner */}
      <div className="bg-gradient-to-br from-primary-600 to-primary-800 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center gap-3 mb-4">
          <BookOpen className="w-6 h-6 text-primary-100" />
          <h2 className="text-xl font-bold">Â¿CÃ³mo empezar en 3 pasos?</h2>
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
          Al completar estos tres pasos, el Panel Principal comenzarÃ¡ a actualizar tus estadÃ­sticas y balances de forma automÃ¡tica.
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
              <h2 className="text-2xl font-bold text-white">Instalar como AplicaciÃ³n Nativa</h2>
            </div>
          </div>
          <p className="text-sm text-slate-400 md:max-w-xs">
            Disfruta de Apicash a pantalla completa, sin barras del navegador y con acceso instantÃ¡neo desde tu pantalla de inicio.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Android Chrome / Brave Guide Card */}
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
                <Download className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">En telÃ©fonos Android (Chrome / Brave)</h3>
            </div>
            <ol className="space-y-3 text-sm text-slate-300">
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold shrink-0 mt-0.5">1</span>
                <span>Abre <strong>Apicash</strong> en el navegador <strong>Google Chrome</strong> o <strong>Brave</strong>.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold shrink-0 mt-0.5">2</span>
                <span>Toca el botÃ³n de los <strong>tres puntos (â‹®)</strong> en la esquina superior derecha del navegador.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold shrink-0 mt-0.5">3</span>
                <span>Selecciona la opciÃ³n <strong>&quot;Instalar aplicaciÃ³n&quot;</strong> o <strong>&quot;Agregar a la pantalla principal&quot;</strong>.</span>
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
                <span>Toca el botÃ³n <strong>Compartir</strong> <Share2 className="inline w-3.5 h-3.5 mx-1" /> (el cuadro con la flecha hacia arriba en la barra inferior).</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-teal-500/20 text-teal-400 text-xs font-bold shrink-0 mt-0.5">3</span>
                <span>DesplÃ¡zate hacia abajo y pulsa <strong>&quot;Agregar al inicio&quot;</strong> <PlusSquare className="inline w-3.5 h-3.5 mx-1" /> (Add to Home Screen).</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-teal-500/20 text-teal-400 text-xs font-bold shrink-0 mt-0.5">4</span>
                <span>Confirma tocando <strong>&quot;Agregar&quot;</strong> en la esquina superior derecha y Ã¡brela desde tu pantalla principal.</span>
              </li>
            </ol>
          </div>
        </div>

        <div className="p-4 bg-emerald-950/40 border border-emerald-500/20 rounded-2xl flex items-center gap-3 text-xs text-emerald-200/90">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>
            <strong>Ventajas de instalar la app:</strong> Ocupa menos de 2 MB de almacenamiento, no requiere descargas pesadas de tiendas y se ejecuta con animaciones fluidas sin barras de bÃºsqueda.
          </span>
        </div>
      </div>

      {/* Detailed Module Sections */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">MÃ³dulos de la AplicaciÃ³n</h2>
        
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
                        ðŸ’¡ {section.extra}
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
          <h2 className="text-xl font-bold">Recomendaciones para el Ã©xito financiero</h2>
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
          Â¡Todo listo para comenzar! ðŸš€
        </h3>
        <p className="text-slate-600 dark:text-slate-400 mb-4 max-w-xl mx-auto">
          No necesitas ser un experto en finanzas. El secreto es la constancia en tus registros diarios.
          Crea cuentas, define tus categorÃ­as y registra tu primer movimiento.
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
            Crear categorÃ­as
          </Link>
        </div>
      </div>
    </div>
  )
}


