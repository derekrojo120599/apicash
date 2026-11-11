# Plan de Migración de Backend a Rust (Axum)

Documento de contexto arquitectónico para continuidad de desarrollo entre estaciones de trabajo.

## 1. Motivación y Diagnóstico
- **Estado Previo:** Arquitectura de 2 capas (BaaS). Frontend Web (Next.js) y Mobile (Expo) consultando directamente a Supabase (PostgreSQL) vía PostgREST con RLS.
- **Problemas Identificados:**
  1. Acoplamiento de la UI al esquema exacto de tablas y columnas.
  2. Lógica de negocio fragmentada o duplicada (TypeScript en cliente y PL/pgSQL en servidor).
  3. Imposibilidad de ocultar secretos o integrar APIs bancarias/exchanges privadas desde el cliente.
  4. Pérdida de precisión de números flotantes en JS (`packages/shared/src/brecha.ts`).
- **Objetivo:** Migrar a una arquitectura profesional de 3 capas con un **Monolito Modular en Rust** usando **Axum** y **Tokio**.

## 2. Decisiones Técnicas Acordadas
- **Protocolo de comunicación:** REST estándar con respuestas JSON sobre HTTPS. Descartados gRPC y WebSockets (innecesarios para el modelo transaccional de finanzas personales).
- **Autenticación (Fase 1):** Mantener Supabase Auth en los frontends. El backend en Axum valida el JWT emitido por Supabase usando un `Extractor` fuertemente tipado (`AuthenticatedUser(pub Claims)`), sin tocar la base de usuarios actual.
- **Manejo de Tasas (Caché sin Cache Stampede):**
  - No se usa Redis para evitar dependencias innecesarias de infraestructura.
  - Caché local en memoria con `std::sync::Arc<tokio::sync::RwLock<TasasCache>>`.
  - Las lecturas de los usuarios son concurrentes e inmediatas (`.read()`).
  - Un **Background Worker** (`tokio::spawn`) refresca periódicamente las cotizaciones (P2P y BCV). Los usuarios nunca ejecutan fetches externos directos.

## 3. Estado Actual de Código (Crates)
- **`crates/apicash_core`**: Núcleo de lógica financiera pura (14 tests pasando):
  - `src/money.rs`: Aritmética fija exacta de 128 bits (`rust_decimal`) con estrategia `RoundHalfUp`.
  - `src/brecha.rs`: Cálculo de brecha cambiaria y análisis de conveniencia de pago.
  - `src/comisiones.rs`: Cálculo de comisiones bancarias con errores fuertemente tipados (`ComisionError` vía `thiserror`).
  - `src/credito.rs`: Cronograma de cuotas Cashea/Krece con absorción de centavos en la última cuota y límites de tarjeta.

## 4. Próximos Pasos al Retomar
1. Crear el crate `crates/apicash_server` con `axum`, `tokio`, `serde`, `jsonwebtoken`.
2. Implementar el extractor de autenticación `AuthenticatedUser`.
3. Montar el estado compartido `AppState` con el Background Poller de tasas.
4. Conectar endpoints iniciales (`GET /api/v1/tasas`, `GET /api/v1/health`).
