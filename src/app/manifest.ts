import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Apicash - Finanzas Personales',
    short_name: 'Apicash',
    description: 'Control de gastos, ingresos y presupuestos multimoneda en USD y VES con tasas de cambio en tiempo real.',
    start_url: '/?source=pwa',
    id: '/?source=pwa',
    scope: '/',
    display: 'standalone',
    display_override: ['fullscreen', 'standalone'],
    orientation: 'portrait',
    dir: 'ltr',
    lang: 'es',
    categories: ['finance', 'productivity', 'utilities'],
    background_color: '#020617', // slate-950 (dark immersive native splash)
    theme_color: '#020617', // slate-950 status bar on launch
    prefer_related_applications: false,
    launch_handler: {
      client_mode: ['navigate-existing', 'auto']
    },
    icons: [
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable'
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable'
      },
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any'
      }
    ],
    shortcuts: [
      {
        name: 'Transacciones',
        short_name: 'Gastos',
        description: 'Registrar o revisar ingresos y gastos',
        url: '/transacciones',
        icons: [{ src: '/icon-192x192.png', sizes: '192x192', type: 'image/png' }]
      },
      {
        name: 'Cuentas',
        short_name: 'Cuentas',
        description: 'Consultar balances y cuentas bancarias',
        url: '/cuentas',
        icons: [{ src: '/icon-192x192.png', sizes: '192x192', type: 'image/png' }]
      },
      {
        name: 'Presupuesto',
        short_name: 'Presupuesto',
        description: 'Monitorear presupuesto mensual',
        url: '/presupuesto',
        icons: [{ src: '/icon-192x192.png', sizes: '192x192', type: 'image/png' }]
      }
    ],
    screenshots: [
      {
        src: '/screenshot-desktop.png',
        sizes: '1280x720',
        type: 'image/png',
        form_factor: 'wide',
        label: 'Apicash Dashboard Desktop'
      },
      {
        src: '/screenshot-mobile.png',
        sizes: '720x1280',
        type: 'image/png',
        form_factor: 'narrow',
        label: 'Apicash Mobile View'
      }
    ]
  }
}
