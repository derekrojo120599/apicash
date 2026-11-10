import { describe, it, expect } from 'vitest';
import {
  calcularBrechaCambiaria,
  analizarConvenienciaPago
} from '@apicash/shared';

describe('Módulo de Brecha Cambiaria e Inteligencia de Ahorro', () => {
  it('debe calcular correctamente el porcentaje y diferencia de brecha cambiaria', () => {
    // Caso real auditado en Chekea: BCV 899.27, Binance P2P 1050.00
    // Diferencia: 150.73, Brecha: (150.73 / 899.27) * 100 = 16.76% (+16.8%)
    const resultado = calcularBrechaCambiaria(899.27, 1050.0);

    expect(resultado.tasaOficial).toBe(899.27);
    expect(resultado.tasaParalelo).toBe(1050.0);
    expect(resultado.diferencia).toBe(150.73);
    expect(resultado.porcentajeBrecha).toBe(16.76);
  });

  it('debe manejar tasas cero o negativas sin dividir entre cero', () => {
    const res = calcularBrechaCambiaria(0, 1000);
    expect(res.porcentajeBrecha).toBe(0);
    expect(res.diferencia).toBe(0);
  });

  it('debe analizar la conveniencia de pagar en bolívares vs dólares efectivo', () => {
    // Si un producto cuesta $100 a tasa BCV (899.27 VES/$):
    // Costo en Bs: 89.927,00 Bs.
    // Si cambiás en P2P a 1050.00 VES/$, necesitas 89.927 / 1050 = $85.64.
    // Ahorro: $100 - $85.64 = $14.36 (14.36% de ahorro).
    const analisis = analizarConvenienciaPago(100, 899.27, 1050.0);

    expect(analisis.costoEnVesOficial).toBe(89927.0);
    expect(analisis.usdEquivalenteEnParalelo).toBe(85.64);
    expect(analisis.ahorroUsdSiPagaEnVes).toBe(14.36);
    expect(analisis.porcentajeAhorro).toBe(14.36);
    expect(analisis.recomendacion).toContain('Te conviene pagar en bolívares');
  });
});
