import type { Metadata } from "next";
import { Libre_Bodoni, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import { AuthProvider } from "@/contexts/AuthContext";
import "./globals.css";

// Serif de alto contraste para títulos — reemplaza a Sora (sans-serif
// geométrico) para dar el carácter editorial/"bien trabajado" que pedía el
// negocio, distinto de las fuentes de IA genéricas (Inter, Space Grotesk).
// La variable se sigue llamando --font-serif por compatibilidad con el resto
// del código (cientos de usos de var(--font-serif) en títulos) — y ahora sí
// es un serif literal.
const heading = Libre_Bodoni({
  subsets: ["latin"], weight: ["500", "600", "700"],
  variable: "--font-serif", display: "swap",
});
const sans = IBM_Plex_Sans({
  subsets: ["latin"], weight: ["400", "500", "600", "700"],
  variable: "--font-sans", display: "swap",
});
const mono = IBM_Plex_Mono({
  subsets: ["latin"], weight: ["400", "600", "700"],
  variable: "--font-mono", display: "swap",
});

export const metadata: Metadata = {
  title:       "Facturacon — Facturación Electrónica como Servicio",
  description: "Certifícate como emisor electrónico ante la DGII y factura desde el día uno.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${heading.variable} ${sans.variable} ${mono.variable}`}>
      <body><AuthProvider>{children}</AuthProvider></body>
    </html>
  );
}
