import Link from "next/link";
import Logo from "@/components/ui/logo";
import { ETAPAS } from "@/lib/tenant/jornada";

// Marco de /login y /registro. A la izquierda (solo en pantallas anchas) el camino
// completo hasta la primera factura, con la primera etapa marcada: quien llega sabe
// qué viene y que pagar es lo último. En móvil solo queda el formulario.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", width: "100%", display: "flex", fontFamily: "var(--font-sans)" }}>
      <div className="auth-brand-panel" style={{
        flex: "1 1 460px", display: "none", position: "relative", overflow: "hidden",
        background: "var(--c-navy)", color: "#fff", padding: "48px 52px",
        flexDirection: "column", justifyContent: "space-between",
      }}>
        <div className="auth-glow" aria-hidden="true" />
        <Link href="/" style={{ position: "relative", display: "inline-flex", textDecoration: "none", width: "fit-content" }}>
          <Logo tone="white" size={30} />
        </Link>

        <div style={{ position: "relative", maxWidth: 440 }}>
          <h2 style={{ fontWeight: 800, fontSize: "clamp(1.9rem, 2.6vw, 2.5rem)", lineHeight: 1.08, letterSpacing: "-0.035em", marginBottom: 14 }}>
            Certifícate gratis ante la DGII y empieza a facturar
          </h2>
          <p style={{ fontSize: 16, lineHeight: 1.6, color: "rgba(255,255,255,0.72)", marginBottom: 34 }}>
            Esto es lo que sigue. Pagas solo al final, cuando ya estés certificado.
          </p>

          <ol style={{ listStyle: "none", display: "flex", flexDirection: "column" }}>
            {ETAPAS.map((e, i) => (
              <li key={e.id} style={{ display: "flex", gap: 16, paddingBottom: i === ETAPAS.length - 1 ? 0 : 20, position: "relative" }}>
                {i < ETAPAS.length - 1 && <span aria-hidden="true" style={{ position: "absolute", left: 13, top: 30, bottom: 2, width: 2, background: "rgba(255,255,255,0.16)" }} />}
                <span style={{
                  width: 28, height: 28, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 13, fontWeight: 800,
                  background: i === 0 ? "var(--c-ticket)" : "transparent", color: i === 0 ? "var(--c-text-1)" : "rgba(255,255,255,0.7)",
                  border: i === 0 ? "none" : "2px solid rgba(255,255,255,0.28)",
                }}>{i + 1}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15.5, color: i === 0 ? "#fff" : "rgba(255,255,255,0.86)" }}>
                    {e.titulo}{i === 0 && <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 700, color: "var(--c-ticket)" }}>Aquí empiezas</span>}
                  </div>
                  <div style={{ fontSize: 13.5, color: "rgba(255,255,255,0.6)", lineHeight: 1.45 }}>{e.detalle}</div>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div style={{ position: "relative", fontSize: 13, color: "rgba(255,255,255,0.45)" }}>
          © {new Date().getFullYear()} Facturacon · República Dominicana
        </div>
      </div>

      <div style={{
        flex: "1 1 500px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        background: "var(--c-bg)", padding: "32px 20px", gap: 22, minWidth: 0,
      }}>
        <Link href="/" className="auth-logo-movil" style={{ textDecoration: "none" }}><Logo size={30} /></Link>
        {children}
      </div>
    </div>
  );
}
