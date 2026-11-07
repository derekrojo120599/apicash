import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCuentas, useCrearCuenta } from '@/hooks/useCuentas';
import { useMetas, useAgregarAporte, useRetirarAhorro } from '@/hooks/useMetas';
import { useCrearTransaccion, useCrearTransferencia } from '@/hooks/useTransacciones';

// Mock de Supabase Client
const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
  rpc: vi.fn(),
};

vi.mock('@/utils/supabase/client', () => ({
  createClient: () => mockSupabase,
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'QueryClientTestWrapper';
  return Wrapper;
}

describe('Hooks de Integración de Datos (React Query + Supabase RPC)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useCuentas y useCrearCuenta', () => {
    it('debe obtener la lista de cuentas correctamente', async () => {
      const mockCuentas = [
        {
          id: 'cta-1',
          user_id: 'usr-1',
          nombre: 'Banesco USD',
          tipo: 'banco',
          moneda: 'USD',
          saldo_cache: 1500,
          activa: true,
          created_at: '2026-01-01T00:00:00Z',
        },
      ];

      const selectMock = vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: mockCuentas, error: null }),
      });

      mockSupabase.from.mockReturnValue({
        select: selectMock,
      });

      const { result } = renderHook(() => useCuentas(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockCuentas);
      expect(mockSupabase.from).toHaveBeenCalledWith('cuentas');
    });

    it('debe ejecutar la creación de cuenta con el usuario autenticado', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'usr-abc' } },
        error: null,
      });

      const nuevaCuenta = {
        nombre: 'Efectivo USD',
        tipo: 'efectivo' as const,
        moneda: 'USD' as const,
      };

      const insertMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'cta-nueva', user_id: 'usr-abc', ...nuevaCuenta, saldo_cache: 0, activa: true },
            error: null,
          }),
        }),
      });

      mockSupabase.from.mockReturnValue({ insert: insertMock });

      const { result } = renderHook(() => useCrearCuenta(), { wrapper: createWrapper() });

      await result.current.mutateAsync(nuevaCuenta);

      expect(mockSupabase.auth.getUser).toHaveBeenCalled();
      expect(insertMock).toHaveBeenCalledWith([
        expect.objectContaining({
          nombre: 'Efectivo USD',
          user_id: 'usr-abc',
        }),
      ]);
    });
  });

  describe('useMetas, aportes y retiros con RPC', () => {
    it('debe listar metas de ahorro', async () => {
      const mockMetas = [
        { id: 'meta-1', user_id: 'usr-1', nombre: 'Fondo Emergencia', monto_actual: 500, moneda: 'USD' },
      ];

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: mockMetas, error: null }),
        }),
      });

      const { result } = renderHook(() => useMetas(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockMetas);
    });

    it('debe llamar a la RPC registrar_aporte_meta al aportar fondos desde una cuenta', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'usr-123' } },
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { id: 'cat-ahorro' } }),
              }),
            }),
          }),
        }),
      });

      mockSupabase.rpc.mockResolvedValue({ data: null, error: null });

      const { result } = renderHook(() => useAgregarAporte(), { wrapper: createWrapper() });

      await result.current.mutateAsync({
        meta_id: 'meta-99',
        cuenta_id: 'cta-banesco',
        monto: 100,
        moneda_cuenta: 'USD',
        fecha: new Date('2026-10-12T12:00:00Z'),
      });

      expect(mockSupabase.rpc).toHaveBeenCalledWith('registrar_aporte_meta', {
        p_meta_id: 'meta-99',
        p_cuenta_id: 'cta-banesco',
        p_categoria_id: 'cat-ahorro',
        p_monto: 100,
        p_moneda_original: 'USD',
        p_fecha: expect.any(String),
      });
    });

    it('debe arrojar error específico si la RPC retirar_ahorro indica fondos insuficientes', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'usr-123' } },
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { id: 'cat-ahorro' } }),
              }),
            }),
          }),
        }),
      });

      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Fondos insuficientes en la meta de ahorro' },
      });

      const { result } = renderHook(() => useRetirarAhorro(), { wrapper: createWrapper() });

      await expect(
        result.current.mutateAsync({
          meta_id: 'meta-99',
          cuenta_id: 'cta-banesco',
          monto: 1000,
          moneda_cuenta: 'USD',
          fecha: new Date(),
        })
      ).rejects.toThrow('Fondos insuficientes en la meta');
    });
  });

  describe('useCrearTransferencia (Partida doble)', () => {
    it('debe invocar registrar_transferencia enviando cuentas de origen y destino', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'usr-transfer' } },
        error: null,
      });

      mockSupabase.rpc.mockResolvedValue({
        data: { id_salida: 'tx-1', id_entrada: 'tx-2' },
        error: null,
      });

      const { result } = renderHook(() => useCrearTransferencia(), { wrapper: createWrapper() });

      await result.current.mutateAsync({
        cuenta_origen_id: 'cta-bancaribe',
        cuenta_destino_id: 'cta-bdv',
        monto: 500,
        moneda: 'VES',
        descripcion: 'Traspaso para pagar servicios',
      });

      expect(mockSupabase.rpc).toHaveBeenCalledWith('registrar_transferencia', {
        p_cuenta_origen_id: 'cta-bancaribe',
        p_cuenta_destino_id: 'cta-bdv',
        p_monto: 500,
        p_moneda: 'VES',
        p_descripcion: 'Traspaso para pagar servicios',
        p_tasa_cambio: null,
        p_fecha: expect.any(String),
      });
    });
  });

  describe('useCrearTransaccion', () => {
    it('debe invocar registrar_operacion_con_comision cuando hay subtipo de comision bancaria', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'usr-tx' } },
        error: null,
      });

      mockSupabase.rpc.mockResolvedValue({
        data: { id_operacion: 'tx-op-1', id_comision: 'tx-com-1' },
        error: null,
      });

      const { result } = renderHook(() => useCrearTransaccion(), { wrapper: createWrapper() });

      await result.current.mutateAsync({
        cuenta_id: 'cta-bancaribe',
        tipo: 'gasto',
        monto_original: 100,
        moneda_original: 'VES',
        descripcion: 'Pago móvil al proveedor',
        subtipo_operacion: 'pm_p2p',
      });

      expect(mockSupabase.rpc).toHaveBeenCalledWith('registrar_operacion_con_comision', {
        p_cuenta_id: 'cta-bancaribe',
        p_categoria_principal_id: null,
        p_tipo: 'gasto',
        p_monto: 100,
        p_moneda: 'VES',
        p_descripcion: 'Pago móvil al proveedor',
        p_subtipo_operacion: 'pm_p2p',
        p_es_fallida: false,
        p_tasa_cambio: null,
        p_fecha: expect.any(String),
        p_override_comision: null,
      });
    });
  });
});
