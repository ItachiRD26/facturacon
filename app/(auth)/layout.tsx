import Logo from "@/components/ui/logo";

const VALORES = [
  "Certificación de emisor electrónico guiada paso a paso",
  "Prueba el sistema completo antes de pagar nada",
  "Tu certificado y datos cifrados con Google Cloud KMS",
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", width: "100%", display: "flex", fontFamily: "var(--font-sans)" }}>
      <div style={{
        flex: "1 1 420px", display: "none", position: "relative", overflow: "hidden",
        background: "var(--gradient-hero)", padding: "56px 48px",
        flexDirection: "column", justifyContent: "space-between",
      }} className="auth-brand-panel">
        <div className="grain-overlay" />
        <div style={{
          position: "absolute", inset: 0, opacity: 0.5, pointerEvents: "none",
          background: "radial-gradient(circle at 15% 85%, rgba(255,255,255,0.10), transparent 40%)",
        }} />
        <div style={{ position: "relative" }}>
          <Logo tone="white" size={28} />
        </div>
        <div style={{ position: "relative" }}>
          <div style={{
            fontFamily: "var(--font-serif)", fontSize: "1.7rem", lineHeight: 1.3, color: "#fff",
            maxWidth: 360, marginBottom: 28,
          }}>
            Certifícate ante la DGII y factura electrónicamente sin contratar un desarrollador.
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {VALORES.map((v) => (
              <div key={v} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#5eead4", marginTop: 7, flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", lineHeight: 1.5 }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ position: "relative", fontSize: 12, color: "rgba(255,255,255,0.45)" }}>
          © {new Date().getFullYear()} Facturacon · República Dominicana
        </div>
      </div>

      <div style={{
        flex: "1 1 480px", display: "flex", alignItems: "center", justifyContent: "center",
        background: "var(--c-bg)", padding: "32px 24px",
      }}>
        {children}
      </div>
    </div>
  );
}
