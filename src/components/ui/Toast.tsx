'use client';

import { useEffect, useRef, useCallback } from 'react';
import { animate } from 'animejs';
import { X, CheckCircle2, XCircle, Info, AlertTriangle } from 'lucide-react';
import type { ToastVariant } from './ToastProvider';

interface ToastProps {
  id: string;
  title?: string;
  message: string;
  variant: ToastVariant;
  duration: number;
  exiting: boolean;
  onRemove: (id: string) => void;
}

const variantConfig: Record<
  ToastVariant,
  { icon: React.ElementType; containerClass: string; iconClass: string }
> = {
  success: {
    icon: CheckCircle2,
    containerClass:
      'bg-primary-50 text-primary-900 border-primary-200 dark:bg-primary-950 dark:text-primary-100 dark:border-primary-900',
    iconClass: 'text-primary-600 dark:text-primary-400',
  },
  error: {
    icon: XCircle,
    containerClass:
      'bg-rose-50 text-rose-900 border-rose-200 dark:bg-rose-950 dark:text-rose-100 dark:border-rose-900',
    iconClass: 'text-rose-600 dark:text-rose-400',
  },
  info: {
    icon: Info,
    containerClass:
      'bg-blue-50 text-blue-900 border-blue-200 dark:bg-blue-950 dark:text-blue-100 dark:border-blue-900',
    iconClass: 'text-blue-600 dark:text-blue-400',
  },
  warning: {
    icon: AlertTriangle,
    containerClass:
      'bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950 dark:text-amber-100 dark:border-amber-900',
    iconClass: 'text-amber-600 dark:text-amber-400',
  },
};

export function Toast({ id, title, message, variant, duration, exiting, onRemove }: ToastProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isExitingRef = useRef(false);

  const runExitAnimation = useCallback(() => {
    if (!ref.current || isExitingRef.current) return;
    isExitingRef.current = true;

    animate(ref.current, {
      opacity: 0,
      translateY: -16,
      duration: 250,
      ease: 'inCubic',
      onComplete: () => onRemove(id),
    });
  }, [id, onRemove]);

  useEffect(() => {
    if (exiting && !isExitingRef.current) {
      runExitAnimation();
    }
  }, [exiting, runExitAnimation]);

  useEffect(() => {
    if (!ref.current) return;

    const el = ref.current;
    el.style.opacity = '0';
    el.style.transform = 'translateY(16px)';

    const entryAnimation = animate(el, {
      opacity: 1,
      translateY: 0,
      duration: 350,
      ease: 'outCubic',
    });

    let timer: ReturnType<typeof setTimeout> | null = null;
    if (duration > 0) {
      timer = setTimeout(() => {
        runExitAnimation();
      }, duration);
    }

    return () => {
      entryAnimation.pause();
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [duration, runExitAnimation]);

  const handleClose = () => {
    runExitAnimation();
  };

  const config = variantConfig[variant];
  const Icon = config.icon;

  return (
    <div
      ref={ref}
      role={variant === 'error' ? 'alert' : 'status'}
      className={`pointer-events-auto flex w-full items-start gap-3 rounded-lg border p-4 shadow-lg ${config.containerClass}`}
    >
      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${config.iconClass}`} aria-hidden="true" />
      <div className="flex-1 text-sm">
        {title && <p className="font-semibold">{title}</p>}
        <p className={title ? 'text-sm opacity-90' : 'font-medium'}>{message}</p>
      </div>
      <button
        type="button"
        onClick={handleClose}
        className="shrink-0 rounded-md p-1 opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-current"
        aria-label="Cerrar notificación"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
