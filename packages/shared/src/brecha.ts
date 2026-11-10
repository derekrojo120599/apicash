import { roundMoney } from './money';

export interface CalculoBrecha {
  tasaOficial: number;
  tasaParalelo: number;
  diferencia: number;
  porcentajeBrecha: number;
}

export interface AnalisisConveniencia {
  montoRefUsd: number;
  costoEnVesOficial: number;
  usdEquivalenteEnParalelo: number;
  ahorroUsdSiPagaEnVes: number;
  porcentajeAhorro: number;
  recomendacion: string;
}

/**
 * Calcula la brecha cambiaria porcentual y absoluta entre la tasa oficial (BCV)
 * y la tasa alternativa (P2P / Paralelo).
 */
export function calcularBrechaCambiaria(
  tasaOficial: number,
  tasaParalelo: number
): CalculoBrecha {
  if (tasaOficial <= 0 || tasaParalelo <= 0) {
    return {
      tasaOficial: Math.max(0, tasaOficial),
      tasaParalelo: Math.max(0, tasaParalelo),
      diferencia: 0,
      porcentajeBrecha: 0
    };
  }

  const dif = roundMoney(tasaParalelo - tasaOficial, 4).toNumber();
  const pct = roundMoney(((tasaParalelo - tasaOficial) / tasaOficial) * 100, 2).toNumber();

  return {
    tasaOficial,
    tasaParalelo,
    diferencia: dif,
    porcentajeBrecha: pct
  };
}

/**
 * Analiza la conveniencia económica de pagar un precio fijado en dólares a tasa oficial
 * pagando en bolívares (tras cambiar P2P) vs pagar directamente con billetes dólares físicos.
 */
export function analizarConvenienciaPago(
  montoRefUsd: number,
  tasaOficial: number,
  tasaParalelo: number
): AnalisisConveniencia {
  if (montoRefUsd <= 0 || tasaOficial <= 0 || tasaParalelo <= 0) {
    return {
      montoRefUsd,
      costoEnVesOficial: 0,
      usdEquivalenteEnParalelo: 0,
      ahorroUsdSiPagaEnVes: 0,
      porcentajeAhorro: 0,
      recomendacion: 'Sin datos suficientes para comparar.'
    };
  }

  // Monto en bolívares que cobrará el comercio a tasa oficial
  const costoEnVesOficial = roundMoney(montoRefUsd * tasaOficial, 2).toNumber();

  // Cuántos dólares P2P se necesitan vender para obtener esos bolívares
  const usdEquivalenteEnParalelo = roundMoney(costoEnVesOficial / tasaParalelo, 2).toNumber();

  // Ahorro neto en dólares si se paga en bolívares
  const ahorroUsd = roundMoney(montoRefUsd - usdEquivalenteEnParalelo, 2).toNumber();
  const pctAhorro = roundMoney((ahorroUsd / montoRefUsd) * 100, 2).toNumber();

  let recomendacion = '';
  if (ahorroUsd > 0) {
    recomendacion = `Te conviene pagar en bolívares a tasa oficial. Ahorras aprox. $${ahorroUsd} (${pctAhorro}%) cambiando antes en P2P.`;
  } else if (ahorroUsd < 0) {
    recomendacion = 'Te conviene pagar en dólares en efectivo directamente.';
  } else {
    recomendacion = 'El costo es equivalente en ambas modalidades.';
  }

  return {
    montoRefUsd,
    costoEnVesOficial,
    usdEquivalenteEnParalelo,
    ahorroUsdSiPagaEnVes: ahorroUsd,
    porcentajeAhorro: pctAhorro,
    recomendacion
  };
}
