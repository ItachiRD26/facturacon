import Link from "next/link";
import Logo from "@/components/ui/logo";

export default function SiteFooter() {
  return (
    <footer style={{
      background: "var(--c-navy)", color: "rgba(255,255,255,0.65)", borderTop: "1px solid rgba(255,255,255,0.12)",
      fontFamily: "var(--font-sans)", padding: "40px 24px 28px",
    }}>
      <div style={{
        maxWidth: "var(--container)", margin: "0 auto", display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 28, marginBottom: 28,
      }}>
        <div>
          <div style={{ marginBottom: 10 }}>
            <Logo tone="white" size={28} />
          </div>
          <p style={{ fontSize: 12, lineHeight: 1.5 }}>
            Certificación de emisor electrónico y sistema de facturación para contribuyentes
            dominicanos.
          </p>
        </div>

        <div>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10, color: "rgba(255,255,255,0.5)" }}>Producto</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
            <Link href="/#como-funciona" style={{ color: "inherit", textDecoration: "none" }}>Cómo funciona</Link>
            <Link href="/#precios" style={{ color: "inherit", textDecoration: "none" }}>Precios</Link>
            <Link href="/#faq" style={{ color: "inherit", textDecoration: "none" }}>Preguntas frecuentes</Link>
            <Link href="/empresas" style={{ color: "inherit", textDecoration: "none" }}>Para empresas</Link>
          </div>
        </div>

        <div>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10, color: "rgba(255,255,255,0.5)" }}>Legal</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
            <Link href="/terminos" style={{ color: "inherit", textDecoration: "none" }}>Términos de servicio</Link>
            <Link href="/privacidad" style={{ color: "inherit", textDecoration: "none" }}>Política de privacidad</Link>
          </div>
        </div>

        <div>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10, color: "rgba(255,255,255,0.5)" }}>Contacto</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
            <a href="mailto:contacto@facturacon.com.do" style={{ color: "inherit", textDecoration: "none" }}>
              contacto@facturacon.com.do
            </a>
          </div>
        </div>
      </div>

      <div style={{
        maxWidth: "var(--container)", margin: "0 auto", borderTop: "1px solid rgba(255,255,255,0.12)",
        paddingTop: 16, fontSize: 12,
      }}>
        © {new Date().getFullYear()} Facturacon. República Dominicana.
      </div>
    </footer>
  );
}
