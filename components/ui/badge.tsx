type TipoBadge = "success" | "warning" | "danger" | "info" | "neutral";

// Etiqueta de estado: pastilla con punto, igual que en las vistas de la landing.
const TIPO_STYLES: Record<TipoBadge, { bg: string; color: string }> = {
  success: { bg: "#f0faf4", color: "#166534" },
  warning: { bg: "#fffbeb", color: "#92400e" },
  danger:  { bg: "#fef2f2", color: "#991b1b" },
  info:    { bg: "var(--c-brand-bg)", color: "var(--c-brand)" },
  neutral: { bg: "var(--c-border-lt)", color: "var(--c-text-2)" },
};

interface BadgeProps {
  tipo?:     TipoBadge;
  estado?:   string;
  children?: React.ReactNode;
}

const ESTADO_MAP: Record<string, TipoBadge> = {
  pagada:     "success",
  pendiente:  "warning",
  anulada:    "danger",
  vigente:    "info",
  vencida:    "danger",
  convertida: "neutral",
  activo:     "success",
  inactivo:   "neutral",
};

const ETIQUETA: Record<string, string> = {
  pagada: "Pagada", pendiente: "Pendiente", anulada: "Anulada", vigente: "Vigente",
  vencida: "Vencida", convertida: "Convertida", activo: "Activo", inactivo: "Inactivo",
};

export default function Badge({ tipo, estado, children }: BadgeProps) {
  const resolvedTipo: TipoBadge =
    tipo ?? (estado ? (ESTADO_MAP[estado] ?? "neutral") : "neutral");

  const s = TIPO_STYLES[resolvedTipo];
  const label = children ?? (estado ? (ETIQUETA[estado] ?? estado) : "");

  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6, background: s.bg, color: s.color,
      padding: "3px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600,
      fontFamily: "var(--font-sans)", whiteSpace: "nowrap",
    }}>
      <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor" }} />
      {label}
    </span>
  );
}
