import Link from "next/link";
import Logo from "@/components/ui/logo";
import { registroAbierto } from "@/lib/registro";

export default function SiteHeader() {
  return (
    <header style={{
      position: "sticky", top: 0, zIndex: 40, background: "var(--c-bg)",
      borderBottom: "1px solid var(--c-border)", fontFamily: "var(--font-sans)",
    }}>
      <div style={{
        maxWidth: "var(--container)", margin: "0 auto", padding: "0 24px", height: "var(--header-h)",
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
      }}>
        <Link href="/" style={{ textDecoration: "none", display: "flex" }}>
          <Logo size={30} />
        </Link>

        <nav style={{ display: "flex", alignItems: "center", gap: 20, fontSize: 14, flexWrap: "wrap" }}>
          <Link className="nav-secundaria" href="/#como-funciona" style={{ color: "var(--c-text-2)", textDecoration: "none" }}>Cómo funciona</Link>
          <Link className="nav-secundaria" href="/#precios" style={{ color: "var(--c-text-2)", textDecoration: "none" }}>Precios</Link>
          <Link className="nav-secundaria" href="/#faq" style={{ color: "var(--c-text-2)", textDecoration: "none" }}>Preguntas frecuentes</Link>
          <Link href="/login" style={{ color: "var(--c-text-2)", textDecoration: "none", fontWeight: 600 }}>
            Iniciar sesión
          </Link>
          <Link href="/registro" style={{
            padding: "9px 16px", background: "var(--c-navy)", color: "#fff",
            borderRadius: "var(--radius-md)", fontWeight: 700, textDecoration: "none",
          }}>
            {registroAbierto() ? "Crear cuenta" : "Lista de espera"}
          </Link>
        </nav>
      </div>
    </header>
  );
}
