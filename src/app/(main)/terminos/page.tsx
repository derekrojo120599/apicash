import { FileText } from 'lucide-react'

export default function TerminosPage() {
  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto pb-24 md:pb-8">
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <FileText className="w-8 h-8 text-primary-600 dark:text-primary-400" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Términos de Servicio</h1>
        </div>
        <p className="text-slate-500 dark:text-slate-400 text-sm">Última actualización: {new Date().toLocaleDateString('es-ES')}</p>
      </header>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6 text-slate-700 dark:text-slate-300">
        <section>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">1. Aceptación de los términos</h2>
          <p className="text-sm leading-relaxed">
            Al usar El Sencillo, acepta estos términos de servicio. Si no está de acuerdo, no utilice la aplicación.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">2. Uso de la aplicación</h2>
          <p className="text-sm leading-relaxed">
            El Sencillo es una herramienta personal de control de finanzas. Es su responsabilidad ingresar datos correctos y
            mantener la confidencialidad de su contraseña. No utilice la aplicación para actividades ilícitas.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">3. Disponibilidad y cambios</h2>
          <p className="text-sm leading-relaxed">
            Nos esforzamos por mantener la aplicación disponible, pero no garantizamos un funcionamiento ininterrumpido.
            Podemos modificar o discontinuar funciones con previo aviso cuando sea posible.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">4. Limitación de responsabilidad</h2>
          <p className="text-sm leading-relaxed">
            El Sencillo se proporciona &quot;tal cual&quot; sin garantías de precisión financiera. Las conversiones de moneda dependen
            de tasas de terceros y deben usarse solo como referencia.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">5. Contacto</h2>
          <p className="text-sm leading-relaxed">
            Para consultas sobre estos términos, escriba a{' '}
            <a href="mailto:soporte@elsencillo.com" className="text-primary-600 dark:text-primary-400 hover:underline">
              soporte@elsencillo.com
            </a>.
          </p>
        </section>
      </div>
    </div>
  )
}
