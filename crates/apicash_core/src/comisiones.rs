use crate::money::round_money;
use rust_decimal::Decimal;
use rust_decimal_macros::dec;
use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Error, Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum ComisionError {
    #[error("No se permite override de comisión en operaciones fallidas")]
    OverrideEnOperacionFallida,

    #[error("Override rechazado: subtipo {subtipo} no permite override")]
    OverrideNoPermitido { subtipo: String },

    #[error("Override rechazado: monto fuera del rango permitido (0 a {tope})")]
    OverrideFueraDeRango { tope: Decimal },
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ComisionConfig {
    pub subtipo_operacion: String,
    pub porcentaje: Decimal,
    pub minimo_ves: Decimal,
    pub maximo_ves: Option<Decimal>,
    pub permite_override: bool,
    pub aplica_a_fallidas: bool,
    pub asume_usuario: bool,
}

impl Default for ComisionConfig {
    fn default() -> Self {
        Self {
            subtipo_operacion: String::new(),
            porcentaje: dec!(0),
            minimo_ves: dec!(0),
            maximo_ves: None,
            permite_override: false,
            aplica_a_fallidas: false,
            asume_usuario: true,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct CalculoComisionResult {
    pub comision_calculada: Decimal,
    pub comision_final: Decimal,
    pub tope_calculado: Decimal,
}

impl CalculoComisionResult {
    pub fn zero() -> Self {
        Self {
            comision_calculada: dec!(0.00),
            comision_final: dec!(0.00),
            tope_calculado: dec!(0.00),
        }
    }
}

/// Parámetros opcionales para el cálculo de comisión.
/// En Rust, usar un struct de parámetros es el patrón idiomático para evitar funciones
/// con demasiados argumentos posicionales booleanos o nulos.
#[derive(Debug, Clone, Default)]
pub struct PreviewComisionParams {
    pub es_fallida: bool,
    pub override_comision: Option<Decimal>,
    pub asumir_comision_comercio: bool,
}

/// Calcula la comisión bancaria para previsualización en UI.
/// Réplica exacta de la RPC `registrar_operacion_con_comision` en backend.
pub fn preview_comision(
    monto_principal: Decimal,
    config: Option<&ComisionConfig>,
    params: PreviewComisionParams,
) -> Result<CalculoComisionResult, ComisionError> {
    let Some(config) = config else {
        return Ok(CalculoComisionResult::zero());
    };

    // Si la comisión la asume el comercio y el usuario NO activó el flag excepcional de asumirla
    if !config.asume_usuario && !params.asumir_comision_comercio {
        return Ok(CalculoComisionResult::zero());
    }

    if params.es_fallida && !config.aplica_a_fallidas {
        return Ok(CalculoComisionResult::zero());
    }

    let monto = round_money(monto_principal, 2);

    if params.es_fallida {
        if params.override_comision.is_some() {
            return Err(ComisionError::OverrideEnOperacionFallida);
        }
        return Ok(CalculoComisionResult {
            comision_calculada: dec!(0.00),
            comision_final: config.minimo_ves,
            tope_calculado: config.minimo_ves,
        });
    }

    let comision_calculada = round_money(monto * config.porcentaje, 2);
    let mut comision_final = comision_calculada.max(config.minimo_ves);

    let tope_calculado = match config.maximo_ves {
        Some(maximo) => {
            comision_final = comision_final.min(maximo);
            maximo
        }
        None => comision_final,
    };

    if let Some(override_val) = params.override_comision {
        if !config.permite_override {
            return Err(ComisionError::OverrideNoPermitido {
                subtipo: config.subtipo_operacion.clone(),
            });
        }

        if override_val < dec!(0) || override_val > tope_calculado {
            return Err(ComisionError::OverrideFueraDeRango {
                tope: tope_calculado,
            });
        }

        comision_final = round_money(override_val, 2);
    }

    Ok(CalculoComisionResult {
        comision_calculada,
        comision_final,
        tope_calculado,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn base_config() -> ComisionConfig {
        ComisionConfig {
            subtipo_operacion: "PAGO_MOVIL".to_string(),
            porcentaje: dec!(0.015), // 1.5%
            minimo_ves: dec!(1.50),
            maximo_ves: Some(dec!(100.00)),
            permite_override: true,
            aplica_a_fallidas: true,
            asume_usuario: true,
        }
    }

    #[test]
    fn test_comision_estandar() {
        let config = base_config();
        let params = PreviewComisionParams::default();

        // Monto 1000 VES -> 1.5% = 15.00 VES
        let res = preview_comision(dec!(1000.00), Some(&config), params).unwrap();
        assert_eq!(res.comision_calculada, dec!(15.00));
        assert_eq!(res.comision_final, dec!(15.00));
        assert_eq!(res.tope_calculado, dec!(100.00));
    }

    #[test]
    fn test_comision_aplica_minimo() {
        let config = base_config();
        let params = PreviewComisionParams::default();

        // Monto 10 VES -> 1.5% = 0.15 VES, pero mínimo es 1.50 VES
        let res = preview_comision(dec!(10.00), Some(&config), params).unwrap();
        assert_eq!(res.comision_calculada, dec!(0.15));
        assert_eq!(res.comision_final, dec!(1.50));
    }

    #[test]
    fn test_error_override_en_fallida() {
        let config = base_config();
        let params = PreviewComisionParams {
            es_fallida: true,
            override_comision: Some(dec!(5.00)),
            asumir_comision_comercio: false,
        };

        let err = preview_comision(dec!(100.00), Some(&config), params).unwrap_err();
        assert_eq!(err, ComisionError::OverrideEnOperacionFallida);
    }

    #[test]
    fn test_error_override_fuera_de_rango() {
        let config = base_config();
        let params = PreviewComisionParams {
            es_fallida: false,
            override_comision: Some(dec!(150.00)), // Tope es 100.00
            asumir_comision_comercio: false,
        };

        let err = preview_comision(dec!(1000.00), Some(&config), params).unwrap_err();
        assert_eq!(
            err,
            ComisionError::OverrideFueraDeRango {
                tope: dec!(100.00)
            }
        );
    }
}
