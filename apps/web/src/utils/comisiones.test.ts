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

describe('comisiones.ts - Visual preview logic and BCV tariff compliance', () => {
  const p2pConfig: ComisionConfig = {
    subtipo_operacion: 'pm_p2p',
    porcentaje: '0.003', // 0.3%
    minimo_ves: '14.00',
    maximo_ves: null,
    permite_override: false,
    aplica_a_fallidas: true,
    asume_usuario: true,
  };

  const p2cConfig: ComisionConfig = {
    subtipo_operacion: 'pm_p2c',
    porcentaje: '0.015', // 1.5%
    minimo_ves: '14.00',
    maximo_ves: null,
    permite_override: true,
    aplica_a_fallidas: true,
    asume_usuario: false, // La asume el comercio
  };

  const c2pInterConfig: ComisionConfig = {
    subtipo_operacion: 'pm_c2p_interbancario',
    porcentaje: '0.020', // 2.0%
    minimo_ves: '14.00',
    maximo_ves: null,
    permite_override: true,
    aplica_a_fallidas: true,
    asume_usuario: false, // La asume el comercio
  };

  const transferenciaMismoBancoConfig: ComisionConfig = {
    subtipo_operacion: 'transferencia_mismo_banco',
    porcentaje: '0.000',
    minimo_ves: '0.00',
    maximo_ves: '54.00',
    permite_override: true,
    aplica_a_fallidas: false,
    asume_usuario: true,
  };

  it('P2P calcula comisión con el monto superando el mínimo (4675 -> 14.03)', () => {
    const result = previewComision(4675, p2pConfig);
    expect(result.comisionCalculada).toBe('14.03');
    expect(result.comisionFinal).toBe('14.03');
    expect(result.topeCalculado).toBe('14.03');
  });

  it('P2P aplica el mínimo de Bs. 14 en montos pequeños (10 -> 14.00)', () => {
    const result = previewComision(10, p2pConfig);
    expect(result.comisionCalculada).toBe('0.03');
    expect(result.comisionFinal).toBe('14.00'); // Mínimo aplicado
    expect(result.topeCalculado).toBe('14.00');
  });

  it('P2C por defecto NO cobra comisión al usuario (asume_usuario = false -> comisionFinal = 0.00)', () => {
    const result = previewComision(1000, p2cConfig);
    expect(result.comisionCalculada).toBe('0.00');
    expect(result.comisionFinal).toBe('0.00');
    expect(result.topeCalculado).toBe('0.00');
  });

  it('C2P por defecto NO cobra comisión al usuario (asume_usuario = false -> comisionFinal = 0.00)', () => {
    const result = previewComision(1000, c2pInterConfig);
    expect(result.comisionCalculada).toBe('0.00');
    expect(result.comisionFinal).toBe('0.00');
    expect(result.topeCalculado).toBe('0.00');
  });

  it('P2C con toggle activado (asumirComisionComercio = true) calcula y debita la comisión (1000 * 1.5% = 15.00)', () => {
    const result = previewComision(1000, p2cConfig, false, null, true);
    expect(result.comisionCalculada).toBe('15.00');
    expect(result.comisionFinal).toBe('15.00');
  });

  it('P2C con toggle activado respeta el mínimo de Bs. 14 en montos bajos (100 * 1.5% = 1.50 -> 14.00)', () => {
    const result = previewComision(100, p2cConfig, false, null, true);
    expect(result.comisionCalculada).toBe('1.50');
    expect(result.comisionFinal).toBe('14.00'); // Mínimo legal
  });

  it('Toggle activado sobre un subtipo que ya asume el usuario (P2P) no duplica ni altera el cálculo', () => {
    const resultNormal = previewComision(4675, p2pConfig, false, null, false);
    const resultConToggle = previewComision(4675, p2pConfig, false, null, true);
    expect(resultConToggle.comisionFinal).toBe(resultNormal.comisionFinal);
    expect(resultConToggle.comisionFinal).toBe('14.03');
  });

  it('Operación fallida cobra exactamente Bs. 14.00 sin importar el monto', () => {
    const resultChica = previewComision(500, p2pConfig, true);
    expect(resultChica.comisionFinal).toBe('14.00');

    const resultGrande = previewComision(100000, p2pConfig, true);
    expect(resultGrande.comisionCalculada).toBe('0.00');
    expect(resultGrande.comisionFinal).toBe('14.00');
  });

  it('Transferencia mismo banco es Bs. 0.00 por defecto', () => {
    const result = previewComision(10000, transferenciaMismoBancoConfig);
    expect(result.comisionFinal).toBe('0.00');
    expect(result.topeCalculado).toBe('54.00'); // El tope para override es 54.00
  });

  it('Transferencia mismo banco acepta override válido de Bs. 30.00', () => {
    const result = previewComision(10000, transferenciaMismoBancoConfig, false, 30);
    expect(result.comisionFinal).toBe('30.00');
  });

  it('Transferencia mismo banco rechaza override mayor a Bs. 54.00 (ej. 60.00)', () => {
    expect(() =>
      previewComision(10000, transferenciaMismoBancoConfig, false, 60)
    ).toThrow(/fuera del rango permitido/);
  });

  it('rechaza overrides si no está permitido (ej. P2P)', () => {
    expect(() => previewComision(4675, p2pConfig, false, 10)).toThrow(/no permite override/);
  });
});
