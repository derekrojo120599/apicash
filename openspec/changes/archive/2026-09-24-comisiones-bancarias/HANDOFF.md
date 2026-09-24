# Handoff: Módulo de Comisiones Bancarias (BCV)

## Estado Actual
- **Fase 1 completada:** La migración SQL (\20260923000000_comisiones_bancarias.sql\) y la suite de \pgTAP\ (37 aserciones) han sido redactadas íntegramente.
- **NO ejecutada ninguna prueba:** Todo el código reside en disco. 
- **Fase 2 pendiente por entorno:** La computadora actual (Windows sin Docker Desktop activo) no tiene \docker\ disponible, bloqueando los comandos locales de Supabase.

## Acciones Pendientes (Para el próximo desarrollador/PC)
Para retomar el flujo de manera segura, debes seguir estos pasos en orden estricto:

1. **Entorno:** Asegurar que estás en una máquina con Docker funcional.
2. **Migración Base:** El usuario debe generar un dump de solo esquema (\pg_dump --schema-only --no-owner --no-privileges --schema=public\) de la base de producción y colocarlo en \supabase/migrations\ con una fecha **anterior** a \20260923000000\. *Advertencia: No subir el dump si contiene datos reales.*
3. **Arranque Local:** Ejecutar \
px supabase start\ seguido de \
px supabase db reset\ y \
px supabase test db\ **únicamente en el entorno local**.
4. **Verificación:** Revisar meticulosamente la salida completa del TAP. Si pasa, continuar a Fase 3. 

## Decisiones Críticas Tomadas
- La comisión se aplica **solo en gastos de cuentas VES**.
- Si una operación es fallida, el cargo es **estrictamente el \minimo_ves\**, y no se permite \override\.
- **Biopago**: El comercio asume el costo. La comisión para el usuario es explícitamente **0**.
- Se utiliza el redondeo **Half-Up** estándar para igualar a PostgreSQL \ROUND(..., 2)\.
- Las configuraciones de P2C y C2P se siembran con \erificada=false\ como recordatorio de auditoría pendiente del tarifario.
- Los gastos **previos al 2026-08-01** irán con subtipo \NULL\. No habrá generación de comisiones retroactivas silenciosas que alteren la historia.
- Está rotundamente **prohibido el fallback silencioso** en la UI si el nuevo RPC falla.
- La **Fase 5** es de carácter obligatorio antes de cerrar la v1: Incluye la migración doble-escritura a \NUMERIC(20,8)\ y \NUMERIC(20,6)\.

## Advertencia de Seguridad
**Bajo ningún concepto** se debe ejecutar \supabase db push\ o aplicar la migración a la base de datos de Producción en Cloud antes de que el comando \
px supabase test db\ local arroje luz verde absoluta.
