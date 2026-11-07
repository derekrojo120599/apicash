'use client';

import { useRef, type MouseEvent, type ButtonHTMLAttributes } from 'react';
import { animate } from 'animejs';

interface AnimatedButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
}

export function AnimatedButton({
  children,
  variant = 'primary',
  className = '',
  onClick,
  ...props
}: AnimatedButtonProps) {
  const ref = useRef<HTMLButtonElement>(null);

  const baseStyles =
    'relative overflow-hidden inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900';

  const variantStyles = {
    primary:
      'bg-primary-600 text-white hover:bg-primary-700 dark:bg-primary-600 dark:hover:bg-primary-700',
    secondary:
      'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-200 dark:border-slate-800 dark:hover:bg-slate-800',
    ghost:
      'bg-transparent text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800',
  };

  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    if (!ref.current) return;

    animate(ref.current, {
      scale: [1, 0.95, 1],
      duration: 250,
      ease: 'outBack(1.7)',
    });

    onClick?.(e);
  };

  return (
    <button
      ref={ref}
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
      onClick={handleClick}
      {...props}
    >
      {children}
    </button>
  );
}
