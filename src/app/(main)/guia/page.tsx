'use client'

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
  ChevronRight
} from 'lucide-react'

export const dynamic = 'force-dynamic'

const secciones = [
  {
    id: 'dashboard',
    titulo: 'Dashboard',
    subtitulo: 'Tu pantalla principal',
    icono: LayoutDashboard,
    color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
    pasos: [
      'Es lo primero que ves al entrar.',
      'Te muestra tu Balance Neto en dólares.',
      'Ves de un vistazo: ingresos, gastos, ahorros y deudas.',
      'Abajo aparecen tus transacciones recientes.'
    ],
    href: '/',
    extra: 'Es como el "estado de tu personaje" en un videojuego: siempre sabés cómo estás parado.'
  },
  {
    id: 'cuentas',
    titulo: 'Cuentas',
    subtitulo: '¿Dónde guardás la plata?',
    icono: WalletCards,
    color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    pasos: [
      'Antes de registrar un gasto, creá al menos una cuenta.',
      'Podés tener cuentas en USD (dólares) o VES (bolívares).',
      'Ejemplos: Mi billetera, Pago Móvil, Zelle, Ahorro, etc.',
      'Cada transacción va a salir de una cuenta.'
    ],
    href: '/cuentas',
    extra: 'Si tenés plata en varios lados, creá una cuenta para cada uno. Así todo queda ordenado.'
  },
  {
    id: 'categorias',
    titulo: 'Categorías',
    subtitulo: 'Ponle nombre a tus gastos',
    icono: FolderOpen,
    color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
    pasos: [
      'Creá etiquetas para tus movimientos.',
      'Ejemplos: Comida, Transporte, Salidas, Ropa, Videojuegos.',
      'Mientras más específico, mejor vas a entender en qué se te va la plata.',
      'También sirven para ver gráficas y reportes.'
    ],
    href: '/categorias',
    extra: 'Evitá la categoría genérica "Otros". Esa es la trampa que hace que no sepas dónde gastaste.'
  },
  {
    id: 'transacciones',
    titulo: 'Movimientos',
    subtitulo: 'El corazón de la app',
    icono: ArrowRightLeft,
    color: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
    pasos: [
      'Cada vez que gastás o recibís plata, registralo acá.',
      'Elegí si es un Ingreso (te entra plata) o Gasto (sale plata).',
      'Seleccioná la cuenta y la categoría correspondiente.',
      'La app convierte los bolívares a dólares automáticamente.'
    ],
    href: '/transacciones',
    extra: 'Anotá tus gastos el mismo día. Si los dejás para después, se te olvidan y el resumen no te va a cuadrar.'
  },
  {
    id: 'presupuesto',
    titulo: 'Presupuesto',
    subtitulo: 'Ponele límites a tus gastos',
    icono: Target,
    color: 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400',
    pasos: [
      'Creá un presupuesto mensual por categoría.',
      'Por ejemplo: "Este mes solo $30 en salidas".',
      'La app te avisa si te estás acercando al límite.',
      'Te ayuda a no quedarte en cero antes de fin de mes.'
    ],
    href: '/presupuesto',
    extra: 'El presupuesto es tu salvavidas cuando te dan ganas de comprar cosas que no necesitás.'
  },
  {
    id: 'ahorros',
    titulo: 'Ahorros',
    subtitulo: 'Metas para lo que querés',
    icono: PiggyBank,
    color: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400',
    pasos: [
      'Creá metas: un teléfono nuevo, un viaje, un concierto, etc.',
      'Definí cuánto querés ahorrar y en cuánto tiempo.',
      'Registrá tus aportes y vas a ver la barra de progreso crecer.',
      'Es satisfactorio ver cómo te acercás a tu meta.'
    ],
    href: '/ahorros',
    extra: 'Aunque sea poco, ahorrá algo cada mes. $1 o $5 importan más de lo que pensás.'
  },
  {
    id: 'deudas',
    titulo: 'Deudas',
    subtitulo: 'Las cuentas claras',
    icono: Receipt,
    color: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
    pasos: [
      'Anotá si le debés a alguien o alguien te debe.',
      'Registrá el monto, a quién y para qué.',
      'Marcá como pagada cuando se salde.',
      'Así nadie se hace el loco y no te olvidás de nada.'
    ],
    href: '/deudas',
    extra: 'Las deudas entre amigos son peligrosas. Anotarlas acá mantiene la paz y el bolsillo contento.'
  }
]

const tips = [
  'Registrá tus gastos el mismo día. Los "gastos hormiga" (caramelos, pasajes, apps) son los que desaparecen la plata.',
  'Sé honesto con vos mismo: anotá hasta el café de la esquina.',
  'Revisá el Dashboard una vez por semana para ver si vas bien.',
  'No crees mil categorías, pero tampoco una sola. Buscá un balance para entender tus hábitos.',
  'Aprovechá los ahorros: tener metas claras te motiva a gastar menos en cosas innecesarias.'
]

export default function GuiaPage() {
  return (
    <div className="p-4 md:p-8 space-y-8 max-w-5xl mx-auto pb-24 md:pb-8">
      {/* Header */}
      <div className="text-center md:text-left">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-sm font-medium mb-4">
          <Sparkles className="w-4 h-4" />
          Guía para nuevos usuarios
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-3">
          ¡Bienvenido a tu Control Financiero! 💸
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-lg max-w-3xl">
          Tomar el control de tu plata no tiene que ser aburrido. Acá te explicamos paso a paso cómo empezar, 
          sin tecnicismos ni complicaciones. Vos solo registrá tus movimientos y la app hace la magia.
        </p>
      </div>

      {/* Pasos rápidos para empezar */}
      <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center gap-3 mb-4">
          <BookOpen className="w-6 h-6 text-emerald-100" />
          <h2 className="text-xl font-bold">¿Por dónde empiezo?</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { num: '1', texto: 'Creá tus Cuentas (dónde tenés la plata)' },
            { num: '2', texto: 'Creá tus Categorías (en qué gastás)' },
            { num: '3', texto: 'Registrá tus Movimientos (cada gasto e ingreso)' }
          ].map((item) => (
            <div key={item.num} className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
              <span className="text-2xl font-bold text-emerald-200">{item.num}.</span>
              <p className="mt-1 text-emerald-50">{item.texto}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-emerald-100 text-sm">
          Una vez que hagas esos 3 pasos, el Dashboard se va a empezar a llenar solo y vas a ver el poder de la app.
        </p>
      </div>

      {/* Secciones detalladas */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Cada sección explicada</h2>
        
        <div className="grid gap-6">
          {secciones.map((seccion) => (
            <div 
              key={seccion.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors"
            >
              <div className="p-6">
                <div className="flex items-start gap-4">
                  <div className={`shrink-0 p-3 rounded-xl ${seccion.color}`}>
                    <seccion.icono className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                      <div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">{seccion.titulo}</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">{seccion.subtitulo}</p>
                      </div>
                      <Link
                        href={seccion.href}
                        className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
                      >
                        Ir a {seccion.titulo}
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </div>
                    
                    <ul className="mt-4 space-y-2">
                      {seccion.pasos.map((paso, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
                          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                          <span>{paso}</span>
                        </li>
                      ))}
                    </ul>
                    
                    <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border-l-4 border-emerald-500">
                      <p className="text-sm text-slate-600 dark:text-slate-400 italic">
                        💡 {seccion.extra}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tips de oro */}
      <div className="bg-slate-900 dark:bg-slate-800 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center gap-3 mb-4">
          <Lightbulb className="w-6 h-6 text-yellow-400" />
          <h2 className="text-xl font-bold">Tips de oro para no morir en el intento</h2>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {tips.map((tip, idx) => (
            <div key={idx} className="flex items-start gap-3 p-3 bg-white/10 rounded-xl">
              <span className="text-yellow-400 font-bold shrink-0">{idx + 1}.</span>
              <p className="text-slate-100 text-sm">{tip}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer de la guía */}
      <div className="text-center p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
          ¡Ya estás listo para empezar! 🎮💰
        </h3>
        <p className="text-slate-600 dark:text-slate-400 mb-4">
          No necesitás ser experto. Solo constancia. Empezá creando tus Cuentas y Categorías y hacé tu primer movimiento.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/cuentas"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl transition-colors"
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
