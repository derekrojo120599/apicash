import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "@/components/providers";
import { PwaUpdater } from "@/components/PwaUpdater";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { SplashScreenClient as SplashScreen } from "@/components/SplashScreenClient";

import { createClient } from "@/utils/supabase/server";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Apicash",
  description: "Apicash - Control de gastos en USD y VES",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/apicash.svg",
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Apicash",
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#020617",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let theme = 'emerald';
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: perfil } = await supabase.from('perfiles').select('tema').eq('id', user.id).single();
      if (perfil?.tema) {
        theme = perfil.tema;
      }
    }
  } catch (error) {
    console.error("Error fetching theme:", error);
  }

  return (
    <html
      lang="es"
      suppressHydrationWarning
      data-theme={theme}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Apicash" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                // Sincronizar cache local con el del servidor por si acaso
                localStorage.setItem('apicash-theme', '${theme}');
                if (sessionStorage.getItem('apicash_splash_shown')) {
                  document.documentElement.classList.add('splash-hidden');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
        <SplashScreen />
        <ToastProvider>
          <Providers>
            {children}
            <PwaUpdater />
          </Providers>
        </ToastProvider>
      </body>
    </html>
  );
}
