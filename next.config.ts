import type { NextConfig } from "next";

// Cabeceras de seguridad para todas las rutas. No se pone CSP todavía: el
// sistema carga scripts de Firebase/Pagadito y una CSP mal calibrada rompería
// el login o el pago; va como tarea aparte, probada.
const CABECERAS_SEGURIDAD = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: CABECERAS_SEGURIDAD }];
  },
};

export default nextConfig;
