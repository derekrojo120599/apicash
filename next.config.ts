import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  // Fundamental: No cachear NUNCA las peticiones a Supabase
  workboxOptions: {
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/jkoxmyefjmokdycjlfqb\.supabase\.co\/.*/i,
        handler: "NetworkOnly",
        options: {
          cacheName: "supabase-api-bypass",
        },
      },
      // Configuración estándar para el resto (imágenes, scripts, etc. se manejan por defecto)
    ],
  },
});

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: process.env.npm_package_version,
  },
};

export default withPWA(nextConfig);
