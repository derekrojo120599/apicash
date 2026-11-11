use crate::money::round_money;
use chrono::{Duration, NaiveDate};
use rust_decimal::Decimal;
use rust_decimal_macros::dec;
use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Error, Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum CreditoError {
    #[error("El número de cuotas debe ser mayor a 0")]
    NumeroCuotasInvalido,

    #[error("El monto total debe ser positivo")]
    MontoTotalInvalido,

    #[error("El monto inicial no puede ser negativo")]
    MontoInicialNegativo,

    #[error("El monto inicial no puede ser mayor o igual al total de la compra")]
    MontoInicialExcesivo,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct PlanCuotaCalculada {
    pub numero_cuota: u32,
    pub monto: Decimal,
    pub fecha_vencimiento: NaiveDate,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct PlanCreditoCalculado {
    pub monto_total: Decimal,
    pub monto_inicial: Decimal,
    pub saldo_a_financiar: Decimal,
    pub cuotas: Vec<PlanCuotaCalculada>,
}

/// Genera el cronograma de cuotas exacto para una compra financiada (tipo Cashea/Krece).
/// Asegura que la suma de todas las cuotas sea exactamente igual al saldo a financiar,
/// ajustando posibles diferencias de centavos por división inexacta en la última cuota.
pub fn generar_cronograma_cuotas(
    monto_total: Decimal,
    monto_inicial: Decimal,
    numero_cuotas: u32,
    fecha_compra: NaiveDate,
    intervalo_dias: i64,
) -> Result<PlanCreditoCalculado, CreditoError> {
    if numero_cuotas == 0 {
        return Err(CreditoError::NumeroCuotasInvalido);
    }
    if monto_total <= dec!(0) {
        return Err(CreditoError::MontoTotalInvalido);
    }
    if monto_inicial < dec!(0) {
        return Err(CreditoError::MontoInicialNegativo);
    }
    if monto_inicial >= monto_total {
        return Err(CreditoError::MontoInicialExcesivo);
    }

    let saldo_a_financiar = round_money(monto_total - monto_inicial, 2);
    let cuotas_dec = Decimal::from(numero_cuotas);
    let monto_base_cuota = round_money(saldo_a_financiar / cuotas_dec, 2);

    let mut cuotas = Vec::with_capacity(numero_cuotas as usize);
    let mut suma_acumulada = dec!(0.00);

    for i in 1..=numero_cuotas {
        // En Rust, las fechas son inmutables. La suma de días crea una nueva fecha limpia.
        let dias_offset = (i as i64) * intervalo_dias;
        let fecha_vencimiento = fecha_compra + Duration::days(dias_offset);

        let es_ultima_cuota = i == numero_cuotas;
        let monto_cuota = if es_ultima_cuota {
            round_money(saldo_a_financiar - suma_acumulada, 2)
        } else {
            monto_base_cuota
        };

        suma_acumulada += monto_cuota;

        cuotas.push(PlanCuotaCalculada {
            numero_cuota: i,
            monto: monto_cuota,
            fecha_vencimiento,
        });
    }

    Ok(PlanCreditoCalculado {
        monto_total: round_money(monto_total, 2),
        monto_inicial: round_money(monto_inicial, 2),
        saldo_a_financiar,
        cuotas,
    })
}

/// Calcula el pago mínimo mensual de una tarjeta de crédito.
pub fn calcular_pago_minimo_tarjeta(
    saldo_deuda: Decimal,
    pago_minimo_pct: Option<Decimal>,
) -> Decimal {
    if saldo_deuda <= dec!(0) {
        return dec!(0.00);
    }

    let pct = pago_minimo_pct.unwrap_or(dec!(5.00));
    let pct_clamped = pct.max(dec!(0.00)).min(dec!(100.00)) / dec!(100.00);

    round_money(saldo_deuda * pct_clamped, 2)
}

/// Calcula el crédito disponible restante en una tarjeta de crédito.
pub fn calcular_disponible_tarjeta(limite_credito: Decimal, saldo_deuda: Decimal) -> Decimal {
    let disponible = limite_credito - saldo_deuda;
    round_money(disponible.max(dec!(0.00)), 2)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cronograma_cashea_ajuste_centavos() {
        // Caso real: $100 total, $40 inicial = $60 a financiar en 3 cuotas
        // 60 / 3 = 20 exacto
        let fecha = NaiveDate::from_ymd_opt(2026, 11, 1).unwrap();
        let plan = generar_cronograma_cuotas(dec!(100.00), dec!(40.00), 3, fecha, 14).unwrap();

        assert_eq!(plan.saldo_a_financiar, dec!(60.00));
        assert_eq!(plan.cuotas.len(), 3);
        assert_eq!(plan.cuotas[0].monto, dec!(20.00));
        assert_eq!(plan.cuotas[1].monto, dec!(20.00));
        assert_eq!(plan.cuotas[2].monto, dec!(20.00));

        // Verificamos fechas cada 14 días
        assert_eq!(
            plan.cuotas[0].fecha_vencimiento,
            NaiveDate::from_ymd_opt(2026, 11, 15).unwrap()
        );
        assert_eq!(
            plan.cuotas[1].fecha_vencimiento,
            NaiveDate::from_ymd_opt(2026, 11, 29).unwrap()
        );
        assert_eq!(
            plan.cuotas[2].fecha_vencimiento,
            NaiveDate::from_ymd_opt(2026, 12, 13).unwrap()
        );
    }

    #[test]
    fn test_cronograma_division_inexacta() {
        // $100 a financiar en 3 cuotas: 100 / 3 = 33.33 cada una
        // 33.33 + 33.33 = 66.66 -> La última cuota DEBE absorber el centavo restante (33.34)
        let fecha = NaiveDate::from_ymd_opt(2026, 11, 1).unwrap();
        let plan = generar_cronograma_cuotas(dec!(100.00), dec!(0.00), 3, fecha, 14).unwrap();

        assert_eq!(plan.cuotas[0].monto, dec!(33.33));
        assert_eq!(plan.cuotas[1].monto, dec!(33.33));
        assert_eq!(plan.cuotas[2].monto, dec!(33.34));

        let suma: Decimal = plan.cuotas.iter().map(|c| c.monto).sum();
        assert_eq!(suma, dec!(100.00));
    }

    #[test]
    fn test_validaciones_credito() {
        let fecha = NaiveDate::from_ymd_opt(2026, 11, 1).unwrap();

        assert_eq!(
            generar_cronograma_cuotas(dec!(100.00), dec!(0.00), 0, fecha, 14).unwrap_err(),
            CreditoError::NumeroCuotasInvalido
        );
        assert_eq!(
            generar_cronograma_cuotas(dec!(100.00), dec!(120.00), 3, fecha, 14).unwrap_err(),
            CreditoError::MontoInicialExcesivo
        );
    }

    #[test]
    fn test_tarjeta_credito() {
        let saldo = dec!(1500.00);
        let pago_minimo = calcular_pago_minimo_tarjeta(saldo, None); // default 5%
        assert_eq!(pago_minimo, dec!(75.00));

        let limite = dec!(2000.00);
        let disponible = calcular_disponible_tarjeta(limite, saldo);
        assert_eq!(disponible, dec!(500.00));
    }
}
