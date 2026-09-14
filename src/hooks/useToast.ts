import { useCallback } from 'react';
import {
  useToastContext,
  type ToastOptions,
  type ToastVariant,
} from '@/components/ui/ToastProvider';

export interface UseToastReturn {
  toast: (options: ToastOptions | string) => string;
  success: (options: ToastOptions | string) => string;
  error: (options: ToastOptions | string) => string;
  info: (options: ToastOptions | string) => string;
  warning: (options: ToastOptions | string) => string;
}

function normalizeOptions(options: ToastOptions | string, variant: ToastVariant): ToastOptions {
  if (typeof options === 'string') {
    return { message: options, variant };
  }
  return { ...options, variant };
}

export function useToast(): UseToastReturn {
  const { addToast } = useToastContext();

  const toast = useCallback(
    (options: ToastOptions | string): string => {
      const normalized = typeof options === 'string' ? { message: options } : options;
      return addToast(normalized);
    },
    [addToast]
  );

  const success = useCallback(
    (options: ToastOptions | string): string =>
      addToast(normalizeOptions(options, 'success')),
    [addToast]
  );

  const error = useCallback(
    (options: ToastOptions | string): string =>
      addToast(normalizeOptions(options, 'error')),
    [addToast]
  );

  const info = useCallback(
    (options: ToastOptions | string): string =>
      addToast(normalizeOptions(options, 'info')),
    [addToast]
  );

  const warning = useCallback(
    (options: ToastOptions | string): string =>
      addToast(normalizeOptions(options, 'warning')),
    [addToast]
  );

  return { toast, success, error, info, warning };
}
