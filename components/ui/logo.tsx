// Logo de Facturacon — mismo mark en todos lados (público en public/logo-*.svg
// como referencia visual, pero se renderiza inline aquí para poder cambiar el
// color del wordmark según el fondo sin depender de una segunda exportación
// SVG). El ícono es el patrón "finder" de un código QR — lo único realmente
// distintivo de un e-CF — en vez del típico ícono de "factura con líneas".
interface LogoProps {
  variant?: "full" | "icon";
  // "color": wordmark navy, para fondos claros. "white": wordmark blanco,
  // para fondos oscuros (navy/gradiente de marca).
  tone?: "color" | "white";
  size?: number; // alto del ícono en px — el wordmark escala proporcional
  className?: string;
}

export default function Logo({ variant = "full", tone = "color", size = 32, className }: LogoProps) {
  const wordColor = tone === "white" ? "#ffffff" : "#111439";

  const icono = (
    <svg width={size} height={size} viewBox="0 0 200 200" style={{ flexShrink: 0 }} aria-hidden={variant === "full"}>
      <rect x="8" y="8" width="184" height="184" rx="40" fill="#0e7490" />
      <rect x="46" y="46" width="48" height="48" rx="8" fill="#ffffff" />
      <rect x="106" y="46" width="48" height="48" rx="8" fill="#ffffff" opacity="0.45" />
      <rect x="46" y="106" width="48" height="48" rx="8" fill="#ffffff" opacity="0.45" />
      <rect x="106" y="106" width="48" height="48" rx="8" fill="#ffffff" />
      <rect x="62" y="62" width="16" height="16" rx="3" fill="#0e7490" />
      <rect x="122" y="122" width="16" height="16" rx="3" fill="#0e7490" />
    </svg>
  );

  if (variant === "icon") {
    return <span className={className} role="img" aria-label="Facturacon">{icono}</span>;
  }

  return (
    <span className={className} style={{ display: "inline-flex", alignItems: "center", gap: size * 0.22 }}>
      {icono}
      <span style={{
        fontFamily: "var(--font-serif)", fontWeight: 600, color: wordColor,
        fontSize: size * 0.72, lineHeight: 1, whiteSpace: "nowrap",
      }}>
        Facturacon
      </span>
    </span>
  );
}
