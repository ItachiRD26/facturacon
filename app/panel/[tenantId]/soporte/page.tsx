import FaqAcordeon from "@/components/panel/faq-acordeon";
import SoporteChat from "@/components/panel/soporte-chat";

const CONTACTO_EMAIL = "contacto@facturacon.cfd";

export default function SoportePage() {
  return (
    <div style={{ maxWidth: 980, margin: "0 auto", fontFamily: "var(--font-sans)" }}>
      <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "1.5rem", marginBottom: 20 }}>Soporte</h1>

      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12,
        border: "1px solid var(--c-border)", borderRadius: 8, padding: "16px 18px", marginBottom: 24,
        background: "var(--c-surface)",
      }}>
        <div style={{ fontSize: 13 }}>
          ¿No encuentras lo que buscas? Escríbenos directamente y te respondemos por correo.
        </div>
        <a href={`mailto:${CONTACTO_EMAIL}`} style={{
          fontSize: 13, fontWeight: 700, color: "#fff", background: "var(--c-brand)",
          padding: "8px 16px", borderRadius: 6, textDecoration: "none", flexShrink: 0,
        }}>
          ✉ Escribir a soporte
        </a>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20, alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Preguntas frecuentes</div>
          <FaqAcordeon />
        </div>
        <SoporteChat />
      </div>
    </div>
  );
}
