'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { signup } from '../actions'
import { ApicashLogo } from '@/components/ApicashLogo'
import { Loader2, Sparkles } from 'lucide-react'
import { activateDemoMode } from '@/lib/demoData'
import { useQueryClient } from '@tanstack/react-query'

export const dynamic = 'force-dynamic';

const initialState = { error: '' }

export default function RegisterPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [isEnteringDemo, setIsEnteringDemo] = useState(false)

  const [state, formAction, isPending] = useActionState(async (_prevState: unknown, formData: FormData) => {
    const result = await signup(formData)
    if (result?.error) {
      return { error: result.error }
    }
    return { error: '' }
  }, initialState)

  const handleEnterDemo = () => {
    setIsEnteringDemo(true)
    activateDemoMode()
    queryClient.clear()
    router.push('/')
    router.refresh()
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-950 transition-colors">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-8 space-y-6 border border-slate-200 dark:border-slate-800 transition-colors">
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="bg-primary-100 dark:bg-primary-900/30 p-3 rounded-full mb-2">
            <ApicashLogo className="w-8 h-8 text-primary-600 dark:text-primary-400" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Crear cuenta</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Comience a tomar el control total de sus finanzas</p>
        </div>

        <form action={formAction} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="nombre" className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Nombre completo
            </label>
            <input
              id="nombre"
              name="nombre"
              type="text"
              required
              placeholder="Juan Pérez"
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-transparent text-slate-900 dark:text-slate-100 transition-colors"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="email" className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Correo electrónico
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              placeholder="tu@email.com"
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-transparent text-slate-900 dark:text-slate-100 transition-colors"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="password" className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              placeholder="••••••••"
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-transparent text-slate-900 dark:text-slate-100 transition-colors"
            />
          </div>

          {state?.error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg border border-red-100 dark:border-red-900/50 transition-colors">
              {state.error}
            </div>
          )}

          <button
            type="submit"
            disabled={isPending || isEnteringDemo}
            className="w-full bg-primary-600 text-white font-medium py-2.5 rounded-lg hover:bg-primary-700 focus:ring-4 focus:ring-primary-500/20 transition-all disabled:opacity-70 flex justify-center items-center"
          >
            {isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              'Crear cuenta'
            )}
          </button>
        </form>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200 dark:border-slate-800" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white dark:bg-slate-900 px-2 text-slate-400">O pruébalo sin registrarte</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleEnterDemo}
          disabled={isEnteringDemo || isPending}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 dark:text-amber-200 font-semibold transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 disabled:opacity-70"
        >
          {isEnteringDemo ? (
            <Loader2 className="w-4 h-4 animate-spin text-amber-600 dark:text-amber-400" />
          ) : (
            <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400 animate-pulse" />
          )}
          <span>Probar versión Demo</span>
        </button>

        <p className="text-center text-sm text-slate-600 dark:text-slate-400">
          ¿Ya tiene una cuenta?{' '}
          <Link href="/login" className="text-primary-600 dark:text-primary-400 font-medium hover:underline">
            Iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  )
}
