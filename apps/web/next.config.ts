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

// Build-identifiable version: package version + build date, so each deploy
// shows a distinct value in Perfil without manual bumps.
const appVersion = `${process.env.npm_package_version ?? "0.0.0"} - build ${new Date()
  .toISOString()
  .slice(0, 10)}`;

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: appVersion,
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts"],
  },
};

export default withPWA(nextConfig);
