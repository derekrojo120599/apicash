# Bank Commissions Specification

## Purpose

Defines the rules for calculating, tracking, and configuring bank commissions based on Venezuelan (BCV) banking standards.

## Requirements

### Requirement: Commission Configuration

The system MUST allow users to define commission calculation rules for different operation types (e.g., Transferencia, Pago Móvil).

#### Scenario: User configures a commission rule
- GIVEN the user navigates to the commission settings
- WHEN they set a percentage (e.g., 0.3%) and a minimum amount (e.g., 0.13 VES) for "Pago Móvil"
- THEN the system MUST save these parameters to the `comisiones_config` store for future calculations.

### Requirement: BCV Logic and Minimums

The system MUST calculate the commission for a given transaction amount by applying the configured percentage, comparing it to the configured minimum, and returning the greater value.

#### Scenario: Percentage result is lower than the minimum
- GIVEN a commission rule with 0.3% rate and 0.13 VES minimum
- WHEN a transaction of 10.00 VES is calculated (0.3% = 0.03 VES)
- THEN the system MUST apply the minimum amount (0.13 VES) as the commission.

#### Scenario: Percentage result is higher than the minimum
- GIVEN a commission rule with 0.3% rate and 0.13 VES minimum
- WHEN a transaction of 1000.00 VES is calculated (0.3% = 3.00 VES)
- THEN the system MUST apply the percentage amount (3.00 VES) as the commission.

### Requirement: Exact Rounding Rules

The system MUST round all calculated commissions to exactly two decimal places using strict round-half-up (or standard arithmetic rounding) to comply with banking math.

#### Scenario: Commission calculation has multiple decimal places
- GIVEN a commission rule with 0.3% rate
- WHEN a transaction of 123.45 VES is calculated (0.3% = 0.37035)
- THEN the system MUST round the result exactly to 0.37 VES.