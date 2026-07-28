const beneficios = [
  {
    t: "Certificación incluida",
    d: "Te guiamos y certificamos como emisor electrónico ante la DGII, sin contratar un desarrollador.",
    icon: (
      <path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z" />
    ),
  },
  {
    t: "Cumplimiento con la DGII",
    d: "Firma digital, envío de comprobantes y código QR según la normativa de e-CF vigente.",
    icon: (
      <>
        <path d="M9 12l2 2 4-4" />
        <rect x="3" y="3" width="18" height="18" rx="3" />
      </>
    ),
  },
  {
    t: "Sistema de facturación completo",
    d: "Clientes, inventario, cotizaciones, facturas e impresión — todo en un solo lugar.",
    icon: (
      <>
        <rect x="3" y="4" width="7" height="7" rx="1.2" />
        <rect x="14" y="4" width="7" height="7" rx="1.2" />
        <rect x="3" y="15" width="7" height="7" rx="1.2" />
        <rect x="14" y="15" width="7" height="7" rx="1.2" />
      </>
    ),
  },
  {
    t: "Pruébalo antes de pagar",
    d: "Entorno de prueba con datos de ejemplo y comprobantes simulados, sin compromiso.",
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M10 9l5 3-5 3V9z" />
      </>
    ),
  },
];

// Franja de 4 beneficios justo debajo del hero/mockup — mismo patrón que la
// fila de iconos al inicio de una landing típica de software de facturación
// (ver referencia de Alegra RD), pero solo con lo que Facturacon realmente
// hace hoy, sin sumar funciones que el producto no tiene (banca, nómina, etc).
export default function BeneficiosStrip() {
  return (
    <section style={{ padding: "0 24px 56px", maxWidth: 1040, margin: "0 auto" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 18 }}>
        {beneficios.map((b) => (
          <div key={b.t} style={{
            display: "flex", flexDirection: "column", gap: 12, padding: "20px 18px",
            background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 12,
          }}>
            <div style={{
              width: 38, height: 38, borderRadius: 9, background: "var(--c-brand-bg)",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="var(--c-brand)" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                {b.icon}
              </svg>
            </div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{b.t}</div>
            <div style={{ fontSize: 12.5, color: "var(--c-text-3)", lineHeight: 1.55 }}>{b.d}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
