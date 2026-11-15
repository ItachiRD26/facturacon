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

export default function NegociosSection() {
  return (
    <section style={{ padding: "56px 24px", maxWidth: 960, margin: "0 auto" }}>
      <h2 style={{ fontWeight: 800, fontSize: "1.9rem", textAlign: "center", marginBottom: 10 }}>
        Hecho para el negocio dominicano de todos los días
      </h2>
      <p style={{ textAlign: "center", color: "var(--c-text-3)", fontSize: 13, maxWidth: 560, margin: "0 auto 32px" }}>
        Facturacon funciona para cualquier negocio que venda productos o servicios y necesite
        facturar electrónicamente ante la DGII.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 14, marginBottom: 0 }}>
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
    </section>
  );
}
