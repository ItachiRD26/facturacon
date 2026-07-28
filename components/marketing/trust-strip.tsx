const items = [
  {
    t: "Tu certificado, cifrado",
    d: "El .p12 de tu firma digital se cifra con Google Cloud KMS — nunca queda en texto plano.",
    icon: (
      <>
        <rect x="5" y="11" width="14" height="9" rx="2" />
        <path d="M8 11V7a4 4 0 018 0v4" />
      </>
    ),
  },
  {
    t: "Firma validada por la DGII",
    d: "Cada comprobante se firma y envía siguiendo la normativa vigente de e-CF.",
    icon: (
      <>
        <path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z" />
        <path d="M9 12l2 2 4-4" />
      </>
    ),
  },
  {
    t: "Tus datos, solo tuyos",
    d: "Cada empresa tiene su propio espacio aislado — nadie más puede ver tus facturas o clientes.",
    icon: (
      <>
        <rect x="3" y="7" width="18" height="13" rx="2" />
        <path d="M7 7V5a2 2 0 012-2h6a2 2 0 012 2v2" />
      </>
    ),
  },
];

// Franja de confianza: ocupa el lugar que en muchas landings de software de
// facturación lleva una barra de estadísticas ("+50,000 empresas...") o
// testimonios. Facturacon todavía no tiene esos datos, así que en su lugar
// se muestran garantías verificables sobre seguridad y cumplimiento — nada
// que no se pueda sostener hoy mismo.
export default function TrustStrip() {
  return (
    <section style={{ padding: "0 24px 64px", maxWidth: 960, margin: "0 auto" }}>
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 24,
        padding: "32px 28px", background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 14,
      }}>
        {items.map((it) => (
          <div key={it.t} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
            <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="var(--c-brand)" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}>
              {it.icon}
            </svg>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 4 }}>{it.t}</div>
              <div style={{ fontSize: 12.5, color: "var(--c-text-3)", lineHeight: 1.55 }}>{it.d}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
