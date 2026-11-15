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

// Garantías verificables sobre seguridad y cumplimiento (en lugar de cifras de
// clientes o testimonios, que todavía no existen). Sin envoltorio de sección.
export default function TrustStrip() {
  return (
    <div className="cols-3">
      {items.map((it) => (
        <div key={it.t} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
          <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="var(--c-brand)" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }} aria-hidden="true">
            {it.icon}
          </svg>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{it.t}</div>
            <div style={{ fontSize: 14.5, color: "var(--c-text-2)", lineHeight: 1.6 }}>{it.d}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
