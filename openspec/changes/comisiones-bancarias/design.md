# Design: Comisiones Bancarias

## Technical Approach

Implement automated banking commissions calculation via a robust database-first strategy. We will use a dedicated `comisiones_config` table with temporal validity and an RPC (`SECURITY INVOKER`) to handle atomic transactions. The system will support failed operations, exact fractions for percentages, and dual-currency double writes.

## Architecture Decisions

### Decision: Percentage Format and Precision
**Choice**: Store as fractions (e.g., `0.0030` for 0.30%) using `NUMERIC(7,6)`.
**Alternatives considered**: Integer basis points (e.g., 30 bps) or standard `NUMERIC(5,2)`.
**Rationale**: Fractions naturally integrate into multiplication equations (`amount * commission`) without risking divide-by-100 bugs or losing exact precision in small currency transactions.

### Decision: Commission Subtypes
**Choice**: Use `TEXT` with a `CHECK` constraint (pm_p2p, pm_p2c, pm_c2p_interbancario, pm_c2p_mismo_banco, transferencia_interbancaria, transferencia_mismo_banco, cajero, biopago).
**Alternatives considered**: PostgreSQL `ENUM` type.
**Rationale**: Text + `CHECK` is significantly easier to extend in the future without complex DDL schema migrations, whereas Enums are rigid.

### Decision: RPC Security Context
**Choice**: Use `SECURITY INVOKER` and extract the user from `auth.uid()`.
**Alternatives considered**: `SECURITY DEFINER`.
**Rationale**: Guarantees all logic respects Row Level Security (RLS) constraints and prevents privilege escalation on manual inserts.

### Decision: Time-temporal Configuration Constraints
**Choice**: Use `btree_gist` extension with an `EXCLUDE` constraint on `tstzrange(vigente_desde, vigente_hasta)`.
**Alternatives considered**: Traditional `UNIQUE` index or application-level checks.
**Rationale**: Application-level checks suffer from race conditions. A standard `UNIQUE` index cannot prevent date overlaps. `btree_gist` provides a robust, database-level guarantee that a user cannot have two active commission configurations for the same sub-type at the same time.

### Decision: Concurrency Control in RPC
**Choice**: Use `SELECT ... FOR UPDATE` on the user's account row during the transaction.
**Alternatives considered**: Optimistic concurrency control or no locks.
**Rationale**: Checking `monto_operacion + monto_comision <= saldo_actual` is subject to race conditions. A row-level lock ensures the balance remains valid throughout the atomic transaction calculation.

## Data Flow

1. **Initialization**: On user signup, a database trigger or API hook seeds default commission parameters into `comisiones_config` for common subtypes.
2. **Transaction Request**: Client calls RPC `registrar_operacion_con_comision` with `p_tasa_cambio`.
3. **Validation**: RPC executes `SELECT saldo_cache FROM cuentas WHERE id = p_cuenta_id FOR UPDATE` to lock the row. It checks if `monto_operacion + monto_comision <= saldo_actual`.
4. **Execution**:
   - RPC queries active `comisiones_config` based on `vigente_desde`/`vigente_hasta`.
   - RPC overrides the commission if `p_override_comision` is provided and the configured percentage `es_tope` applies.
   - Calculates `monto_usd_calculado` for BOTH principal and commission using the same `p_tasa_cambio` (respecting Zero Downtime double write architecture).
   - If `p_es_fallida = true`: Writes *only* the commission row.
   - If successful: Writes the principal row, then the commission row referencing `transaccion_padre_id`. The commission is assigned strictly to the user's explicit "Comisiones bancarias" category, not the principal's category.
5. **Balances**: `saldo_cache` is updated atomically.

## Interfaces / Contracts

### Table: `comisiones_config`
```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE comisiones_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    subtipo_operacion TEXT NOT NULL CHECK (subtipo_operacion IN ('pm_p2p', 'pm_p2c', 'pm_c2p_interbancario', 'pm_c2p_mismo_banco', 'transferencia_interbancaria', 'transferencia_mismo_banco', 'cajero', 'biopago')),
    porcentaje NUMERIC(7,6),
    monto_fijo NUMERIC(18,4),
    es_tope BOOLEAN DEFAULT false,
    aplica_a_fallidas BOOLEAN DEFAULT false,
    vigente_desde TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    vigente_hasta TIMESTAMP WITH TIME ZONE,
    fuente TEXT,
    CONSTRAINT exclude_overlapping_vigencia EXCLUDE USING gist (
        user_id WITH =,
        subtipo_operacion WITH =,
        tstzrange(vigente_desde, COALESCE(vigente_hasta, 'infinity'::timestamp with time zone)) WITH &&
    )
);
```

### RPC Header
```sql
CREATE OR REPLACE FUNCTION registrar_operacion_con_comision(
    p_cuenta_id UUID,
    p_categoria_principal_id UUID,
    p_monto NUMERIC(18,4),
    p_moneda moneda_enum,
    p_subtipo_operacion TEXT,
    p_tasa_cambio NUMERIC,
    p_fecha TIMESTAMP WITH TIME ZONE,
    p_descripcion TEXT,
    p_override_comision NUMERIC DEFAULT NULL,
    p_es_fallida BOOLEAN DEFAULT FALSE
) RETURNS UUID
LANGUAGE plpgsql SECURITY INVOKER
AS $$
    -- Calculates exact usd amount, validates balance, inserts rows 
$$;
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/xxxx_comisiones.sql` | Create | Adds `comisiones_config`, checks, FK `transaccion_padre_id` (RESTRICT) with index, and RPC. |
| `src/utils/money.ts` | Modify | Fix docs (ROUND_HALF_UP is not banker's rounding). Configure `Decimal.clone({ rounding: Decimal.ROUND_HALF_EVEN })` for standard banker's rounding. |
| `src/hooks/useTransacciones.ts` | Modify | Update client hooks to invoke the new RPC and pass `p_tasa_cambio`. |
| `supabase/tests/comisiones.test.sql` | Create | `pgTap` tests covering unit constraints. |

## Migration / Rollout

*   **Additive Migration Plan**: All changes must be strictly additive. No destructive changes (`DROP TABLE`, `DROP COLUMN`) allowed to ensure zero downtime.
*   **Phase 1 (Schema Prep)**: Create `btree_gist` extension, `comisiones_config` table, and add `subtipo_operacion`, `transaccion_padre_id` to `transacciones`.
*   **Phase 2 (RPC Deployment)**: Deploy the `registrar_operacion_con_comision` RPC.
*   **Phase 3 (Data Backfill)**: Backfill legacy data using a background script/worker if necessary. No existing data types are mutated directly if it breaks backward compatibility.
*   **Phase 4 (Activation)**: Deploy updated `money.ts`. Seed default user values upon next login or background worker.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit (DB) | `NUMERIC(7,6)` precision | Assert that `0.0030` inserts properly and precision is not lost via `pgTap`. |
| Unit (App) | Banker's Rounding | Test `Decimal.clone` banker's rounding (`ROUND_HALF_EVEN`) vs half-up in `money.ts`. |
| Integration | Failed Operations | Assert that a failed op writes *only* the commission row and subtracts it. |
| Integration | Balance Check | Assert exception if `monto + comision > saldo`. |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary.

## Open Questions

- [ ] Do we need a default global `comisiones_config` read-only template to initialize users, or will it be fully hardcoded in the auth trigger?
