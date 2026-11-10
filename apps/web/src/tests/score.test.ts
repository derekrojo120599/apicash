import { describe, it, expect } from 'vitest';
import {
  evaluarPresupuestoArquetipo,
  calcularScoreFinanciero,
} from '@apicash/shared';

describe('Integración Web de Score y Arquetipos Financieros', () => {
  it('calcula correctamente el arquetipo 70/20/10 en el entorno web', () => {
    const res = evaluarPresupuestoArquetipo('venezuela_realista_70_20_10', 800, 400, 100);
    expect(res.limiteNecesidadesUSD).toBe(560);
    expect(res.limiteDeseosUSD).toBe(160);
    expect(res.estadoNecesidades).toBe('EN_PLAN');
  });

  it('calcula el score financiero correctamente', () => {
    const score = calcularScoreFinanciero({
      porcentajePresupuestoUsado: 70,
      cuotasVencidasPendientes: 0,
      cuotasAlDiaPagadas: 2,
      tieneMetaAhorroActiva: true,
      saldoAhorroUSD: 250,
      tieneCuentaUSD: true,
      tieneCuentaVES: true,
    });
    expect(score.score).toBeGreaterThan(600);
    expect(score.nivel).toBeDefined();
  });
});
