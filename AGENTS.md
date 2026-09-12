# Apicasch — Contexto para Agentes de IA

Aplicación web de **gestión de finanzas personales** para usuarios que operan principalmente en **USD y VES (bolívares venezolanos)**.

## Stack tecnológico

- **Framework:** Next.js 16.3.4 con App Router (`src/app/`)
- **UI:** React 19.2.8, TypeScript 5, Tailwind CSS v4, Geist font
- **Backend/Auth/DB:** Supabase (`@supabase/ssr`, `@supabase/supabase-js`)
- **Cliente de datos:** React Query (`@tanstack/react-query`)
- **Gráficos:** Recharts
- **Animaciones:** animejs v4
- **Iconos:** lucide-react
- **PWA:** `@ducanh2912/next-pwa` con service worker en `public/`
- **Lint:** ESLint 9 + `eslint-config-next`
- **Despliegue:** Netlify (`netlify.toml`)

## Estructura del proyecto

```
src/
  app/
    (auth)/          → login, register
    (main)/          → ahorros, categorias, cuentas, deudas, guia,
                       perfil, presupuesto, privacidad, terminos, transacciones
  components/        → UI + animaciones
  hooks/             → useTransacciones, useCuentas, useDashboard, etc.
  utils/supabase/    → cliente/servidor de Supabase
public/              → assets PWA
supabase/            → edge functions (ej. update-exchange-rate)
esquema-supabase.md  → esquema completo de BD, RLS, triggers y funciones RPC
```

## Reglas de negocio críticas

### Dinero
- **Todo el dinero se almacena como `NUMERIC(18,2)` o `NUMERIC(18,4)`** — nunca `FLOAT`/`REAL`.
- `moneda_enum` solo admite `'USD'` y `'VES'`.
- Cada transacción en VES requiere `tasa_al_momento` (constraint `tasa_requerida_si_ves`).
- `monto_usd_calculado` se guarda en la transacción para reportes consistentes.

### Tasas de cambio
- La fuente preferida por defecto es **Cotizave API - Mediana P2P**.
- Edge function en `supabase/functions/update-exchange-rate` actualiza la tabla `tasas_cambio`.
- El perfil del usuario guarda `fuente_tasa_preferida`.

### Seguridad
- Todas las tablas tienen **RLS habilitado**.
- Las políticas siguen el patrón `auth.uid() = user_id`.
- Los snapshots mensuales son solo lectura para el cliente; se escriben vía función `SECURITY DEFINER`.
- El service_role es el único que inserta en `tasas_cambio`.

### Onboarding
- El perfil tiene `onboarding_completado BOOLEAN`.
- El tema por defecto es `emerald`.

## Convenciones de código

- TypeScript estricto; evitar `any`.
- Componentes funcionales con hooks; preferir Server Components cuando no se necesite interactividad.
- Hooks de datos van en `src/hooks/` y usan React Query.
- Cliente Supabase en `src/utils/supabase/` (cliente browser + servidor).
- Estilos con Tailwind v4; no crear archivos CSS adicionales salvo necesidad.
- UI copy visible al usuario en **español** (la app es en español).
- Identificadores, nombres de archivos y comentarios técnicos en **inglés**.

## Flujos principales

1. **Cuentas** → el usuario crea cuentas en USD/VES (banco, efectivo, exchange, billetera_digital).
2. **Transacciones** → ingresos, gastos, transferencias y ajustes; afectan `saldo_cache` de la cuenta.
3. **Categorías** → clasifican transacciones y presupuestos.
4. **Presupuestos** → monto planeado por categoría y mes.
5. **Deudas / Metas** → seguimiento de saldos pendientes y objetivos de ahorro.
6. **Dashboard / Snapshots** → cierre mensual con tasa de cambio y balance neto.

## Archivos de referencia obligatorios

Antes de tocar lógica de datos, leer:
- `esquema-supabase.md`
- `src/utils/supabase/client.ts`
- `src/utils/supabase/server.ts`
- `src/hooks/useTransacciones.ts` y `src/hooks/useCuentas.ts`

## Variables de entorno

El proyecto usa `.env.local`. Nunca commitear secrets. El agente debe:
- Leer `.env.local` solo cuando sea necesario.
- No modificar ni exponer `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, etc.

## Integración con Gentle-AI

Este proyecto usa la configuración workspace de Gentle-AI para OpenCode ubicada en `.config/opencode/`.
- Para funcionalidades grandes o ambiguas, decir *"usa SDD"* inicia el flujo Spec-Driven Development.
- La memoria persistente (Engram) guarda decisiones de arquitectura, convenciones y bugs resueltos.
- Context7 provee documentación actualizada de Next.js, React, Tailwind y Supabase.

## Comandos útiles

```bash
npm run dev       # desarrollo
npm run build     # build de producción
npm run lint      # lint con ESLint
```
