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
    subtitle: 'Centro de control financiero',
    icon: LayoutDashboard,
    color: 'bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400',
    steps: [
      'Es la vista principal cada vez que inicia sesión.',
      'Muestra el Balance Neto total consolidado en dólares.',
      'Permite consultar de un vistazo: ingresos, gastos, ahorros y deudas.',
      'Presenta el resumen de las transacciones y movimientos recientes.'
    ],
    href: '/',
    extra: 'Es el termómetro de la salud financiera: permite conocer de inmediato la situación actual.'
  },
  {
    id: 'cuentas',
    title: 'Cuentas',
    subtitle: 'Administración de billeteras y bancos',
    icon: WalletCards,
    color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    steps: [
      'Antes de registrar transacciones, cree al menos una cuenta.',
      'Puede crear cuentas en USD (dólares) o VES (bolívares).',
      'Ejemplos: Billetera de efectivo, Cuenta bancaria, Pago Móvil, Zelle o Tarjeta.',
      'Cada transacción registrada afectará el saldo de la cuenta seleccionada.'
    ],
    href: '/cuentas',
    extra: 'Si maneja fondos en diferentes plataformas o bancos, cree una cuenta para cada una a fin de mantener saldos exactos.'
  },
  {
    id: 'categorias',
    title: 'Categorías',
    subtitle: 'Organización y clasificación de movimientos',
    icon: FolderOpen,
    color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
    steps: [
      'Permite crear etiquetas personalizadas para clasificar gastos e ingresos.',
      'Ejemplos: Alimentación, Transporte, Servicios, Entretenimiento, Ropa.',
      'Cuanto más específicas sean las categorías, mejor comprensión tendrá de los hábitos de consumo.',
      'Sirven como base para generar gráficas, estadísticas y presupuestos.'
    ],
    href: '/categorias',
    extra: 'Evite agrupar todo en una categoría genérica. Nombrar cada gasto con precisión es la clave del control.'
  },
  {
    id: 'transacciones',
    title: 'Movimientos (Transacciones)',
    subtitle: 'Registro continuo de ingresos y gastos',
    icon: ArrowRightLeft,
    color: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
    steps: [
      'Registre cada ingreso o gasto en el momento en que ocurre.',
      'Seleccione el tipo: Ingreso (dinero recibido) o Gasto (dinero que sale).',
      'Asigne la cuenta de origen y la categoría correspondiente.',
      'Si el movimiento es en bolívares, el sistema calcula la conversión a dólares automáticamente con la tasa del momento.'
    ],
    href: '/transacciones',
    extra: 'Registrar los consumos al instante evita olvidar montos pequeños que luego descuadran el balance.'
  },
  {
    id: 'presupuesto',
    title: 'Presupuesto',
    subtitle: 'Límites inteligentes de gasto',
    icon: Target,
    color: 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400',
    steps: [
      'Defina un límite mensual de gasto para cada categoría.',
      'Por ejemplo: "Máximo $50 al mes en Restaurantes y Salidas".',
      'El sistema indicará con barras de color la cercanía al límite o si este ha sido superado.',
      'Facilita la planificación financiera y previene la falta de fondos antes de fin de mes.'
    ],
    href: '/presupuesto',
    extra: 'Un presupuesto es una herramienta para decidir conscientemente hacia dónde destinar los recursos.'
  },
  {
    id: 'ahorros',
    title: 'Metas de Ahorro',
    subtitle: 'Objetivos financieros claros',
    icon: PiggyBank,
    color: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400',
    steps: [
      'Establezca metas claras: un viaje, fondo de emergencia, estudios o una adquisición.',
      'Defina el monto objetivo y la fecha estimada de cumplimiento.',
      'Registre aportes periódicos y observe el avance en la barra de progreso.',
      'Mantenga la motivación visualizando el porcentaje restante para alcanzar la meta.'
    ],
    href: '/ahorros',
    extra: 'La constancia supera a la cantidad: destinar una suma periódica genera un gran impacto en el mediano y largo plazo.'
  },
  {
    id: 'deudas',
    title: 'Control de Deudas',
    subtitle: 'Cuentas claras y compromisos al día',
    icon: Receipt,
    color: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
    steps: [
      'Registre tanto las obligaciones pendientes (Por Pagar) como los cobros pendientes (Por Cobrar).',
      'Indique la persona o entidad, el monto, la fecha límite y una descripción.',
      'Marque las deudas como pagadas o liquidadas a medida que se completen.',
      'Evite descuidos y mantenga el control exacto de sus compromisos crediticios.'
    ],
    href: '/deudas',
    extra: 'Llevar un registro ordenado previene diferencias y ayuda a priorizar el cumplimiento de obligaciones.'
  }
]

const quickStartSteps: QuickStartStep[] = [
  { number: '1', title: 'Crear cuentas', description: 'Defina dónde se encuentran los fondos (efectivo, banco, etc.).' },
  { number: '2', title: 'Crear categorías', description: 'Clasifique los conceptos frecuentes de gastos o ingresos.' },
  { number: '3', title: 'Registrar movimientos', description: 'Anote cada ingreso o gasto cotidiano.' }
]

const goldenTips: string[] = [
  'Registrar los consumos al momento: los pequeños gastos diarios suelen ser los que más rápido reducen el balance.',
  'Mantener la precisión en las cifras: registrar cada detalle permite que los saldos reflejen la realidad financiera.',
  'Revisar el Panel Principal al menos una vez por semana para evaluar el progreso.',
  'Buscar equilibrio en las categorías: evite un exceso innecesario o una síntesis que reste visibilidad.',
  'Utilizar las metas de ahorro para resguardar capital frente a compras impulsivas.'
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
          Bienvenido al Control Financiero
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-lg max-w-3xl">
          Gestionar el dinero de forma ordenada no requiere complejidad. En esta guía se detalla
          paso a paso cómo utilizar cada herramienta de Apicash, tanto en dólares (USD) como en bolívares (VES).
        </p>
      </div>

      {/* Quick start 3-step banner */}
      <div className="bg-gradient-to-br from-primary-600 to-primary-800 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center gap-3 mb-4">
          <BookOpen className="w-6 h-6 text-primary-100" />
          <h2 className="text-xl font-bold">¿Cómo comenzar en 3 pasos?</h2>
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
          Al completar estos tres pasos, el Panel Principal comenzará a actualizar las estadísticas y balances de forma automática.
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
              <h2 className="text-2xl font-bold text-white">Instalar como Aplicación</h2>
            </div>
          </div>
          <p className="text-sm text-slate-400 md:max-w-xs">
            Utilice Apicash a pantalla completa, sin barras del navegador y con acceso directo desde su pantalla de inicio.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Android Chrome / Brave Guide Card */}
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
                <Download className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">En dispositivos Android (Chrome / Brave)</h3>
            </div>
            <ol className="space-y-3 text-sm text-slate-300">
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold shrink-0 mt-0.5">1</span>
                <span>Abra <strong>Apicash</strong> en el navegador <strong>Google Chrome</strong> o <strong>Brave</strong>.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold shrink-0 mt-0.5">2</span>
                <span>Pulse el botón de opciones <strong>(⋮)</strong> en la esquina superior derecha del navegador.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold shrink-0 mt-0.5">3</span>
                <span>Seleccione <strong>«Instalar aplicación»</strong> o <strong>«Agregar a la pantalla principal»</strong>.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold shrink-0 mt-0.5">4</span>
                <span>Abra la aplicación desde el <strong>icono de Apicash</strong> en la pantalla de inicio.</span>
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
                <span>Abra el enlace de <strong>Apicash</strong> en el navegador <strong>Safari</strong>.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-teal-500/20 text-teal-400 text-xs font-bold shrink-0 mt-0.5">2</span>
                <span>Pulse el botón <strong>Compartir</strong> <Share2 className="inline w-3.5 h-3.5 mx-1" /> en la barra inferior.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-teal-500/20 text-teal-400 text-xs font-bold shrink-0 mt-0.5">3</span>
                <span>Desplácese hacia abajo y pulse <strong>«Agregar al inicio»</strong> <PlusSquare className="inline w-3.5 h-3.5 mx-1" />.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-teal-500/20 text-teal-400 text-xs font-bold shrink-0 mt-0.5">4</span>
                <span>Confirme pulsando <strong>«Agregar»</strong> en la esquina superior derecha y acceda desde su pantalla de inicio.</span>
              </li>
            </ol>
          </div>
        </div>

        <div className="p-4 bg-emerald-950/40 border border-emerald-500/20 rounded-2xl flex items-center gap-3 text-xs text-emerald-200/90">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>
            <strong>Ventajas de la instalación:</strong> Espacio de almacenamiento mínimo, acceso inmediato y ejecución optimizada a pantalla completa.
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
                        {section.extra}
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
          <h2 className="text-xl font-bold">Recomendaciones para la gestión financiera</h2>
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
          Todo listo para comenzar
        </h3>
        <p className="text-slate-600 dark:text-slate-400 mb-4 max-w-xl mx-auto">
          El control efectivo parte de la constancia en el registro cotidiano.
          Cree sus cuentas, defina las categorías e ingrese su primer movimiento.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/cuentas"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-xl transition-colors"
          >
            <WalletCards className="w-5 h-5" />
            Crear primera cuenta
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
