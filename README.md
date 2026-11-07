# Apicash — Monorepo (Web & Mobile)

Aplicación de gestión de finanzas personales en USD y VES (bolívares venezolanos).

## Estructura del Proyecto

```text
apicash/
├── apps/
│   ├── web/          # Aplicación Next.js 16 (App Router, Tailwind CSS, PWA)
│   └── mobile/       # Aplicación React Native con Expo 58 y TypeScript
├── packages/
│   └── shared/       # Lógica compartida: utilidades de dinero (NUMERIC 18,2/4), cálculos VES/USD, comisiones y tipos
└── odd/              # Registro de tareas y especificaciones ODD
```

## Requisitos

- Node.js 20+ (recomendado Node 22+)
- npm 10+
- Teléfono móvil con la app **Expo Go** instalada (Android o iOS)

## Cómo empezar

### 1. Instalar dependencias
Desde la raíz del monorepo:
```bash
npm install
```

### 2. Probar la app en tu teléfono móvil (React Native / Expo)
1. Instala la app **Expo Go** en tu teléfono (disponible gratis en Google Play Store y Apple App Store).
2. Asegúrate de que tu teléfono y tu PC estén conectados a la **misma red Wi-Fi**.
3. Inicia el servidor de desarrollo de la app mobile:
   ```bash
   npm run dev:mobile
   # O directamente:
   cd apps/mobile && npx expo start
   ```
4. Se mostrará un código QR en tu terminal.
   - En **Android**: abre la app Expo Go y toca "Scan QR code".
   - En **iOS**: abre la app Cámara nativa y escanea el código QR para abrir Expo Go.
5. Los cambios que hagas en `apps/mobile/App.tsx` o en `packages/shared/` se recargarán automáticamente en tu teléfono.

### 3. Ejecutar la app Web (Next.js)
```bash
npm run dev:web
# O directamente:
cd apps/web && npm run dev
```
Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

### 4. Tests y Validación
```bash
npm test
```
Ejecuta las pruebas unitarias y de integración del monorepo.
