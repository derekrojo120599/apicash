# Tasks: Comisiones Bancarias

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~400 lines |
| 400-line budget risk | Medium |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (DB Draft & Apply) -> PR 2 (App Logic & UI) |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | DB Schema, RPC, and pgTAP tests | PR 1 | `supabase test db` | `supabase db reset` | Bloque SQL inverso del encabezado + restore pg_dump |
| 2 | Frontend refactor & Typescript logic | PR 2 | `npm run test` (vitest) | Local dev server | Revert TS/UI commits |
| 3 | Backfill strategy | PR 3 | N/A | Dry-run backfill script | Revert backfill commit |

## Phase 1: DB Schema and RPC Draft (Do Not Apply)

- [x] 1.1 Draft migration file `supabase/migrations/20260923000000_comisiones_bancarias.sql` with `btree_gist`, `comisiones_config`, and the `registrar_operacion_con_comision` RPC (including `FOR UPDATE` lock).
- [x] 1.2 Draft `pgTAP` tests in `supabase/tests/comisiones.test.sql` for constraints, date exclusions, and RPC behavior.
- [x] 1.3 Pause execution. Present draft SQL artifact to user for approval.

## Phase 2: DB Test Apply

- [x] 2.1 Apply approved migration to test environment.
- [x] 2.2 Execute `pgTAP` assertions to verify constraints and RPC logic.

## Phase 3: Core Logic (TypeScript)

- [x] 3.1 Update `src/utils/money.ts` to implement redondeo half-up (ROUND_HALF_UP) con `Decimal.clone`; debe coincidir con el `ROUND(..., 2)` de PostgreSQL.
- [x] 3.2 Create `src/utils/comisiones.ts` for frontend visual preview logic. The backend RPC is the sole authority; UI only previews.
- [x] 3.3 Write Vitest tests for both `money.ts` and `comisiones.ts` matching pgTAP fixed cases (4675 -> 14.03; 10 -> 14.00; fallida 100000 -> 14.00).

## Phase 4: Frontend Refactoring & Dual Writes

- [x] 4.1 Update `src/hooks/useTransacciones.ts` to integrate the `registrar_operacion_con_comision` RPC.
- [x] 4.2 Refactor transaction creation UI forms (e.g., `src/app/(main)/transacciones/page.tsx`) to pass commission fields.
- [x] 4.3 Replace old insert strictly. Do NOT fallback silently to the old direct insert if the RPC fails; expose the exact RPC error to the user.

## Phase 5: Backfill Strategy & Cutoff Verification

- [x] 5.1 No historical commission generation. Do not alter historical balances. La migración a NUMERIC convierte TODAS las filas (incluidas las anteriores a 2026-08-01) sin cambiar sus valores. La fecha 2026-08-01 aplica solo al tarifario de comisiones. No generar comisiones retroactivas ni alterar saldos históricos.
- [x] 5.2 Execute cutoff verification row-by-row (`nuevo <> round(viejo::numeric,2) = 0 filas`) and reconcile total balances per account (not just global `SUM`).
- [x] 5.3 OBLIGATORIO antes de cerrar v1: Aplicar la migración aditiva de las columnas monetarias existentes a `NUMERIC(20,8)` (tasa) y `NUMERIC(20,6)` (monto USD) usando doble escritura y verificación fila por fila. Revisar antes `trg_calcular_usd`, las vistas y el código que redondeen el USD a 2 decimales; ampliar la columna sin actualizarlos no sirve.

**Notas Adicionales de Integración**:
- Gastos anteriores al 2026-08-01 (subtipo NULL) se enviarán siempre sin subtipo (NULL) y sin cobro de comisión automática.
- La Fase 4 debe implementar un mecanismo de *idempotency key* al llamar la RPC para evitar dobles cobros si el usuario reintenta un request lento.
- Documentar en el PR 1 qué columna booleana verificada exacta fue probada (P2C/C2P=false) en comisiones_config.
- El PR 1 incluirá el dump `0000..._init.sql`. En producción, ese archivo NO DEBE CORRERSE, sino marcarse como resuelto mediante `supabase migration repair --status applied`.
- Eliminar el test de tasa a 4 decimales (Test 24 de comisiones.test.sql) al cerrar la Fase 5.
