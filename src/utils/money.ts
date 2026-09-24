import { Decimal } from 'decimal.js';

// Creamos un clon de Decimal con la configuración de redondeo que coincida con PostgreSQL.
// PostgreSQL usa ROUND_HALF_UP por defecto (0.5 redondea a 1).
export const MoneyDecimal = Decimal.clone({
  rounding: Decimal.ROUND_HALF_UP,
  precision: 28, // Suficiente para NUMERIC(18,4) o NUMERIC(18,2)
});

/**
 * Redondea un monto monetario utilizando HALF_UP,
 * para coincidir exactamente con el comportamiento de PostgreSQL ROUND(val, places).
 * 
 * @param value Valor a redondear
 * @param places Cantidad de decimales (por defecto 2)
 * @returns Instancia de MoneyDecimal redondeada
 */
export function roundMoney(value: number | string | Decimal, places: number = 2): Decimal {
  return new MoneyDecimal(value).toDecimalPlaces(places, Decimal.ROUND_HALF_UP);
}

/**
 * Formatea un monto a string con un número fijo de decimales (por defecto 2),
 * aplicando redondeo HALF_UP.
 * 
 * @param value Valor a redondear y formatear
 * @param places Cantidad de decimales
 * @returns Cadena formateada
 */
export function formatMoney(value: number | string | Decimal, places: number = 2): string {
  return roundMoney(value, places).toFixed(places);
}
