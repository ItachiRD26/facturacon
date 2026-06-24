import { fmt } from "@/types";

const sans = "var(--font-sans)";
const serif = "var(--font-serif)";

export default async function DemoComprobantePage({
  searchParams,
}: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const monto = parseFloat(sp.monto ?? "0");

  return (
    <main style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "var(--c-bg)", fontFamily: sans, padding: 24,
    }}>
      <div style={{
        maxWidth: 480, width: "100%", background: "var(--c-surface)",
        border: "1px solid var(--c-border)", borderRadius: 10, padding: 28,
      }}>
        <div style={{
          display: "inline-block", padding: "4px 10px", borderRadius: 20, fontSize: 11,
          fontWeight: 700, background: "var(--c-yellow-bg)", border: "1px solid var(--c-yellow-border)",
          marginBottom: 16, textTransform: "uppercase", letterSpacing: 0.4,
        }}>
          Comprobante de demostración
        </div>

        <h1 style={{ fontFamily: serif, fontSize: "1.3rem", marginBottom: 8 }}>
          Esto no es un documento fiscal válido
        </h1>
        <p style={{ fontSize: 13, color: "var(--c-text-3)", marginBottom: 20, lineHeight: 1.5 }}>
          Este código QR fue generado dentro del entorno de prueba de Facturacon para mostrar
          cómo se vería un comprobante fiscal electrónico ya certificado. No fue emitido ante la
          DGII y no tiene validez fiscal. Una vez tu negocio complete la certificación, sus
          comprobantes reales se verifican en{" "}
          <span style={{ fontWeight: 600 }}>ecf.dgii.gov.do</span>.
        </p>

        <div style={{ border: "1px solid var(--c-border-lt)", borderRadius: 8, overflow: "hidden" }}>
          {[
            ["Emisor (prueba)", sp.nombreEmisor || "—"],
            ["RNC emisor", sp.rncEmisor || "—"],
            ["e-NCF", sp.encf || "—"],
            ["Tipo e-CF", sp.tipoECF || "—"],
            ["Fecha emisión", sp.fecha || "—"],
            ["Monto total", `RD$ ${fmt(monto)}`],
            ["Código de seguridad", sp.codigoSeguridad || "—"],
          ].map(([label, value]) => (
            <div key={label} style={{
              display: "flex", justifyContent: "space-between", padding: "10px 14px",
              borderBottom: "1px solid var(--c-border-lt)", fontSize: 13,
            }}>
              <span style={{ color: "var(--c-text-3)" }}>{label}</span>
              <span style={{ fontWeight: 600 }}>{value}</span>
            </div>
          ))}
        </div>

        <a href="/" style={{
          display: "block", textAlign: "center", marginTop: 20, fontSize: 13,
          fontWeight: 600, color: "var(--c-brand)",
        }}>
          ← Volver a Facturacon
        </a>
      </div>
    </main>
  );
}
