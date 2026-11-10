import { describe, it, expect } from 'vitest';
import {
  generarCronogramaCuotas,
  calcularPagoMinimoTarjeta,
  calcularDisponibleTarjeta
} from '@apicash/shared';

describe('Módulo de Crédito y Financiamiento (tipo Cashea/Tarjetas)', () => {
  it('debe calcular cronograma exacto de cuotas con inicial y fechas periódicas', () => {
    const fechaCompra = '2026-11-09T00:00:00.000Z';
    const plan = generarCronogramaCuotas(100, 40, 3, fechaCompra, 14);

    expect(plan.montoTotal).toBe(100);
    expect(plan.montoInicial).toBe(40);
    expect(plan.saldoAFinanciar).toBe(60);
    expect(plan.cuotas).toHaveLength(3);

    expect(plan.cuotas[0].numeroCuota).toBe(1);
    expect(plan.cuotas[0].monto).toBe(20);
    expect(plan.cuotas[0].fechaVencimiento).toBe('2026-11-23');

    expect(plan.cuotas[1].numeroCuota).toBe(2);
    expect(plan.cuotas[1].monto).toBe(20);
    expect(plan.cuotas[1].fechaVencimiento).toBe('2026-12-07');

    expect(plan.cuotas[2].numeroCuota).toBe(3);
    expect(plan.cuotas[2].monto).toBe(20);
    expect(plan.cuotas[2].fechaVencimiento).toBe('2026-12-21');

    const sumaCuotas = plan.cuotas.reduce((acc, c) => acc + c.monto, 0);
    expect(sumaCuotas).toBe(plan.saldoAFinanciar);
  });

  it('debe ajustar la última cuota para evitar pérdida de centavos en divisiones inexactas', () => {
    const fechaCompra = '2026-11-09';
    // $100 / 3 = 33.3333333333...
    const plan = generarCronogramaCuotas(100, 0, 3, fechaCompra, 14);

    expect(plan.saldoAFinanciar).toBe(100);
    expect(plan.cuotas[0].monto).toBe(33.33);
    expect(plan.cuotas[1].monto).toBe(33.33);
    expect(plan.cuotas[2].monto).toBe(33.34);

    const suma = Number((plan.cuotas[0].monto + plan.cuotas[1].monto + plan.cuotas[2].monto).toFixed(2));
    expect(suma).toBe(100);
  });

  it('debe arrojar error si los montos o cuotas son inválidos', () => {
    expect(() => generarCronogramaCuotas(100, 100, 3, new Date())).toThrow(
      'El monto inicial no puede ser mayor o igual al total de la compra'
    );
    expect(() => generarCronogramaCuotas(100, 120, 3, new Date())).toThrow(
      'El monto inicial no puede ser mayor o igual al total de la compra'
    );
    expect(() => generarCronogramaCuotas(100, 0, 0, new Date())).toThrow(
      'El número de cuotas debe ser mayor a 0'
    );
    expect(() => generarCronogramaCuotas(-50, 0, 2, new Date())).toThrow(
      'El monto total debe ser positivo'
    );
  });

  it('debe calcular el pago mínimo y el disponible de una tarjeta de crédito', () => {
    // Caso auditado en Chekea: Bs. 150 de deuda a 5% de pago mínimo
    expect(calcularPagoMinimoTarjeta(150, 5)).toBe(7.5);
    expect(calcularPagoMinimoTarjeta(0, 5)).toBe(0);

    // Límite 500, deuda 150 -> Disponible 350
    expect(calcularDisponibleTarjeta(500, 150)).toBe(350);

    // Sobregiro: deuda 600 > límite 500 -> disponible 0 (nunca negativo)
    expect(calcularDisponibleTarjeta(500, 600)).toBe(0);
  });
});
