import type { Metadata } from "next";
import { Sora, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import { AuthProvider } from "@/contexts/AuthContext";
import "./globals.css";

// La variable se sigue llamando --font-serif por compatibilidad con el resto
// del código (cientos de usos de var(--font-serif) en títulos) — aunque
// ahora carga Sora, un sans-serif geométrico, no un serif literal.
const heading = Sora({
  subsets: ["latin"], weight: ["600", "700", "800"],
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
