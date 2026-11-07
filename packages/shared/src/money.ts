import { Decimal } from 'decimal.js';

// PostgreSQL uses ROUND_HALF_UP by default (0.5 rounds up)
export const MoneyDecimal = Decimal.clone({
  rounding: Decimal.ROUND_HALF_UP,
  precision: 28, // Compatible with NUMERIC(18,4) and NUMERIC(18,2)
});

export function roundMoney(value: number | string | Decimal, places: number = 2): Decimal {
  return new MoneyDecimal(value).toDecimalPlaces(places, Decimal.ROUND_HALF_UP);
}

export function formatMoney(value: number | string | Decimal, places: number = 2): string {
  return roundMoney(value, places).toFixed(places);
}

/**
 * Calculates USD amount from VES amount and exchange rate.
 * Rounds to 2 decimal places using HALF_UP.
 */
export function calculateUsdFromVes(montoVes: number | string | Decimal, tasa: number | string | Decimal): string {
  const t = new Decimal(tasa);
  if (t.isZero()) return '0.00';
  const ves = new Decimal(montoVes);
  return roundMoney(ves.dividedBy(t), 2).toFixed(2);
}

/**
 * Calculates VES amount from USD amount and exchange rate.
 */
export function calculateVesFromUsd(montoUsd: number | string | Decimal, tasa: number | string | Decimal): string {
  const usd = new Decimal(montoUsd);
  const t = new Decimal(tasa);
  return roundMoney(usd.times(t), 2).toFixed(2);
}
