import { FadeIn, AnimatedCard } from '@/components/animations'
import { Shield } from 'lucide-react'

export const dynamic = 'force-dynamic';

export default function PrivacidadPage() {
  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto pb-24 md:pb-8">
      <FadeIn as="header" className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="w-8 h-8 text-primary-600 dark:text-primary-400" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Política de Privacidad</h1>
        </div>
        <p className="text-slate-500 dark:text-slate-400 text-sm">Última actualización: {new Date().toLocaleDateString('es-ES')}</p>
      </FadeIn>

      <FadeIn delay={100}>
        <AnimatedCard className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6 text-slate-700 dark:text-slate-300">
          <section>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">1. Información que recopilamos</h2>
            <p className="text-sm leading-relaxed">
              Apicasch recopila únicamente la información necesaria para el funcionamiento de la aplicación: tu correo electrónico,
              nombre opcional, y los datos financieros que ingreses voluntariamente (cuentas, transacciones, metas y deudas).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">2. Uso de la información</h2>
            <p className="text-sm leading-relaxed">
              Tu información se utiliza exclusivamente para mostrarte tus finanzas personales dentro de la aplicación.
              No vendemos ni compartimos tus datos con terceros con fines comerciales.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">3. Seguridad</h2>
            <p className="text-sm leading-relaxed">
              Utilizamos Supabase para el almacenamiento y autenticación. Los datos se transmiten mediante conexiones cifradas (HTTPS/TLS)
              y el acceso está protegido por políticas de seguridad a nivel de fila (RLS).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">4. Tus derechos</h2>
            <p className="text-sm leading-relaxed">
              Podés acceder, modificar o eliminar tus datos en cualquier momento desde la sección de Perfil.
              Al eliminar tu cuenta, todos tus datos personales y financieros se borran de nuestros sistemas.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">5. Contacto</h2>
            <p className="text-sm leading-relaxed">
              Si tenés preguntas sobre esta política, escribinos a{' '}
              <a href="mailto:soporte@apicasch.com" className="text-primary-600 dark:text-primary-400 hover:underline">
                soporte@apicasch.com
              </a>.
            </p>
          </section>
        </AnimatedCard>
      </FadeIn>
    </div>
  )
}
