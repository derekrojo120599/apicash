import { describe, it, expect } from 'vitest';
import { roundMoney, formatMoney } from './money';
import { previewComision, ComisionConfig } from './comisiones';
import { Decimal } from 'decimal.js';

describe('money.ts - PostgreSQL ROUND(..., 2) parity', () => {
  it('rounds half-up properly (e.g. 0.005 -> 0.01)', () => {
    expect(formatMoney('0.005')).toBe('0.01');
    expect(formatMoney('0.004')).toBe('0.00');
    expect(formatMoney('14.025')).toBe('14.03');
    expect(formatMoney('14.024')).toBe('14.02');
  });

  it('handles regular values', () => {
    expect(formatMoney(4675)).toBe('4675.00');
    expect(formatMoney('4675.1234')).toBe('4675.12');
  });

  it('returns a Decimal instance from roundMoney', () => {
    const val = roundMoney('14.025');
    expect(val).toBeInstanceOf(Decimal);
    expect(val.toFixed(2)).toBe('14.03');
  });
});

describe('comisiones.ts - Visual preview logic', () => {
  // Configuración base de prueba (basada en 'pm_p2p' por ejemplo, o una que tenga 0.3% y mín 14.00)
  // Según los pgTAP fixed cases:
  // 4675 * 0.3% = 14.025 -> 14.03
  // 10 * 0.3% = 0.03 -> min 14.00
  // Fallida 100000 -> 14.00
  const defaultConfig: ComisionConfig = {
    subtipo_operacion: 'pm_p2p',
    porcentaje: '0.003', // 0.3%
    minimo_ves: '14.00',
    maximo_ves: null,
    permite_override: false,
    aplica_a_fallidas: true,
  };

  it('calcula la comisión con el monto superando el mínimo (4675 -> 14.03)', () => {
    const result = previewComision(4675, defaultConfig);
    expect(result.comisionCalculada).toBe('14.03'); // 4675 * 0.003 = 14.025 -> redondeado a 14.03
    expect(result.comisionFinal).toBe('14.03');
    expect(result.topeCalculado).toBe('14.03');
  });

  it('calcula la comisión aplicando el mínimo cuando es menor (10 -> 14.00)', () => {
    const result = previewComision(10, defaultConfig);
    expect(result.comisionCalculada).toBe('0.03'); // 10 * 0.003 = 0.03
    expect(result.comisionFinal).toBe('14.00'); // Mínimo aplicado
    expect(result.topeCalculado).toBe('14.00');
  });

  it('aplica solo el mínimo a las operaciones fallidas (fallida 100000 -> 14.00)', () => {
    const result = previewComision(100000, defaultConfig, true);
    expect(result.comisionCalculada).toBe('0.00'); // En fallidas no se calcula porcentaje
    expect(result.comisionFinal).toBe('14.00');
    expect(result.topeCalculado).toBe('14.00');
  });

  it('ignora fallidas si la config no aplica a fallidas', () => {
    const noFallidasConfig = { ...defaultConfig, aplica_a_fallidas: false };
    const result = previewComision(100000, noFallidasConfig, true);
    expect(result.comisionFinal).toBe('0.00');
  });

  it('respeta maximo_ves si está configurado', () => {
    const configConTope = { ...defaultConfig, maximo_ves: '20.00' };
    const result = previewComision(10000, configConTope);
    // 10000 * 0.003 = 30.00 -> tope 20.00
    expect(result.comisionCalculada).toBe('30.00');
    expect(result.comisionFinal).toBe('20.00');
    expect(result.topeCalculado).toBe('20.00');
  });

  it('rechaza overrides si no está permitido', () => {
    expect(() => previewComision(4675, defaultConfig, false, 10)).toThrow(/no permite override/);
  });

  it('permite override válido y lo respeta', () => {
    const configConOverride = { ...defaultConfig, permite_override: true, maximo_ves: '20.00' };
    const result = previewComision(10000, configConOverride, false, 15);
    expect(result.comisionFinal).toBe('15.00');
  });
});
