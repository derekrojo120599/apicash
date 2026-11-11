use rust_decimal::Decimal;
use rust_decimal::RoundingStrategy;

/// PostgreSQL uses ROUND_HALF_UP by default (0.5 rounds up, away from zero)
pub fn round_money(value: Decimal, places: u32) -> Decimal {
    value.round_dp_with_strategy(places, RoundingStrategy::MidpointAwayFromZero)
}

/// Formats a decimal amount to string with fixed decimal places.
pub fn format_money(value: Decimal, places: u32) -> String {
    format!("{:.places$}", round_money(value, places), places = places as usize)
}

/// Calculates USD amount from VES amount and exchange rate.
/// Returns None if tasa is zero to avoid division by zero.
pub fn calculate_usd_from_ves(monto_ves: Decimal, tasa: Decimal) -> Option<Decimal> {
    if tasa.is_zero() {
        return None;
    }
    Some(round_money(monto_ves / tasa, 2))
}

/// Calculates VES amount from USD amount and exchange rate.
pub fn calculate_ves_from_usd(monto_usd: Decimal, tasa: Decimal) -> Decimal {
    round_money(monto_usd * tasa, 2)
}

#[cfg(test)]
mod tests {
    use super::*;
    use rust_decimal_macros::dec;

    #[test]
    fn test_calculate_usd_from_ves() {
        let monto_ves = dec!(3650.00);
        let tasa = dec!(36.50);
        let resultado = calculate_usd_from_ves(monto_ves, tasa);
        assert_eq!(resultado, Some(dec!(100.00)));
    }

    #[test]
    fn test_calculate_usd_from_ves_zero_rate() {
        let monto_ves = dec!(100.00);
        let tasa = dec!(0.0);
        assert_eq!(calculate_usd_from_ves(monto_ves, tasa), None);
    }

    #[test]
    fn test_calculate_ves_from_usd() {
        let monto_usd = dec!(50.25);
        let tasa = dec!(40.00);
        assert_eq!(calculate_ves_from_usd(monto_usd, tasa), dec!(2010.00));
    }

    #[test]
    fn test_round_half_up() {
        // 0.005 with half_up should round to 0.01
        assert_eq!(round_money(dec!(10.005), 2), dec!(10.01));
        assert_eq!(round_money(dec!(10.004), 2), dec!(10.00));
    }
}
