# Probando la PWA en modo Standalone

Para asegurar que Apicash se instale como una aplicación nativa (sin la barra del navegador):

1. **Construir para producción**
   Asegúrate de ejecutar el entorno de producción, ya que la PWA y su Service Worker generalmente están desactivados o limitados en modo desarrollo.
   ```bash
   npm run build
   npm run start
   ```

2. **Acceder vía HTTPS (o localhost)**
   Abre tu navegador (Chrome, Safari, Edge) y ve a `http://localhost:3000` (los navegadores permiten PWAs en localhost) o a tu URL en producción vía `https://`.

3. **Instalar la PWA**
   - **En Chrome (Desktop):** Haz clic en el ícono de instalación que aparece en la barra de direcciones (a la derecha).
   - **En Chrome (Android):** Usa la opción "Añadir a la pantalla de inicio" del menú de los 3 puntos.
   - **En Safari (iOS):** Toca el botón de Compartir y selecciona "Añadir a la pantalla de inicio".

4. **Verificar el modo Standalone**
   Cierra el navegador y **abre Apicash desde el ícono nuevo en tu pantalla de inicio o escritorio**.
   La app debe abrirse en su propia ventana, sin barra de direcciones URL ni botones de navegación del navegador (back/forward). 

---

**Nota Técnica de los Cambios Realizados:**
- `start_url` explícito en `src/app/manifest.ts` configurado a `/?source=pwa`.
- Archivos de íconos separados para propósitos `any` y `maskable`.
- Referencia explícita en `src/app/layout.tsx` a `manifest: "/manifest.webmanifest"`.
- Atributos `appleWebApp` configurados en la metadata de Next.js.
- Service Worker generado correctamente por `@ducanh2912/next-pwa`.