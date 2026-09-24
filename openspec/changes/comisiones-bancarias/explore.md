## Exploration: módulo de comisiones bancarias (BCV) + precisión monetaria

### Current State
Currently, Apicasch handles money using `NUMERIC` types in the Supabase schema and simple math in the UI. 
Transactions are inserted individually directly via client-side Supabase SDK calls (or Edge functions). 
There is no automated tracking of bank commissions (like Pago Móvil fees or POS fees), forcing users to manually calculate and add commissions as separate expenses or bake them into the transaction amount.

### Affected Areas
- `esquema-supabase.md` — Schema changes needed for `comisiones_config` and new columns in `transacciones`.
- `src/utils/supabase/` — New RPC needed for atomic transaction insertions.
- `lib/money.ts` (New) — Centralized `decimal.js` logic for precise monetary math.
- `src/hooks/useTransacciones.ts` — Updated to use the new RPC and money calculations.
- `src/app/(main)/transacciones/` & `src/app/(main)/dashboard/` — UI to show/edit commissions and topes.

### Approaches
1. **Implicit Commissions (Current/Manual)** — Users keep adding them manually.
   - Pros: No schema changes.
   - Cons: Error-prone, hard to track total fees, UI is cumbersome.
   - Effort: Low
2. **Explicit Atomic Commissions via RPC** (Recommended) — A new `comisiones_config` table holds percentages and limits. A pure TS function `calcularComision` computes the exact fee. The UI shows it live. On submission, an RPC inserts the parent transaction and the commission transaction atomically.
   - Pros: Accurate fee tracking, centralized precision (`decimal.js`), great UX, DB-level consistency.
   - Cons: Requires Zero Downtime Migration, new RPC.
   - Effort: High

### Recommendation
Proceed with Option 2 (Explicit Atomic Commissions via RPC). Use `decimal.js` on the client for precision and `NUMERIC(18,2)`/`NUMERIC(18,4)` in the database. Introduce `comisiones_config` per user and alter `transacciones` in an additive ZDT manner.

### Risks
- Floating point precision issues if `decimal.js` is not applied uniformly on the client.
- ZDT Migration could lock the `transacciones` table if not careful.

### Ready for Proposal
Yes. Proceeding to draft `proposal.md`.
