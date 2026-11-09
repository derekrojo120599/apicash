'use client'

import { useState } from 'react'
import Link from 'next/link'
import { forgotPassword } from '../actions'
import { ApicashLogo } from '@/components/ApicashLogo'
import { Loader2, ArrowLeft, MailCheck } from 'lucide-react'

export const dynamic = 'force-dynamic';

export default function RecuperarPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return

    setLoading(true)
    setError('')

    const formData = new FormData()
    formData.append('email', email)

    const origin = typeof window !== 'undefined' ? window.location.origin : undefined
    const res = await forgotPassword(formData, origin)

    setLoading(false)
    if (res?.error) {
      setError(res.error)
    } else {
      setSent(true)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-950 transition-colors">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-8 space-y-6 border border-slate-200 dark:border-slate-800 transition-colors">
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="bg-primary-100 dark:bg-primary-900/30 p-3 rounded-full mb-2">
            <ApicashLogo className="w-8 h-8 text-primary-600 dark:text-primary-400" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Recuperar contraseña
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.
          </p>
        </div>

        {sent ? (
          <div className="space-y-6 text-center">
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 flex flex-col items-center space-y-2">
              <MailCheck className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
              <p className="text-sm font-medium text-emerald-900 dark:text-emerald-200">
                ¡Correo de recuperación enviado!
              </p>
              <p className="text-xs text-emerald-700 dark:text-emerald-400">
                Hemos enviado las instrucciones a <strong>{email}</strong>. Revisa tu bandeja de entrada o la carpeta de spam.
              </p>
            </div>

            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver al inicio de sesión
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="email" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Correo electrónico
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-transparent text-slate-900 dark:text-slate-100 transition-colors"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg border border-red-100 dark:border-red-900/50 transition-colors">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-600 text-white font-medium py-2.5 rounded-lg hover:bg-primary-700 focus:ring-4 focus:ring-primary-500/20 transition-all disabled:opacity-70 flex justify-center items-center"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'Enviar enlace de recuperación'
              )}
            </button>

            <div className="text-center pt-2">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Volver al inicio de sesión
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
