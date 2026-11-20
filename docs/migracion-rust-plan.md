# Plan de Migración de Backend a Rust (Axum)

Documento de contexto arquitectónico para continuidad de desarrollo entre estaciones de trabajo.

> **Estado: PENDIENTE / NO APROBADO.** Nada de lo descrito aquí está implementado ni decidido. Hoy **no existe servidor propio**: la aplicación funciona contra **Supabase en línea** (Postgres + RLS + RPCs + Edge Functions), y esa es la arquitectura vigente. Las secciones 2 y 4 son **propuestas sujetas a decisión**, no acuerdos. El código de `crates/` es lógica pura sin consumidor: no se ejecuta en ningún proceso ni endpoint.

## 1. Motivación y Diagnóstico
- **Estado Previo:** Arquitectura de 2 capas (BaaS). Frontend Web (Next.js) y Mobile (Expo) consultando directamente a Supabase (PostgreSQL) vía PostgREST con RLS.
- **Problemas Identificados:**
  1. Acoplamiento de la UI al esquema exacto de tablas y columnas.
  2. Lógica de negocio fragmentada o duplicada (TypeScript en cliente y PL/pgSQL en servidor).
  3. Imposibilidad de ocultar secretos o integrar APIs bancarias/exchanges privadas desde el cliente.
  4. Pérdida de precisión de números flotantes en JS (`packages/shared/src/brecha.ts`).
- **Objetivo propuesto (pendiente de decisión):** migrar a una arquitectura de 3 capas con un **Monolito Modular en Rust** usando **Axum** y **Tokio**. No aprobado.

## 2. Decisiones Técnicas Propuestas (PENDIENTES de aprobación)
Ninguna de estas decisiones está tomada. Son punto de partida de discusión, no un contrato.
- **Protocolo de comunicación:** se propone REST estándar con respuestas JSON sobre HTTPS. gRPC y WebSockets quedan sin evaluar formalmente; la hipótesis es que no hacen falta para un modelo transaccional de finanzas personales.
- **Autenticación (Fase 1):** se propone mantener Supabase Auth en los frontends y validar el JWT emitido por Supabase en Axum mediante un `Extractor` fuertemente tipado (`AuthenticatedUser(pub Claims)`), sin tocar la base de usuarios actual. No aprobado.
- **Manejo de Tasas (caché sin Cache Stampede):** se propone evitar Redis y usar caché local en memoria con `std::sync::Arc<tokio::sync::RwLock<TasasCache>>`, lecturas concurrentes inmediatas (`.read()`) y un **background worker** (`tokio::spawn`) que refresque periódicamente las cotizaciones (P2P y BCV). Los usuarios nunca ejecutan fetches externos directos. No aprobado.

## 3. Estado Actual de Código (Crates)
> **Código sin consumidor.** `crates/apicash_core` compila y pasa sus tests, pero no está integrado en ningún proceso desplegado, ni en la web, ni en la mobile. No hay servidor que lo ejecute.
- **`crates/apicash_core`**: Núcleo de lógica financiera pura (14 tests pasando):
  - `src/money.rs`: Aritmética fija exacta de 128 bits (`rust_decimal`) con estrategia `RoundHalfUp`.
  - `src/brecha.rs`: Cálculo de brecha cambiaria y análisis de conveniencia de pago.
  - `src/comisiones.rs`: Cálculo de comisiones bancarias con errores fuertemente tipados (`ComisionError` vía `thiserror`).
  - `src/credito.rs`: Cronograma de cuotas Cashea/Krece con absorción de centavos en la última cuota y límites de tarjeta.

## 4. Próximos Pasos (BLOQUEADOS)
Bloqueados hasta que se decida explícitamente tener un servidor propio. Mientras esa decisión no se tome, la aplicación sigue contra Supabase en línea y no se avanza en esta vía.
1. Crear el crate `crates/apicash_server` con `axum`, `tokio`, `serde`, `jsonwebtoken`.
2. Implementar el extractor de autenticación `AuthenticatedUser`.
3. Montar el estado compartido `AppState` con el Background Poller de tasas.
4. Conectar endpoints iniciales (`GET /api/v1/tasas`, `GET /api/v1/health`).
