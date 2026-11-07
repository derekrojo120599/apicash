# Feature: Monorepo con Expo Mobile y Core Compartido

Branch: feat/monorepo-mobile
Delivery: ask-on-risk
Test runner: vitest / npm test

## Specs
S1: Crear estructura de monorepo con npm workspaces (`apps/web`, `apps/mobile`, `packages/shared`).
S2: Mover la app Next.js existente a `apps/web` preservando su funcionamiento, scripts, configs y build.
S3: Extraer lógica compartida (tipos, cálculo financiero VES/USD y utilidades comunes) a `packages/shared`.
S4: Inicializar la app mobile con Expo y TypeScript en `apps/mobile` configurada para consumir `packages/shared`.
S5: Verificar que la app mobile pueda arrancar (`npx expo start` / scripts en `apps/mobile`) y que `apps/web` mantenga su integridad.

## Tasks
- [x] T1: Reestructurar el árbol de directorios a monorepo con `apps/web`, `packages/shared` y root `package.json` con workspaces. (Route: inline)
- [x] T2: Extraer tipos y utilidades de moneda a `packages/shared` e integrarlo en `apps/web`. (Route: inline)
- [x] T3: Inicializar y configurar `apps/mobile` con Expo (React Native + TypeScript) consumiendo `packages/shared`. (Route: inline)
- [x] T4: Documentar cómo ejecutar y probar en el teléfono móvil con Expo Go y verificar build/scripts. (Route: inline)
- [x] T5: Replicar paridad 100% de UI, RPCs, animaciones nativas, dropdowns, y notificaciones instantáneas. (Route: inline)

## Log
L1: Usuario solicita: "necesito crear esta app pero en react native e irla probando en mi telefono como hago eso? ... con cual opcion me permite realizar cambios en la app y que esta se aplique tanto para web como para mobile? ... si hazlo"
L2: Monorepo estructurado con npm workspaces. Creado `packages/shared` con cálculos de dinero y comisiones. App Expo inicializada en `apps/mobile` consumiendo `@apicash/shared`. Verificados tests en `apps/web` (30/30 passed) y compilación Android de Expo.
L3: Auditoría y replicación 100% de la versión web a mobile: 10 pantallas completas, soporte multitema en tiempo real con 5 paletas de color, modo claro/oscuro, selectores AnimatedSelect con creación inline, modales de detalle y anulación/restauración de transacciones, animaciones nativas idénticas (FadeIn, AnimatedNumber, AnimatedProgressBar) y notificaciones nativas instantáneas del sistema.


