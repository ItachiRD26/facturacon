import Link from "next/link";
import Logo from "@/components/ui/logo";
import { registroAbierto } from "@/lib/registro";

// Header fijo en tinta: continúa el hero oscuro y se mantiene igual de claro
// sobre cualquier sección. Altura fija (--header-h) para calcular el hero.
const enlace = { color: "rgba(255,255,255,0.78)", textDecoration: "none" } as const;

export default function SiteHeader() {
  return (
    <header className="site-header" style={{
      position: "sticky", top: 0, zIndex: 40, background: "var(--c-navy)",
      borderBottom: "1px solid rgba(255,255,255,0.1)", fontFamily: "var(--font-sans)",
    }}>
      <div style={{
        maxWidth: "var(--container)", margin: "0 auto", padding: "0 24px", height: "var(--header-h)",
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
      }}>
        <Link href="/" style={{ textDecoration: "none", display: "flex" }}>
          <Logo tone="white" size={30} />
        </Link>

        <nav style={{ display: "flex", alignItems: "center", gap: 22, fontSize: 14.5, flexWrap: "wrap" }}>
          <Link className="nav-secundaria" href="/#incluye" style={enlace}>Qué incluye</Link>
          <Link className="nav-secundaria" href="/#como-funciona" style={enlace}>Cómo funciona</Link>
          <Link className="nav-secundaria" href="/#precios" style={enlace}>Precios</Link>
          <Link className="nav-secundaria" href="/#faq" style={enlace}>Preguntas</Link>
          <Link href="/login" style={{ ...enlace, color: "#fff", fontWeight: 600 }}>Iniciar sesión</Link>
          <Link href="/registro" className="btn-ticket" style={{
            padding: "9px 16px", borderRadius: "var(--radius-md)", fontWeight: 700, textDecoration: "none",
          }}>
            {registroAbierto() ? "Crear cuenta" : "Lista de espera"}
          </Link>
        </nav>
      </div>
    </header>
  );
}
