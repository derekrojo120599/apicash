import { roundMoney } from './money';

export interface PlanCuotaCalculada {
  numeroCuota: number;
  monto: number;
  fechaVencimiento: string; // ISO date string YYYY-MM-DD
}

export interface PlanCreditoCalculado {
  montoTotal: number;
  montoInicial: number;
  saldoAFinanciar: number;
  cuotas: PlanCuotaCalculada[];
}

/**
 * Genera el cronograma de cuotas exacto para una compra financiada (tipo Cashea/Krece).
 * Asegura que la suma de todas las cuotas sea exactamente igual al saldo a financiar,
 * ajustando posibles diferencias de centavos por división inexacta en la última cuota.
 */
export function generarCronogramaCuotas(
  montoTotal: number,
  montoInicial: number,
  numeroCuotas: number,
  fechaCompra: Date | string,
  intervaloDias = 14
): PlanCreditoCalculado {
  if (numeroCuotas <= 0) {
    throw new Error('El número de cuotas debe ser mayor a 0');
  }
  if (montoTotal <= 0) {
    throw new Error('El monto total debe ser positivo');
  }
  if (montoInicial < 0) {
    throw new Error('El monto inicial no puede ser negativo');
  }
  if (montoInicial >= montoTotal) {
    throw new Error('El monto inicial no puede ser mayor o igual al total de la compra');
  }

  const saldoAFinanciar = roundMoney(montoTotal - montoInicial, 2).toNumber();
  const montoBaseCuota = roundMoney(saldoAFinanciar / numeroCuotas, 2).toNumber();

  const baseDate = typeof fechaCompra === 'string' ? new Date(fechaCompra) : new Date(fechaCompra.getTime());

  const cuotas: PlanCuotaCalculada[] = [];
  let sumaAcumulada = 0;

  for (let i = 1; i <= numeroCuotas; i++) {
    const fechaVencimiento = new Date(baseDate.getTime());
    fechaVencimiento.setDate(fechaVencimiento.getDate() + i * intervaloDias);

    const isUltimaCuota = i === numeroCuotas;
    const montoCuota = isUltimaCuota
      ? roundMoney(saldoAFinanciar - sumaAcumulada, 2).toNumber()
      : montoBaseCuota;

    sumaAcumulada = roundMoney(sumaAcumulada + montoCuota, 2).toNumber();

    cuotas.push({
      numeroCuota: i,
      monto: montoCuota,
      fechaVencimiento: fechaVencimiento.toISOString().split('T')[0]
    });
  }

  return {
    montoTotal: roundMoney(montoTotal, 2).toNumber(),
    montoInicial: roundMoney(montoInicial, 2).toNumber(),
    saldoAFinanciar,
    cuotas
  };
}

/**
 * Calcula el pago mínimo mensual de una tarjeta de crédito.
 */
export function calcularPagoMinimoTarjeta(saldoDeuda: number, pagoMinimoPct = 5.0): number {
  if (saldoDeuda <= 0) return 0;
  const pct = Math.max(0, Math.min(100, pagoMinimoPct)) / 100;
  return roundMoney(saldoDeuda * pct, 2).toNumber();
}

/**
 * Calcula el crédito disponible restante en una tarjeta de crédito.
 */
export function calcularDisponibleTarjeta(limiteCredito: number, saldoDeuda: number): number {
  const disponible = limiteCredito - saldoDeuda;
  return roundMoney(Math.max(0, disponible), 2).toNumber();
}
