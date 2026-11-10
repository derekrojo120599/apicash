# Feature: Evolución Contable Apicash (Crédito, Cuotas y Papelera)

Branch: feat/evolucion-contable-creditos-papelera
Delivery: ask-on-risk
Test runner: vitest / npm test

## Specs
S1: "Migración SQL en Supabase para Tarjetas de Crédito (`tarjetas_credito`), Compras a Crédito con cuotas (`compras_credito` y `cuotas_compra` tipo Cashea) y Soft-Delete en `transacciones` con soporte de papelera de 30 días."
S2: "Actualizar `@apicash/shared` con los tipos, schemas y validaciones matemáticas de Tarjetas de Crédito, Compras Financiadas y estados de cuotas."
S3: "Reglas contables en RPC: un gasto con tarjeta de crédito incrementa deuda y reduce cupo disponible sin tocar saldo líquido bancario; la compra a crédito descuenta inicial al vuelo y proyecta cuotas quincenales/mensuales."
S4: "Implementar flujo de Papelera reactiva (`/trash` / eliminados): soft-delete con reversión de saldos/presupuestos, restauración reactiva y borrado definitivo."
S5: "Añadir tests automáticos en Vitest asegurando cálculo de cuotas, precisión monetaria NUMERIC y consistencia de balances ante borrado/restauración."

## Tasks
- [x] T1: Diseñar y escribir la migración SQL `20261110000000_tarjetas_credito_cuotas_papelera.sql` en `supabase/migrations/`. (Route: inline)
- [x] T2: Integrar tipos, interfaces y utilidades en `packages/shared/src/types/` y `packages/shared/src/credito/`. (Route: inline)
- [x] T3: Extender hooks de datos y servicios en `apps/web` (`useTarjetasCredito`, `useComprasCredito`, `usePapelera`). (Route: inline)
- [x] T4: Implementar la vista y componentes de Papelera (`/trash` y modal en transacciones) en `apps/web`. (Route: inline)
- [x] T5: Crear suite de tests en Vitest para amortización de cuotas, cálculo de deuda y consistencia de papelera. (Route: inline)

## Log
L1: Usuario solicita: "vamos con todo, primero commitea, coloca un titulo facil de recordar y luego si vamos a darle con todo en la implementacion de las nuevas mejoras"
L2: Feature document creado y reflejado en Engram bajo topic 'odd/evolucion-contable-credito-papelera/tasks'. Rama de trabajo: 'feat/evolucion-contable-creditos-papelera'.
L3: Migración SQL creada con soporte para tarjetas_credito, compras_credito, cuotas_compra, soft_delete_transaccion, restaurar_transaccion y purgar_transaccion_definitiva con RLS y SECURITY DEFINER.
L4: Lógica matemática extraída en @apicash/shared con cálculo de cuotas exactas, sin pérdida de centavos y fechas periódicas.
L5: Hooks creados (useTarjetasCredito, useComprasCredito, usePapeleraTransacciones, useMoverTransaccionPapelera, useRestaurarTransaccionPapelera, useEliminarTransaccionDefinitiva).
L6: Vista de Papelera /trash creada e integrada en el flujo principal de Transacciones.
L7: Tests automáticos en Vitest pasando al 100% (39/39) y build de producción de Next.js compilado exitosamente.
