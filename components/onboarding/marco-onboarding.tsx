import type { ReactNode } from "react";
import Link from "next/link";
import Logo from "@/components/ui/logo";
import LogoutButton from "@/components/panel/logout-button";
import JornadaProgreso from "@/components/panel/jornada-progreso";
import type { EtapaId } from "@/lib/tenant/jornada";

// Marco común de las pantallas del camino (empresa, requisitos, credenciales…):
// logo y "Cerrar sesión" arriba, la barra de las 5 etapas y una tarjeta con el
// contenido. Antes cada pantalla flotaba suelta sobre el fondo con su propio estilo.
export default function MarcoOnboarding({ etapa, children, ancho = 640 }: { etapa: EtapaId; children: ReactNode; ancho?: number }) {
  return (
    <div style={{ minHeight: "100vh", background: "var(--c-bg)", fontFamily: "var(--font-sans), system-ui, sans-serif" }}>
      <header style={{ maxWidth: ancho + 40, margin: "0 auto", padding: "18px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link href="/" aria-label="Facturacon, inicio" style={{ textDecoration: "none" }}><Logo size={28} /></Link>
        <LogoutButton />
      </header>
      <main style={{ maxWidth: ancho + 40, margin: "0 auto", padding: "8px 20px 72px" }}>
        <div style={{ marginBottom: 20 }}><JornadaProgreso actual={etapa} compacta /></div>
        <div style={{
          background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 18,
          padding: "clamp(22px, 5vw, 40px)", boxShadow: "var(--shadow-md)",
        }}>
          {children}
        </div>
      </main>
    </div>
  );
}
