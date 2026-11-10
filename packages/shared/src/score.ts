/**
 * Modelo y motor de Arquetipos de Presupuesto y Score Financiero (ChekScore)
 * Inspirado en benchmarks financieros para economías bimoneda (USD / VES)
 */

export type ArquetipoPresupuestoId =
  | 'equilibrado_50_30_20'
  | 'venezuela_realista_70_20_10'
  | 'ahorrador_agresivo_40_20_40'
  | 'inversionista_30_30_40';

export interface ArquetipoPresupuesto {
  id: ArquetipoPresupuestoId;
  nombre: string;
  descripcion: string;
  pctNecesidades: number; // Ej: 50
  pctDeseos: number;      // Ej: 30
  pctAhorro: number;      // Ej: 20
  recomendadoPara: string;
}

export const ARQUETIPOS_PRESUPUESTO: ArquetipoPresupuesto[] = [
  {
    id: 'venezuela_realista_70_20_10',
    nombre: 'Realista Venezolano (70/20/10)',
    descripcion: 'Prioriza alimentación, servicios, transporte y salud. Recomendado para alto costo de vida.',
    pctNecesidades: 70,
    pctDeseos: 20,
    pctAhorro: 10,
    recomendadoPara: 'Familias y profesionales que buscan estabilidad cubriendo lo esencial.',
  },
  {
    id: 'equilibrado_50_30_20',
    nombre: 'Clásico Equilibrado (50/30/20)',
    descripcion: 'Regla de oro estándar: 50% necesidades básicas, 30% estilo de vida y 20% ahorro.',
    pctNecesidades: 50,
    pctDeseos: 30,
    pctAhorro: 20,
    recomendadoPara: 'Ingresos regulares y previsibles con fondo de emergencia ya iniciado.',
  },
  {
    id: 'ahorrador_agresivo_40_20_40',
    nombre: 'Ahorrador Fuerte (40/20/40)',
    descripcion: 'Enfocado en construcción rápida de patrimonio o metas a corto plazo (comprar vehículo, casa o viaje).',
    pctNecesidades: 40,
    pctDeseos: 20,
    pctAhorro: 40,
    recomendadoPara: 'Personas con bajos gastos fijos o ingresos extraordinarios temporales.',
  },
  {
    id: 'inversionista_30_30_40',
    nombre: 'El Visionario (30/30/40)',
    descripcion: 'Diversificación activa y generación de capital libre para reinversión.',
    pctNecesidades: 30,
    pctDeseos: 30,
    pctAhorro: 40,
    recomendadoPara: 'Emprendedores y personas con múltiples fuentes de ingresos.',
  },
];

export interface CalculoPresupuestoArquetipo {
  arquetipo: ArquetipoPresupuesto;
  ingresoTotalUSD: number;
  limiteNecesidadesUSD: number;
  limiteDeseosUSD: number;
  metaAhorroUSD: number;
  gastadoNecesidadesUSD: number;
  gastadoDeseosUSD: number;
  estadoNecesidades: 'EN_PLAN' | 'EN_RIESGO' | 'EXCEDIDO';
  estadoDeseos: 'EN_PLAN' | 'EN_RIESGO' | 'EXCEDIDO';
  porcentajeUsadoTotal: number;
}

export function evaluarPresupuestoArquetipo(
  arquetipoId: ArquetipoPresupuestoId,
  ingresoTotalUSD: number,
  gastadoNecesidadesUSD: number,
  gastadoDeseosUSD: number
): CalculoPresupuestoArquetipo {
  const arquetipo =
    ARQUETIPOS_PRESUPUESTO.find((a) => a.id === arquetipoId) ||
    ARQUETIPOS_PRESUPUESTO[0];

  const limiteNecesidadesUSD = (ingresoTotalUSD * arquetipo.pctNecesidades) / 100;
  const limiteDeseosUSD = (ingresoTotalUSD * arquetipo.pctDeseos) / 100;
  const metaAhorroUSD = (ingresoTotalUSD * arquetipo.pctAhorro) / 100;

  function obtenerEstado(gastado: number, limite: number): 'EN_PLAN' | 'EN_RIESGO' | 'EXCEDIDO' {
    if (limite <= 0) return gastado > 0 ? 'EXCEDIDO' : 'EN_PLAN';
    const ratio = gastado / limite;
    if (ratio > 1.0) return 'EXCEDIDO';
    if (ratio >= 0.85) return 'EN_RIESGO';
    return 'EN_PLAN';
  }

  const gastoTotal = gastadoNecesidadesUSD + gastadoDeseosUSD;
  const totalPresupuestado = limiteNecesidadesUSD + limiteDeseosUSD;
  const porcentajeUsadoTotal =
    totalPresupuestado > 0 ? Math.min(200, (gastoTotal / totalPresupuestado) * 100) : 0;

  return {
    arquetipo,
    ingresoTotalUSD,
    limiteNecesidadesUSD,
    limiteDeseosUSD,
    metaAhorroUSD,
    gastadoNecesidadesUSD,
    gastadoDeseosUSD,
    estadoNecesidades: obtenerEstado(gastadoNecesidadesUSD, limiteNecesidadesUSD),
    estadoDeseos: obtenerEstado(gastadoDeseosUSD, limiteDeseosUSD),
    porcentajeUsadoTotal: Number(porcentajeUsadoTotal.toFixed(1)),
  };
}

/**
 * Score Financiero del Usuario (0 a 1000 puntos)
 * Evalúa 4 pilares:
 * 1. Control de presupuesto (hasta 300 pts)
 * 2. Cumplimiento de cuotas y deudas a tiempo (hasta 300 pts)
 * 3. Hábito de ahorro (hasta 250 pts)
 * 4. Diversificación de cuentas USD/VES (hasta 150 pts)
 */
export interface ParametrosScore {
  porcentajePresupuestoUsado: number; // Ej: 75%
  cuotasVencidasPendientes: number;   // Cuotas retrasadas
  cuotasAlDiaPagadas: number;         // Cuotas pagadas a tiempo
  tieneMetaAhorroActiva: boolean;
  saldoAhorroUSD: number;
  tieneCuentaUSD: boolean;
  tieneCuentaVES: boolean;
}

export interface ResultadoScoreFinanciero {
  score: number; // 0..1000
  nivel: 'Excelente' | 'Bueno' | 'Regular' | 'Crítico';
  color: string;
  puntosPresupuesto: number;
  puntosCredito: number;
  puntosAhorro: number;
  puntosDiversificacion: number;
  consejos: string[];
}

export function calcularScoreFinanciero(params: ParametrosScore): ResultadoScoreFinanciero {
  const consejos: string[] = [];

  // 1. Presupuesto (300 pts máx)
  let puntosPresupuesto = 0;
  if (params.porcentajePresupuestoUsado <= 85) {
    puntosPresupuesto = 300;
  } else if (params.porcentajePresupuestoUsado <= 100) {
    puntosPresupuesto = 220;
    consejos.push('Estás cerca del tope de tu presupuesto mensual. Monitorea gastos hormiga.');
  } else {
    puntosPresupuesto = Math.max(50, 300 - Math.round((params.porcentajePresupuestoUsado - 100) * 4));
    consejos.push('Has excedido tu presupuesto mensual. Reduce gastos no esenciales.');
  }

  // 2. Crédito y Cuotas (300 pts máx)
  let puntosCredito = 200; // Base neutra si no tiene créditos
  if (params.cuotasVencidasPendientes > 0) {
    puntosCredito = Math.max(30, 200 - params.cuotasVencidasPendientes * 80);
    consejos.push(`Tienes ${params.cuotasVencidasPendientes} cuota(s) vencida(s). Regularízalas para proteger tu score.`);
  } else if (params.cuotasAlDiaPagadas > 0) {
    puntosCredito = Math.min(300, 220 + params.cuotasAlDiaPagadas * 20);
  }

  // 3. Ahorro (250 pts máx)
  let puntosAhorro = 50;
  if (params.tieneMetaAhorroActiva) puntosAhorro += 50;
  if (params.saldoAhorroUSD >= 500) {
    puntosAhorro += 150;
  } else if (params.saldoAhorroUSD >= 100) {
    puntosAhorro += 80;
  } else if (params.saldoAhorroUSD > 0) {
    puntosAhorro += 40;
    consejos.push('Comienza a crear un fondo de emergencia equivalente a 1 o 2 meses de gastos.');
  } else {
    consejos.push('No tienes saldo en metas de ahorro. Te recomendamos destinar al menos el 10% de tus ingresos.');
  }

  // 4. Diversificación bimoneda (150 pts máx)
  let puntosDiversificacion = 50;
  if (params.tieneCuentaUSD && params.tieneCuentaVES) {
    puntosDiversificacion = 150;
  } else if (params.tieneCuentaUSD || params.tieneCuentaVES) {
    puntosDiversificacion = 90;
    consejos.push('Manejar cuentas tanto en USD como en VES te permite protegerte contra la devaluación.');
  }

  const score = Math.min(1000, Math.max(100, puntosPresupuesto + puntosCredito + puntosAhorro + puntosDiversificacion));

  let nivel: 'Excelente' | 'Bueno' | 'Regular' | 'Crítico' = 'Regular';
  let color = '#f59e0b'; // Amarillo amber

  if (score >= 800) {
    nivel = 'Excelente';
    color = '#10b981'; // Emerald
  } else if (score >= 650) {
    nivel = 'Bueno';
    color = '#06b6d4'; // Cyan
  } else if (score >= 450) {
    nivel = 'Regular';
    color = '#f59e0b';
  } else {
    nivel = 'Crítico';
    color = '#ef4444'; // Red
  }

  return {
    score,
    nivel,
    color,
    puntosPresupuesto,
    puntosCredito,
    puntosAhorro,
    puntosDiversificacion,
    consejos: consejos.slice(0, 3),
  };
}
