'use client';

import { FadeIn } from '@/components/animations';

export const dynamic = 'force-dynamic';

export default function PerfilPage() {
  return (
    <div className="p-8">
      <FadeIn as="header">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Perfil</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2">En construcción...</p>
      </FadeIn>
    </div>
  )
}