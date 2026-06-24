const negocios = [
  { emoji: "🔧", t: "Ferreterías" },
  { emoji: "💊", t: "Farmacias" },
  { emoji: "🛒", t: "Colmados y supermercados" },
  { emoji: "🍽️", t: "Restaurantes" },
  { emoji: "💇", t: "Salones y spas" },
  { emoji: "🚗", t: "Talleres mecánicos" },
  { emoji: "🩺", t: "Clínicas y consultorios" },
  { emoji: "📋", t: "Servicios profesionales" },
];

// Placeholder de imágenes con iniciales — listo para reemplazar por fotos
// reales de clientes/equipo cuando estén disponibles.
const personas = [
  { iniciales: "MR", color: "#2563eb" },
  { iniciales: "JP", color: "#16a34a" },
  { iniciales: "LD", color: "#db2777" },
  { iniciales: "CA", color: "#d97706" },
];

export default function NegociosSection() {
  return (
    <section style={{ padding: "56px 24px", maxWidth: 960, margin: "0 auto" }}>
      <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "1.6rem", textAlign: "center", marginBottom: 10 }}>
        Negocios dominicanos como el tuyo ya se están preparando
      </h2>
      <p style={{ textAlign: "center", color: "var(--c-text-3)", fontSize: 13, maxWidth: 560, margin: "0 auto 32px" }}>
        Facturacon funciona para cualquier negocio que venda productos o servicios y necesite
        facturar electrónicamente ante la DGII.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 14, marginBottom: 36 }}>
        {negocios.map((n) => (
          <div key={n.t} style={{
            display: "flex", alignItems: "center", gap: 10, padding: "12px 14px",
            background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 8, fontSize: 13,
          }}>
            <span style={{ fontSize: 18 }}>{n.emoji}</span>
            <span style={{ fontWeight: 600 }}>{n.t}</span>
          </div>
        ))}
      </div>

      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center", gap: -8,
      }}>
        <div style={{ display: "flex" }}>
          {personas.map((p, i) => (
            <div key={p.iniciales} title="Foto próximamente" style={{
              width: 44, height: 44, borderRadius: "50%", background: p.color, color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700,
              border: "3px solid var(--c-bg)", marginLeft: i === 0 ? 0 : -12,
            }}>
              {p.iniciales}
            </div>
          ))}
        </div>
        <span style={{ marginLeft: 14, fontSize: 13, color: "var(--c-text-3)" }}>
          Dueños de negocio ya en proceso de certificación
        </span>
      </div>
    </section>
  );
}
