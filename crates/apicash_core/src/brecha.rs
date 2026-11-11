use crate::money::round_money;
use rust_decimal::Decimal;
use rust_decimal_macros::dec;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct CalculoBrecha {
    pub tasa_oficial: Decimal,
    pub tasa_paralelo: Decimal,
    pub diferencia: Decimal,
    pub porcentaje_brecha: Decimal,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct AnalisisConveniencia {
    pub monto_ref_usd: Decimal,
    pub costo_en_ves_oficial: Decimal,
    pub usd_equivalente_en_paralelo: Decimal,
    pub ahorro_usd_si_paga_en_ves: Decimal,
    pub porcentaje_ahorro: Decimal,
    pub recomendacion: String,
}

/// Calcula la brecha cambiaria porcentual y absoluta entre la tasa oficial (BCV)
/// y la tasa alternativa (P2P / Paralelo).
pub fn calcular_brecha_cambiaria(tasa_oficial: Decimal, tasa_paralelo: Decimal) -> CalculoBrecha {
    if tasa_oficial <= dec!(0) || tasa_paralelo <= dec!(0) {
        return CalculoBrecha {
            tasa_oficial: tasa_oficial.max(dec!(0)),
            tasa_paralelo: tasa_paralelo.max(dec!(0)),
            diferencia: dec!(0),
            porcentaje_brecha: dec!(0),
        };
    }

    let diferencia = round_money(tasa_paralelo - tasa_oficial, 4);
    let porcentaje_brecha = round_money(((tasa_paralelo - tasa_oficial) / tasa_oficial) * dec!(100), 2);

    CalculoBrecha {
        tasa_oficial,
        tasa_paralelo,
        diferencia,
        porcentaje_brecha,
    }
}

/// Analiza la conveniencia económica de pagar un precio fijado en dólares a tasa oficial
/// pagando en bolívares (tras cambiar P2P) vs pagar directamente con billetes dólares físicos.
pub fn analizar_conveniencia_pago(
    monto_ref_usd: Decimal,
    tasa_oficial: Decimal,
    tasa_paralelo: Decimal,
) -> AnalisisConveniencia {
    if monto_ref_usd <= dec!(0) || tasa_oficial <= dec!(0) || tasa_paralelo <= dec!(0) {
        return AnalisisConveniencia {
            monto_ref_usd,
            costo_en_ves_oficial: dec!(0),
            usd_equivalente_en_paralelo: dec!(0),
            ahorro_usd_si_paga_en_ves: dec!(0),
            porcentaje_ahorro: dec!(0),
            recomendacion: "Sin datos suficientes para comparar.".to_string(),
        };
    }

    // Monto en bolívares que cobrará el comercio a tasa oficial
    let costo_en_ves_oficial = round_money(monto_ref_usd * tasa_oficial, 2);

    // Cuántos dólares P2P se necesitan vender para obtener esos bolívares
    let usd_equivalente_en_paralelo = round_money(costo_en_ves_oficial / tasa_paralelo, 2);

    // Ahorro neto en dólares si se paga en bolívares
    let ahorro_usd = round_money(monto_ref_usd - usd_equivalente_en_paralelo, 2);
    let pct_ahorro = round_money((ahorro_usd / monto_ref_usd) * dec!(100), 2);

    let recomendacion = if ahorro_usd > dec!(0) {
        format!(
            "Te conviene pagar en bolívares a tasa oficial. Ahorras aprox. ${} ({}%) cambiando antes en P2P.",
            ahorro_usd, pct_ahorro
        )
    } else if ahorro_usd < dec!(0) {
        "Te conviene pagar en dólares en efectivo directamente.".to_string()
    } else {
        "El costo es equivalente en ambas modalidades.".to_string()
    };

    AnalisisConveniencia {
        monto_ref_usd,
        costo_en_ves_oficial,
        usd_equivalente_en_paralelo,
        ahorro_usd_si_paga_en_ves: ahorro_usd,
        porcentaje_ahorro: pct_ahorro,
        recomendacion,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_calcular_brecha() {
        let bcv = dec!(36.50);
        let p2p = dec!(42.00);
        let brecha = calcular_brecha_cambiaria(bcv, p2p);

        assert_eq!(brecha.diferencia, dec!(5.50));
        assert_eq!(brecha.porcentaje_brecha, dec!(15.07));
    }

    #[test]
    fn test_analisis_conveniencia_ahorro() {
        let monto_ref = dec!(100.00);
        let bcv = dec!(40.00);
        let p2p = dec!(50.00);
        let analisis = analizar_conveniencia_pago(monto_ref, bcv, p2p);

        // 100 USD * 40 BCV = 4000 VES
        assert_eq!(analisis.costo_en_ves_oficial, dec!(4000.00));
        // 4000 VES / 50 P2P = 80 USD
        assert_eq!(analisis.usd_equivalente_en_paralelo, dec!(80.00));
        // Ahorro = 100 - 80 = 20 USD (20%)
        assert_eq!(analisis.ahorro_usd_si_paga_en_ves, dec!(20.00));
        assert_eq!(analisis.porcentaje_ahorro, dec!(20.00));
    }
}
