import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer style={{
      background: "var(--c-navy)", color: "rgba(255,255,255,0.65)",
      fontFamily: "var(--font-sans)", padding: "40px 24px 28px",
    }}>
      <div style={{
        maxWidth: 1080, margin: "0 auto", display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 28, marginBottom: 28,
      }}>
        <div>
          <div style={{ fontFamily: "var(--font-serif)", fontSize: "1.1rem", fontWeight: 700, marginBottom: 8, color: "#fff" }}>
            Facturacon
          </div>
          <p style={{ fontSize: 12, lineHeight: 1.5 }}>
            Certificación de emisor electrónico y sistema de facturación para contribuyentes
            dominicanos.
          </p>
        </div>

        <div>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10, textTransform: "uppercase", color: "rgba(255,255,255,0.45)" }}>Producto</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
            <a href="/#como-funciona" style={{ color: "inherit", textDecoration: "none" }}>Cómo funciona</a>
            <a href="/#precios" style={{ color: "inherit", textDecoration: "none" }}>Precios</a>
            <a href="/#faq" style={{ color: "inherit", textDecoration: "none" }}>Preguntas frecuentes</a>
          </div>
        </div>

        <div>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10, textTransform: "uppercase", color: "rgba(255,255,255,0.45)" }}>Legal</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
            <Link href="/terminos" style={{ color: "inherit", textDecoration: "none" }}>Términos de servicio</Link>
            <Link href="/privacidad" style={{ color: "inherit", textDecoration: "none" }}>Política de privacidad</Link>
          </div>
        </div>

        <div>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10, textTransform: "uppercase", color: "rgba(255,255,255,0.45)" }}>Contacto</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
            <a href="mailto:contacto@facturacon.cfd" style={{ color: "inherit", textDecoration: "none" }}>
              contacto@facturacon.cfd
            </a>
          </div>
        </div>
      </div>

      <div style={{
        maxWidth: 1080, margin: "0 auto", borderTop: "1px solid rgba(255,255,255,0.12)",
        paddingTop: 16, fontSize: 12,
      }}>
        © {new Date().getFullYear()} Facturacon. República Dominicana.
      </div>
    </footer>
  );
}
