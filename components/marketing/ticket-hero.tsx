import { PLANES } from "@/lib/payments/planes";
import { MarcaFacturacon } from "@/components/ui/logo";

// El objeto del hero: un comprobante térmico que dice lo que cuesta empezar.
// Es lo más característico del oficio (todo negocio dominicano conoce el
// ticket) y además es información real: certificar es gratis y la mensualidad
// llega después. Se "imprime" de arriba hacia abajo (clip-path), las líneas
// entran una a una y al final cae el sello (ver "Movimiento" en globals.css).
const mono = "var(--font-mono), 'Courier New', monospace";

// Borde dentado del papel: se dibuja como SVG para que escale con el ancho.
function Dientes({ color = "#fff" }: { color?: string }) {
  const n = 28, w = 12;
  let d = `M0 0H${n * w}`;
  for (let i = n; i > 0; i--) d += `L${i * w - w / 2} 9L${(i - 1) * w} 0`;
  return (
    <svg viewBox={`0 0 ${n * w} 9`} preserveAspectRatio="none" aria-hidden="true"
      style={{ display: "block", width: "100%", height: 9 }}>
      <path d={d + "Z"} fill={color} />
    </svg>
  );
}

function Linea({ i, concepto, importe }: { i: number; concepto: string; importe: string }) {
  return (
    <div className="t-linea" style={{ display: "flex", alignItems: "baseline", gap: 8, ["--i" as string]: i }}>
      <span>{concepto}</span>
      <span aria-hidden="true" style={{ flex: 1, borderBottom: "1px dotted var(--c-text-4)", transform: "translateY(-3px)" }} />
      <span className="num">{importe}</span>
    </div>
  );
}

export default function TicketHero() {
  const desde = PLANES[0].montoRD.toLocaleString("es-DO");
  return (
    <div className="ticket-imprime" style={{ width: "100%", maxWidth: 360, margin: "0 auto" }}>
      <div className="ticket-flota" style={{ position: "relative", filter: "drop-shadow(0 26px 34px rgba(0,0,0,0.35))" }}>
        <div style={{
          background: "#fff", padding: "26px 26px 92px", fontFamily: mono, fontSize: 13, lineHeight: 1.7,
          color: "var(--c-text-1)", borderRadius: "6px 6px 0 0",
        }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, marginBottom: 14, textAlign: "center" }}>
            <MarcaFacturacon size={34} tone="color" />
            <div style={{ fontWeight: 500, letterSpacing: "0.02em" }}>Emisor electrónico ante la DGII</div>
          </div>

          <div aria-hidden="true" style={{ borderTop: "1px dashed var(--c-text-4)", margin: "0 0 12px" }} />

          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Linea i={0} concepto="Cuenta y entorno de prueba" importe="0.00" />
            <Linea i={1} concepto="Certificación ante la DGII" importe="0.00" />
            <Linea i={2} concepto="Asistente de 13 pasos" importe="0.00" />
            <Linea i={3} concepto="Cajeros y contabilidad" importe="incl." />
          </div>

          <div aria-hidden="true" style={{ borderTop: "1px dashed var(--c-text-4)", margin: "14px 0 10px" }} />

          <div className="t-linea" style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", fontWeight: 500, fontSize: 15, ["--i" as string]: 4.5 }}>
            <span>Total a pagar hoy</span>
            <span className="num" style={{ fontSize: 22 }}>RD$ 0.00</span>
          </div>

          <div className="t-linea" style={{ marginTop: 14, padding: "9px 12px", background: "var(--c-ticket)", borderRadius: 3, fontSize: 12.5, lineHeight: 1.55, color: "var(--c-text-1)", ["--i" as string]: 5.5 }}>
            Después de certificarte: planes desde RD$ {desde} al mes.
          </div>

          <div style={{ marginTop: 14, textAlign: "left", fontSize: 11, color: "var(--c-text-3)", maxWidth: 170 }}>
            Ejemplo ilustrativo del costo de empezar
          </div>
        </div>
        <Dientes />

        <div className="sello-cae" style={{
          position: "absolute", right: -14, bottom: 16, width: 120, height: 120, borderRadius: "50%",
          border: "3px solid var(--c-stamp)", color: "var(--c-stamp)",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          fontFamily: "var(--font-sans), system-ui, sans-serif", fontWeight: 800, letterSpacing: "0.04em",
          mixBlendMode: "multiply", transform: "rotate(-14deg)", background: "rgba(217,45,58,0.04)",
        }}>
          <div style={{ position: "absolute", inset: 5, borderRadius: "50%", border: "1px solid var(--c-stamp)" }} />
          <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <span style={{ fontSize: 12.5, marginTop: 2, letterSpacing: "0.02em" }}>CERTIFICADO</span>
        </div>
      </div>
    </div>
  );
}
