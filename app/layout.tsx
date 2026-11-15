import type { Metadata } from "next";
import { Schibsted_Grotesk, DM_Mono } from "next/font/google";
import { AuthProvider } from "@/contexts/AuthContext";
import "./globals.css";

// Identidad 2026: una sola familia, Schibsted Grotesk (grotesca de origen
// periodístico: compacta y firme en titulares, legible en tablas), y DM Mono
// solo para lo que de verdad es de ticket — el comprobante y los números de
// e-NCF. --font-serif se mantiene como alias (cientos de títulos lo usan) y
// ahora apunta a la misma grotesca.
const sans = Schibsted_Grotesk({
  subsets: ["latin"], weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sans", display: "swap",
});
const mono = DM_Mono({
  subsets: ["latin"], weight: ["400", "500"],
  variable: "--font-mono", display: "swap",
});

const DOMINIO = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "facturacon.com.do";

export const metadata: Metadata = {
  metadataBase: new URL(`https://${DOMINIO.split(":")[0]}`),
  title:       "Facturacon: certifícate gratis ante la DGII y factura electrónicamente",
  description: "Te guiamos por la certificación de emisor electrónico ante la DGII, es gratis, y te entregamos un sistema de facturación listo para usar.",
  openGraph: {
    title: "Facturacon: certifícate gratis ante la DGII y empieza a facturar",
    description: "Certificación de emisor electrónico gratis y sistema de facturación para negocios dominicanos.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Facturacon: certifícate gratis ante la DGII" }],
    locale: "es_DO", type: "website", siteName: "Facturacon",
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${sans.variable} ${mono.variable}`}>
      <body><AuthProvider>{children}</AuthProvider></body>
    </html>
  );
}
