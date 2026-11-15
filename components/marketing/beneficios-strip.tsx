import Reveal from "./reveal";
import { SealCheck, QrCode, SquaresFour, Flask } from "@phosphor-icons/react/dist/ssr";

// Lo que incluye Facturacon, solo con lo que realmente hace hoy. Junta lo que
// antes estaba repetido en dos secciones ("beneficios" y "qué resolvemos").
const beneficios = [
  { t: "Certificación incluida", d: "Te guiamos por los 13 pasos de la DGII y certificamos tu empresa, sin contratar un desarrollador.", Icono: SealCheck },
  { t: "Cumplimiento con la DGII", d: "Firma digital, envío de comprobantes y código QR según la normativa de e-CF vigente.", Icono: QrCode },
  { t: "Sistema de facturación completo", d: "Clientes, inventario, cotizaciones, facturas e impresión en un solo lugar.", Icono: SquaresFour },
  { t: "Pruébalo antes de pagar", d: "Un entorno de prueba con datos de ejemplo, sin compromiso. Pagas cuando ya estés certificado.", Icono: Flask },
];

export default function BeneficiosStrip() {
  return (
    <Reveal stagger className="cols-4">
      {beneficios.map(({ t, d, Icono }) => (
        <div key={t} className="hov-lift" style={{
          display: "flex", flexDirection: "column", gap: 14, padding: 26,
          background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-sm)",
        }}>
          <Icono size={40} weight="duotone" color="var(--c-brand)" aria-hidden="true" />
          <div style={{ fontWeight: 800, fontSize: 19, letterSpacing: "-0.02em", lineHeight: 1.2 }}>{t}</div>
          <div style={{ fontSize: 15.5, color: "var(--c-text-2)", lineHeight: 1.6 }}>{d}</div>
        </div>
      ))}
    </Reveal>
  );
}
