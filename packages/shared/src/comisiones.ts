import { Decimal } from 'decimal.js';
import { roundMoney } from './money';

export interface ComisionConfig {
  subtipo_operacion: string;
  porcentaje: number | string | Decimal;
  minimo_ves: number | string | Decimal;
  maximo_ves?: number | string | Decimal | null;
  permite_override?: boolean;
  aplica_a_fallidas?: boolean;
}

export interface CalculoComisionResult {
  comisionCalculada: string;
  comisionFinal: string;
  topeCalculado: string;
}

/**
 * Calculates bank commission for UI preview.
 * Mirrors backend logic (RPC registrar_operacion_con_comision).
 */
export function previewComision(
  montoPrincipal: number | string | Decimal,
  config: ComisionConfig | null | undefined,
  esFallida: boolean = false,
  overrideComision?: number | string | Decimal | null
): CalculoComisionResult {
  if (!config) {
    return {
      comisionCalculada: '0.00',
      comisionFinal: '0.00',
      topeCalculado: '0.00',
    };
  }

  const monto = roundMoney(montoPrincipal);
  const porcentaje = new Decimal(config.porcentaje);
  const minimoVes = new Decimal(config.minimo_ves);

  let comisionCalculada = new Decimal(0);
  let comisionFinal = new Decimal(0);
  let topeCalculado = new Decimal(0);

  if (esFallida && !config.aplica_a_fallidas) {
    return {
      comisionCalculada: comisionCalculada.toFixed(2),
      comisionFinal: comisionFinal.toFixed(2),
      topeCalculado: topeCalculado.toFixed(2),
    };
  }

  if (esFallida) {
    if (overrideComision !== undefined && overrideComision !== null) {
      throw new Error('No se permite override de comisión en operaciones fallidas');
    }
    comisionFinal = minimoVes;
    topeCalculado = minimoVes;
  } else {
    comisionCalculada = roundMoney(monto.times(porcentaje));
    comisionFinal = Decimal.max(comisionCalculada, minimoVes);
    topeCalculado = comisionFinal;

    if (config.maximo_ves !== undefined && config.maximo_ves !== null) {
      const maximoVes = new Decimal(config.maximo_ves);
      topeCalculado = Decimal.min(comisionFinal, maximoVes);
      comisionFinal = topeCalculado;
    }

    if (overrideComision !== undefined && overrideComision !== null) {
      if (!config.permite_override) {
        throw new Error(`Override rechazado: subtipo ${config.subtipo_operacion} no permite override`);
      }

      const overrideValue = new Decimal(overrideComision);
      if (overrideValue.lt(0) || overrideValue.gt(topeCalculado)) {
        throw new Error(`Override rechazado: monto fuera del rango permitido`);
      }
      
      comisionFinal = roundMoney(overrideValue);
    }
  }

  return {
    comisionCalculada: comisionCalculada.toFixed(2),
    comisionFinal: comisionFinal.toFixed(2),
    topeCalculado: topeCalculado.toFixed(2),
  };
}
