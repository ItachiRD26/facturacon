import Link from "next/link";
import Logo from "@/components/ui/logo";

export default function SiteHeader() {
  return (
    <header style={{
      position: "sticky", top: 0, zIndex: 40, background: "var(--c-surface)",
      borderBottom: "1px solid var(--c-border)", fontFamily: "var(--font-sans)",
    }}>
      <div style={{
        maxWidth: 1080, margin: "0 auto", padding: "14px 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
      }}>
        <Link href="/" style={{ textDecoration: "none", display: "flex" }}>
          <Logo size={26} />
        </Link>

        <nav style={{ display: "flex", alignItems: "center", gap: 20, fontSize: 13, flexWrap: "wrap" }}>
          <a href="/#como-funciona" style={{ color: "var(--c-text-2)", textDecoration: "none" }}>Cómo funciona</a>
          <a href="/#precios" style={{ color: "var(--c-text-2)", textDecoration: "none" }}>Precios</a>
          <a href="/#faq" style={{ color: "var(--c-text-2)", textDecoration: "none" }}>Preguntas frecuentes</a>
          <Link href="/login" style={{ color: "var(--c-text-2)", textDecoration: "none", fontWeight: 600 }}>
            Iniciar sesión
          </Link>
          <Link href="/registro" style={{
            padding: "8px 16px", background: "var(--gradient-hero)", color: "#fff",
            borderRadius: 6, fontWeight: 600, textDecoration: "none",
          }}>
            Crear cuenta
          </Link>
        </nav>
      </div>
    </header>
  );
}
