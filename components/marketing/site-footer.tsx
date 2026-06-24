import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer style={{
      borderTop: "1px solid var(--c-border)", background: "var(--c-surface)",
      fontFamily: "var(--font-sans)", padding: "40px 24px 28px",
    }}>
      <div style={{
        maxWidth: 1080, margin: "0 auto", display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 28, marginBottom: 28,
      }}>
        <div>
          <div style={{ fontFamily: "var(--font-serif)", fontSize: "1.1rem", fontWeight: 700, marginBottom: 8 }}>
            Facturacon
          </div>
          <p style={{ fontSize: 12, color: "var(--c-text-3)", lineHeight: 1.5 }}>
            Certificación de emisor electrónico y sistema de facturación para contribuyentes
            dominicanos.
          </p>
        </div>

        <div>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10, textTransform: "uppercase", color: "var(--c-text-3)" }}>Producto</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
            <a href="/#como-funciona" style={{ color: "var(--c-text-2)", textDecoration: "none" }}>Cómo funciona</a>
            <a href="/#precios" style={{ color: "var(--c-text-2)", textDecoration: "none" }}>Precios</a>
            <a href="/#faq" style={{ color: "var(--c-text-2)", textDecoration: "none" }}>Preguntas frecuentes</a>
          </div>
        </div>

        <div>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10, textTransform: "uppercase", color: "var(--c-text-3)" }}>Legal</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
            <Link href="/terminos" style={{ color: "var(--c-text-2)", textDecoration: "none" }}>Términos de servicio</Link>
            <Link href="/privacidad" style={{ color: "var(--c-text-2)", textDecoration: "none" }}>Política de privacidad</Link>
          </div>
        </div>

        <div>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10, textTransform: "uppercase", color: "var(--c-text-3)" }}>Contacto</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
            <a href="mailto:contacto@facturacon.cfd" style={{ color: "var(--c-text-2)", textDecoration: "none" }}>
              contacto@facturacon.cfd
            </a>
          </div>
        </div>
      </div>

      <div style={{
        maxWidth: 1080, margin: "0 auto", borderTop: "1px solid var(--c-border-lt)",
        paddingTop: 16, fontSize: 12, color: "var(--c-text-3)",
      }}>
        © {new Date().getFullYear()} Facturacon. República Dominicana.
      </div>
    </footer>
  );
}
