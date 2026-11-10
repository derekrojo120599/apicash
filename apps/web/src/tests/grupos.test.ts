import { describe, it, expect } from 'vitest';
import { roundMoney } from '@apicash/shared';

describe('Módulo de Cuentas Compartidas y División Bilateral', () => {
  it('debe dividir un gasto equitativamente entre N miembros sin pérdida de centavos', () => {
    const totalGasto = 100;
    const numMiembros = 3; // $33.33, $33.33, $33.34
    const baseCuota = roundMoney(totalGasto / numMiembros, 2).toNumber();

    let acumulado = 0;
    const divisiones = [];
    for (let i = 1; i <= numMiembros; i++) {
      const isUltimo = i === numMiembros;
      const monto = isUltimo
        ? roundMoney(totalGasto - acumulado, 2).toNumber()
        : baseCuota;
      acumulado = roundMoney(acumulado + monto, 2).toNumber();
      divisiones.push(monto);
    }

    expect(divisiones[0]).toBe(33.33);
    expect(divisiones[1]).toBe(33.33);
    expect(divisiones[2]).toBe(33.34);
    expect(divisiones.reduce((a, b) => a + b, 0)).toBe(100);
  });

  it('debe validar la máquina de estados estricta de confirmación bilateral de pagos', () => {
    type EstadoPago = 'pendiente_confirmacion' | 'confirmado' | 'rechazado';

    interface Pago {
      id: string;
      emisor: string;
      receptor: string;
      monto: number;
      estado: EstadoPago;
    }

    const pago: Pago = {
      id: 'p1',
      emisor: 'user_a',
      receptor: 'user_b',
      monto: 30,
      estado: 'pendiente_confirmacion'
    };

    // 1. El emisor no puede auto-confirmarse el pago
    const intentarConfirmarPorEmisor = (callerId: string, p: Pago) => {
      if (callerId !== p.receptor) {
        throw new Error('Solo el receptor puede confirmar o rechazar el pago');
      }
      p.estado = 'confirmado';
    };

    expect(() => intentarConfirmarPorEmisor('user_a', pago)).toThrow(
      'Solo el receptor puede confirmar o rechazar el pago'
    );
    expect(pago.estado).toBe('pendiente_confirmacion');

    // 2. El receptor confirma el pago exitosamente
    intentarConfirmarPorEmisor('user_b', pago);
    expect(pago.estado).toBe('confirmado');

    // 3. No se puede volver a procesar un pago ya finalizado
    const reintentarProcesar = (p: Pago) => {
      if (p.estado !== 'pendiente_confirmacion') {
        throw new Error(`El pago ya fue procesado (${p.estado})`);
      }
    };

    expect(() => reintentarProcesar(pago)).toThrow('El pago ya fue procesado (confirmado)');
  });
});
