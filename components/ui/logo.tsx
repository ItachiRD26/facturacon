// Logo de Facturacon: un comprobante con el borde dentado del papel térmico y,
// encima, el sello rojo de verificado. Dice en un vistazo lo que hace el
// producto: emitir comprobantes que la DGII valida. Se dibuja inline (y no
// como <img>) para cambiar los colores según el fondo.
//
// Versión oficial pendiente: public/marca/PROMPT-LOGO.md tiene el brief para
// encargar la ilustración final. Este mark es la versión de trabajo.
interface LogoProps {
  variant?: "full" | "icon";
  // "color": para fondos claros (comprobante tinta + sello rojo).
  // "white": para fondos oscuros (comprobante blanco, sello rojo).
  tone?: "color" | "white";
  size?: number; // alto del mark en px — el wordmark escala proporcional
  className?: string;
}

const TINTA = "#0F1A30";
const SELLO = "#D92D3A";

export function MarcaFacturacon({ size, tone }: { size: number; tone: "color" | "white" }) {
  const papel = tone === "white" ? "#FFFFFF" : TINTA;
  const renglon = tone === "white" ? TINTA : "#FFFFFF";
  // El aro del sello tiene el color del fondo para "recortar" el comprobante.
  const aro = tone === "white" ? TINTA : "#F3F4F1";
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" style={{ flexShrink: 0 }} aria-hidden="true">
      <path d="M16 12Q16 8 20 8H76Q80 8 80 12V82L72 76L64 82L56 76L48 82L40 76L32 82L24 76L16 82Z" fill={papel} />
      <rect x="26" y="21" width="34" height="5" rx="2.5" fill={renglon} />
      <rect x="26" y="33" width="44" height="5" rx="2.5" fill={renglon} opacity="0.55" />
      <rect x="26" y="45" width="26" height="5" rx="2.5" fill={renglon} opacity="0.55" />
      <circle cx="68" cy="64" r="20" fill={SELLO} stroke={aro} strokeWidth="4" />
      <path d="M59 64.5l6.5 6.5L78 57" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Logo({ variant = "full", tone = "color", size = 32, className }: LogoProps) {
  const wordColor = tone === "white" ? "#FFFFFF" : TINTA;
  const marca = <MarcaFacturacon size={size} tone={tone} />;

  if (variant === "icon") {
    return <span className={className} role="img" aria-label="Facturacon" style={{ display: "inline-flex" }}>{marca}</span>;
  }

  return (
    <span className={className} style={{ display: "inline-flex", alignItems: "center", gap: size * 0.2 }}>
      {marca}
      <span className="logo-wordmark" style={{
        fontFamily: "var(--font-sans), system-ui, sans-serif", fontWeight: 800, color: wordColor,
        fontSize: size * 0.78, lineHeight: 1, letterSpacing: "-0.035em", whiteSpace: "nowrap",
      }}>
        facturacon
      </span>
    </span>
  );
}
