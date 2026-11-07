'use client';

import { createContext, useContext, useState, useCallback } from 'react';
import { Toast } from './Toast';

export type ToastVariant = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  title?: string;
  message: string;
  variant: ToastVariant;
  duration: number;
}

export interface ToastOptions {
  title?: string;
  message: string;
  variant?: ToastVariant;
  duration?: number;
}

export interface ToastContextValue {
  addToast: (options: ToastOptions) => string;
  dismissToast: (id: string) => void;
  toasts: ToastItem[];
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToastContext(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

type InternalToastItem = ToastItem & { exiting?: boolean };

const MAX_TOASTS = 5;

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

interface ToastProviderProps {
  children: React.ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<InternalToastItem[]>([]);

  const addToast = useCallback((options: ToastOptions): string => {
    const id = generateId();
    const newToast: InternalToastItem = {
      id,
      title: options.title,
      message: options.message,
      variant: options.variant ?? 'info',
      duration: options.duration ?? 5000,
    };

    setToasts((current) => {
      const next = [...current];
      if (next.length >= MAX_TOASTS) {
        const oldest = next[0];
        next[0] = { ...oldest, exiting: true };
      }
      next.push(newToast);
      return next;
    });

    return id;
  }, []);

  const dismissToast = useCallback((id: string): void => {
    setToasts((current) =>
      current.map((toast) => (toast.id === id ? { ...toast, exiting: true } : toast))
    );
  }, []);

  const removeToast = useCallback((id: string): void => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const publicToasts: ToastItem[] = toasts;

  return (
    <ToastContext.Provider value={{ addToast, dismissToast, toasts: publicToasts }}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="fixed bottom-4 right-4 left-4 z-50 flex flex-col gap-2 sm:left-auto sm:max-w-sm"
      >
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            id={toast.id}
            title={toast.title}
            message={toast.message}
            variant={toast.variant}
            duration={toast.duration}
            exiting={toast.exiting ?? false}
            onRemove={removeToast}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
