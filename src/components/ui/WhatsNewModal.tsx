'use client';

import { useState, useEffect } from 'react';
import { X, Sparkles, Zap, Calculator, Layers, Gauge, ArrowRight } from 'lucide-react';
import { animate } from 'animejs';
import Link from 'next/link';

interface WhatsNewItem {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  badge?: string;
  link?: string;
  color: string;
}

const whatsNewItems: WhatsNewItem[] = [
  {
    icon: Gauge,
    title: 'Carga instantánea y rendimiento optimizado',
    description: 'Se eliminaron cuellos de botella de red en el inicio. La aplicación ahora responde de inmediato al abrir.',
    badge: 'Rendimiento',
    color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
  },
  {
    icon: Zap,
    title: 'Nuevo movimiento directo en el Dashboard',
    description: 'Ahora puede registrar gastos, ingresos o traspasos con un solo clic sin salir de la pantalla principal.',
    badge: 'Flujo rápido',
    color: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
  },
  {
    icon: Calculator,
    title: 'Nueva sección de Calculadora de Divisas',
    description: 'Consulte conversiones instantáneas entre dólares (USD) y bolívares (VES) usando las tasas oficiales registradas o tasas personalizadas.',
    badge: 'Nuevo módulo',
    link: '/calculadora',
    color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
  },
  {
    icon: Layers,
    title: 'Categorías reorganizadas con buscador',
    description: 'Nuevas pestañas para alternar entre Gastos e Ingresos con contadores en tiempo real y buscador instantáneo.',
    badge: 'Organización',
    link: '/categorias',
    color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400'
  }
];

export function WhatsNewModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Storage key and expiration calculation (1 week = 7 days)
    const STORAGE_KEY = 'apicash_whats_new_v1';
    const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

    const storedData = localStorage.getItem(STORAGE_KEY);

    if (storedData) {
      try {
        const parsed = JSON.parse(storedData);
        // Do not display if already dismissed within the last week
        if (parsed.dismissed && Date.now() - parsed.timestamp < ONE_WEEK_MS) {
          return;
        }
      } catch {
        // Continue on corrupted data
      }
    }

    // Display modal if not seen this week
    const timer = setTimeout(() => {
      setIsOpen(true);
      requestAnimationFrame(() => {
        animate('.whats-new-overlay', {
          opacity: [0, 1],
          duration: 300,
          ease: 'outQuad'
        });
        animate('.whats-new-content', {
          scale: [0.92, 1],
          opacity: [0, 1],
          translateY: [16, 0],
          duration: 400,
          ease: 'outCubic'
        });
      });
    }, 120);

    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    const STORAGE_KEY = 'apicash_whats_new_v1';
    
    // Store timestamp to prevent showing for 7 days
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      dismissed: true,
      timestamp: Date.now()
    }));

    animate('.whats-new-overlay', {
      opacity: 0,
      duration: 200,
      ease: 'inQuad'
    });

    animate('.whats-new-content', {
      scale: 0.95,
      opacity: 0,
      translateY: 8,
      duration: 250,
      ease: 'inCubic',
      onComplete: () => {
        setIsOpen(false);
      }
    });
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 whats-new-overlay opacity-0 bg-slate-950/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="whats-new-title"
    >
      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 md:p-7 whats-new-content opacity-0 max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-xl">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">
                Novedades del sistema
              </span>
              <h2 id="whats-new-title" className="text-xl font-bold text-slate-900 dark:text-white">
                Mejoras recientes en El Sencillo
              </h2>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Cerrar ventana de novedades"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feature list */}
        <div className="py-4 space-y-3.5 overflow-y-auto no-scrollbar flex-1 my-2">
          {whatsNewItems.map((item, idx) => (
            <div 
              key={idx}
              className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80 flex items-start gap-3.5 transition-all hover:border-slate-200 dark:hover:border-slate-700"
            >
              <div className={`p-2 rounded-xl shrink-0 ${item.color}`}>
                <item.icon className="w-5 h-5" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
                    {item.title}
                  </h3>
                  {item.badge && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-200/80 dark:bg-slate-700/80 text-slate-700 dark:text-slate-300 shrink-0">
                      {item.badge}
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {item.description}
                </p>

                {item.link && (
                  <Link
                    href={item.link}
                    onClick={handleClose}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline mt-2"
                  >
                    <span>Explorar módulo</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer and action button */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
          <p className="text-[11px] text-slate-400">
            Este aviso no volverá a mostrarse durante los próximos 7 días.
          </p>

          <button
            onClick={handleClose}
            className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-semibold transition-colors shrink-0 shadow-sm"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
