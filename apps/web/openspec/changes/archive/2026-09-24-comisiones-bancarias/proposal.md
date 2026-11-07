# Proposal: módulo de comisiones bancarias (BCV) + precisión monetaria

## Intent
Implement a robust bank commission tracking system for Venezuelan operations (BCV rules) ensuring exact mathematical precision. We need to eliminate floating-point rounding errors on the client by introducing `decimal.js` and allow users to auto-calculate and track bank fees atomically using a dedicated configuration table.

## Scope

### In Scope
- Create `comisiones_config` table and `tipo_operacion_enum` in the database.
- Add `tipo_operacion`, `transaccion_padre_id`, and `es_comision` to the `transacciones` table.
- Create a PL/pgSQL RPC `registrar_transaccion_con_comision` for atomic dual-inserts (parent + commission).
- Implement a pure function `calcularComision(tipo, montoVes, config)` in `lib/money.ts` using `decimal.js`.
- Update the UI to show live commissions, editable limits (topes), and total paid in commissions.
- Install Vitest and write 8 rigorous test cases for `calcularComision`.
- Zero Downtime Migration (Additive schema → UI Cutover → Cleanup).

### Out of Scope
- Auto-syncing bank commission rates from external APIs (rates are user-configurable/manual defaults).
- Historical backfilling of past implicit commissions (they remain as regular expenses).

## Capabilities

### New Capabilities
- `bank-commissions`: Auto-calculation, atomic insertion, and configuration of bank transaction fees.
- `money-math`: Centralized precision arithmetic using `decimal.js`.

### Modified Capabilities
- `transaction-management`: Transitioning from direct table inserts to RPC-based inserts to support atomic parent-child transactions.

## Approach
We will execute a Zero Downtime Migration:
1. **Additive Phase**: Create the new table, enum, and add nullable columns to `transacciones`. Create the new RPC.
2. **Client Update (Dual Write)**: Introduce `decimal.js`, `lib/money.ts`, and the new pure functions. Update the UI to calculate commissions and use the new RPC instead of direct inserts.
3. **Verification**: Execute the 8 Vitest cases to ensure exact BCV rounding compliance. 
4. **Cutover**: Deprecate old direct inserts in the UI. 

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| DB Schema | New | `comisiones_config`, `tipo_operacion_enum`, RPC `registrar_transaccion_con_comision` |
| `transacciones` | Modified | Add `tipo_operacion`, `transaccion_padre_id`, `es_comision` |
| `lib/money.ts` | New | `decimal.js` precision functions and `calcularComision` |
| `src/hooks/useTransacciones.ts` | Modified | Migrate to RPC for inserting transactions with commissions |
| `UI Components` | Modified | Transaction forms to show live fees, settings for topes, dashboard for totals |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| DB Locks during ALTER TABLE | Low | `ADD COLUMN` without default values is fast and safe. |
| Client-side floating point bleed | Medium | Strictly type `calcularComision` and use `decimal.js` everywhere in `lib/money.ts`. Enforce via Vitest. |

## Rollback Plan
Since the DB migration is additive, rolling back consists of reverting the frontend commit. Old frontend code will continue to insert standard transactions (leaving `es_comision` and `transaccion_padre_id` NULL) which is completely valid.

## Dependencies
- `decimal.js`
- `vitest`

## Success Criteria
- [ ] `comisiones_config` table and `transacciones` alterations applied without downtime.
- [ ] RPC successfully inserts parent and child transactions atomically.
- [ ] 8 Vitest tests pass, asserting correct calculations of exact limits and % rounding.
- [ ] UI displays calculated commissions correctly.
