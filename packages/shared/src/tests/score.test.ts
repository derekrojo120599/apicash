import { describe, it, expect } from 'vitest';
import {
  evaluarPresupuestoArquetipo,
  calcularScoreFinanciero,
  ARQUETIPOS_PRESUPUESTO,
} from './score';

describe('Motor de Arquetipos de Presupuesto', () => {
  it('debe calcular los límites correctamente para el arquetipo 70/20/10', () => {
    const res = evaluarPresupuestoArquetipo('venezuela_realista_70_20_10', 1000, 500, 100);

    expect(res.limiteNecesidadesUSD).toBe(700);
    expect(res.limiteDeseosUSD).toBe(200);
    expect(res.metaAhorroUSD).toBe(100);
    expect(res.estadoNecesidades).toBe('EN_PLAN');
    expect(res.estadoDeseos).toBe('EN_PLAN');
  });

  it('debe alertar EXCEDIDO cuando se sobrepasa el límite', () => {
    const res = evaluarPresupuestoArquetipo('equilibrado_50_30_20', 1000, 600, 350);

    expect(res.limiteNecesidadesUSD).toBe(500);
    expect(res.estadoNecesidades).toBe('EXCEDIDO');
    expect(res.limiteDeseosUSD).toBe(300);
    expect(res.estadoDeseos).toBe('EXCEDIDO');
  });
});

describe('Motor de Score Financiero (ChekScore)', () => {
  it('debe otorgar puntuación alta cuando las finanzas están equilibradas y al día', () => {
    const scoreRes = calcularScoreFinanciero({
      porcentajePresupuestoUsado: 60,
      cuotasVencidasPendientes: 0,
      cuotasAlDiaPagadas: 4,
      tieneMetaAhorroActiva: true,
      saldoAhorroUSD: 600,
      tieneCuentaUSD: true,
      tieneCuentaVES: true,
    });

    expect(scoreRes.score).toBeGreaterThanOrEqual(800);
    expect(scoreRes.nivel).toBe('Excelente');
  });

  it('debe penalizar fuertemente cuotas vencidas y presupuesto excedido', () => {
    const scoreRes = calcularScoreFinanciero({
      porcentajePresupuestoUsado: 140,
      cuotasVencidasPendientes: 3,
      cuotasAlDiaPagadas: 0,
      tieneMetaAhorroActiva: false,
      saldoAhorroUSD: 0,
      tieneCuentaUSD: false,
      tieneCuentaVES: true,
    });

    expect(scoreRes.score).toBeLessThan(500);
    expect(scoreRes.nivel === 'Regular' || scoreRes.nivel === 'Crítico').toBe(true);
    expect(scoreRes.consejos.length).toBeGreaterThan(0);
  });
});
