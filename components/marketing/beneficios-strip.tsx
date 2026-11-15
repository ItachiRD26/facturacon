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
    d: "Clientes, inventario, cotizaciones, facturas e impresión en un solo lugar.",
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

// Los cuatro beneficios, solo con lo que Facturacon realmente hace hoy.
// Sin envoltorio de sección: lo pone <Seccion> en app/page.tsx.
export default function BeneficiosStrip() {
  return (
    <div className="cols-4">
      {beneficios.map((b) => (
        <div key={b.t} style={{
          display: "flex", flexDirection: "column", gap: 14, padding: 24,
          background: "var(--c-bg)", border: "1px solid var(--c-border-lt)", borderRadius: "var(--radius-lg)",
        }}>
          <div style={{
            width: 42, height: 42, borderRadius: 10, background: "var(--c-brand-bg)",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="var(--c-brand)" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {b.icon}
            </svg>
          </div>
          <div style={{ fontWeight: 700, fontSize: 17, letterSpacing: "-0.01em" }}>{b.t}</div>
          <div style={{ fontSize: 14.5, color: "var(--c-text-2)", lineHeight: 1.6 }}>{b.d}</div>
        </div>
      ))}
    </div>
  );
}
