# Especificación Técnica: Implementación de Web Push Notifications en Apicash

Este documento sirve como guía técnica y hoja de ruta para implementar **Notificaciones Push Web (Web Push API)** en Apicash (Next.js 16 + Supabase + `@ducanh2912/next-pwa`).

---

## 1. Arquitectura General

```
[Usuario / Dispositivo] 
   │  (1) Solicita permiso -> Recibe PushSubscription (Endpoint + Keys)
   ▼
[Frontend Apicash (React/Next.js)]
   │  (2) Guarda la suscripción en Supabase vinculada al auth.uid()
   ▼
[Base de Datos Supabase (tabla: suscripciones_push)]
   ▲
   │  (3) Edge Function o Trigger genera evento (ej. alerta de presupuesto, deuda o tasa)
[Supabase Edge Functions / Cron]
   │  (4) Envía payload encriptado usando VAPID Keys a Apple/Google Push Services
   ▼
[Apple / Google Push Service] ──▶ [Dispositivo Móvil (Service Worker: `sw.js`)]
                                        │ (5) `self.registration.showNotification()`
                                        ▼
                                  [Notificación en Barra de Estado]
```

---

## 2. Requisitos Previos

1. **Par de llaves VAPID (Voluntary Application Server Identification):**
   - Generar con `npx web-push generate-vapid-keys`.
   - `NEXT_PUBLIC_VAPID_PUBLIC_KEY`: Variable pública para el frontend.
   - `VAPID_PRIVATE_KEY`: Variable secreta configurada en Supabase Edge Functions Secrets.
   - `VAPID_SUBJECT`: Email de contacto (ej. `mailto:admin@apicash.app`).

2. **Compatibilidad:**
   - **Android:** Soporte nativo en Chrome, Brave, Edge, Samsung Browser.
   - **iOS (iPhone/iPad):** Requiere **iOS 16.4+** y que la app esté instalada como PWA en la pantalla de inicio (ya implementado y soportado).

---

## 3. Modelo de Datos en Supabase (SQL Migration)

Crear una tabla para almacenar las suscripciones activas por usuario:

```sql
CREATE TABLE public.suscripciones_push (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    user_agent TEXT,
    creado_en TIMESTAMPTZ DEFAULT now(),
    actualizado_en TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.suscripciones_push ENABLE ROW LEVEL SECURITY;

-- Políticas RLS: Cada usuario administra únicamente sus dispositivos
CREATE POLICY "Usuarios pueden insertar sus suscripciones"
    ON public.suscripciones_push FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuarios pueden ver sus suscripciones"
    ON public.suscripciones_push FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Usuarios pueden eliminar sus suscripciones"
    ON public.suscripciones_push FOR DELETE
    USING (auth.uid() = user_id);

-- Índices para búsqueda rápida
CREATE INDEX idx_suscripciones_push_user ON public.suscripciones_push(user_id);
```

---

## 4. Implementación en Frontend (Cliente)

### 4.1 Utilidad para convertir la clave VAPID (`src/utils/push.ts`)
```typescript
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
```

### 4.2 Hook para suscribirse (`src/hooks/usePushNotifications.ts`)
```typescript
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { urlBase64ToUint8Array } from '@/utils/push';

export function usePushNotifications() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const supabase = createClient();

  useEffect(() => {
    if ('Notification' in window && 'serviceWorker' in navigator) {
      setPermission(Notification.permission);
      navigator.serviceWorker.ready.then((reg) => {
        reg.pushManager.getSubscription().then((sub) => {
          setIsSubscribed(!!sub);
        });
      });
    }
  }, []);

  const subscribe = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      throw new Error('Notificaciones no soportadas en este navegador.');
    }

    const registration = await navigator.serviceWorker.ready;
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey) throw new Error('VAPID Public Key no configurada.');

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey)
    });

    const subJson = subscription.toJSON();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Usuario no autenticado.');

    // Guardar en Supabase
    await supabase.from('suscripciones_push').upsert({
      user_id: user.id,
      endpoint: subscription.endpoint,
      p256dh: subJson.keys?.p256dh || '',
      auth: subJson.keys?.auth || '',
      user_agent: navigator.userAgent
    }, { onConflict: 'endpoint' });

    setIsSubscribed(true);
    setPermission(Notification.permission);
  };

  return { isSubscribed, permission, subscribe };
}
```

---

## 5. Modificación en el Service Worker (`public/sw-push.js` o extensión de Workbox)

El Service Worker debe escuchar los eventos `push` y `notificationclick`:

```javascript
self.addEventListener('push', function (event) {
  if (!event.data) return;

  const payload = event.data.json();
  const title = payload.title || 'Apicash';
  const options = {
    body: payload.body || 'Tienes una nueva actualización en tus finanzas.',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    data: {
      url: payload.url || '/'
    },
    vibrate: [100, 50, 100],
    actions: payload.actions || []
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
```

---

## 6. Envío desde Backend (Supabase Edge Function: `send-push`)

Crear una función Deno en `supabase/functions/send-push/index.ts`:

```typescript
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import webpush from "npm:web-push@3.6.7";

webpush.setVapidDetails(
  Deno.env.get("VAPID_SUBJECT") || "mailto:soporte@apicash.app",
  Deno.env.get("VAPID_PUBLIC_KEY")!,
  Deno.env.get("VAPID_PRIVATE_KEY")!
);

Deno.serve(async (req) => {
  const { userId, title, body, url } = await req.json();

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: subs, error } = await supabase
    .from("suscripciones_push")
    .select("endpoint, p256dh, auth")
    .eq("user_id", userId);

  if (error || !subs || subs.length === 0) {
    return new Response(JSON.stringify({ sent: 0, message: "No active subscriptions" }), { status: 200 });
  }

  const payload = JSON.stringify({ title, body, url: url || "/" });

  const sendPromises = subs.map(async (sub) => {
    try {
      await webpush.sendNotification({
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth }
      }, payload);
    } catch (err: any) {
      if (err.statusCode === 404 || err.statusCode === 410) {
        // Suscripción caducada o eliminada por el navegador
        await supabase.from("suscripciones_push").delete().eq("endpoint", sub.endpoint);
      }
    }
  });

  await Promise.allSettled(sendPromises);

  return new Response(JSON.stringify({ success: true, count: subs.length }), {
    headers: { "Content-Type": "application/json" }
  });
});
```

---

## 7. Casos de Uso Recomendados para Apicash

1. **Alerta de Presupuesto Excedido:**
   - **Trigger:** Tras registrar una transacción en `useTransacciones` si el acumulado supera el `monto_limite` de la categoría.
   - **Mensaje:** *"⚠️ Atención: Has alcanzado el 90% de tu presupuesto en Alimentación."*

2. **Vencimiento de Deudas / Cobros:**
   - **Trigger:** Cron diario en Supabase evaluando `deudas` donde `fecha_vencimiento = CURRENT_DATE + INTERVAL '1 day'`.
   - **Mensaje:** *"📅 Recordatorio: Mañana vence el compromiso con Carlos por $20.00."*

3. **Alerta de Cambio de Tasa BCV:**
   - **Trigger:** Al finalizar la Edge Function `update-exchange-rate` si la tasa varió más del 1%.
   - **Mensaje:** *"💵 Nueva tasa oficial BCV: 64.80 VES/USD."*

---

## 8. Pasos para la IA que implemente esta funcionalidad:

1. Ejecutar migración SQL para crear `public.suscripciones_push`.
2. Generar las VAPID Keys y agregarlas en `.env.local` y los secrets de Supabase.
3. Crear el hook `usePushNotifications` y agregar un interruptor en la sección de **Perfil / Ajustes**.
4. Extender el Service Worker (`public/sw.js`) con los listeners de `push` y `notificationclick`.
5. Crear la Edge Function `send-push` y conectarla con los triggers de base de datos o hooks de la app.
