// Kit visual común del panel del dueño y de las pantallas de la jornada
// (registro → certificación → plan). Un solo lugar para botones, tarjetas,
// etiquetas y tablas, con los colores de app/globals.css — así un ajuste de
// diseño se hace aquí y no en 40 archivos. Todo es presentacional (sin
// hooks), por eso sirve igual desde Server Components y Client Components.
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

const sans = "var(--font-sans)";
const serif = "var(--font-serif)";

// ── Encabezado de página ─────────────────────────────────────────────
export function PageHeader({ titulo, descripcion, acciones }: {
  titulo: string; descripcion?: ReactNode; acciones?: ReactNode;
}) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "flex-start",
      gap: 16, flexWrap: "wrap", marginBottom: 24,
    }}>
      <div style={{ minWidth: 0 }}>
        <h1 style={{ fontFamily: serif, fontSize: "1.55rem", lineHeight: 1.2, marginBottom: descripcion ? 6 : 0 }}>
          {titulo}
        </h1>
        {descripcion && (
          <p style={{ fontSize: 13, color: "var(--c-text-3)", maxWidth: 620, lineHeight: 1.55 }}>{descripcion}</p>
        )}
      </div>
      {acciones && <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>{acciones}</div>}
    </div>
  );
}

// ── Tarjeta ──────────────────────────────────────────────────────────
export function Card({ children, padding = 20, style }: {
  children: ReactNode; padding?: number; style?: CSSProperties;
}) {
  return (
    <div style={{
      background: "var(--c-surface)", border: "1px solid var(--c-border)",
      borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-sm)", padding, ...style,
    }}>
      {children}
    </div>
  );
}

export function CardTitle({ children, extra }: { children: ReactNode; extra?: ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 14 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--c-text-1)" }}>{children}</div>
      {extra && <div style={{ fontSize: 12, color: "var(--c-text-3)" }}>{extra}</div>}
    </div>
  );
}

// ── Etiqueta / estado ────────────────────────────────────────────────
export type Tono = "neutral" | "success" | "warning" | "danger" | "info" | "brand";

const TONOS: Record<Tono, { bg: string; fg: string; dot: string }> = {
  neutral: { bg: "var(--c-bg)",           fg: "var(--c-text-3)", dot: "#9ca3af" },
  success: { bg: "var(--c-green-bg)",     fg: "var(--c-green)",  dot: "#16a34a" },
  warning: { bg: "var(--c-yellow-bg)",    fg: "var(--c-yellow)", dot: "#d97706" },
  danger:  { bg: "var(--c-red-bg)",       fg: "var(--c-red)",    dot: "#dc2626" },
  info:    { bg: "var(--c-blue-bg)",      fg: "var(--c-blue)",   dot: "#2563eb" },
  brand:   { bg: "var(--c-brand-bg)",     fg: "var(--c-brand-dark)", dot: "var(--c-brand)" },
};

export function Pill({ children, tono = "neutral", punto = true }: {
  children: ReactNode; tono?: Tono; punto?: boolean;
}) {
  const t = TONOS[tono];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 10px", borderRadius: 999,
      background: t.bg, color: t.fg, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap", fontFamily: sans,
    }}>
      {punto && <span style={{ width: 6, height: 6, borderRadius: "50%", background: t.dot }} />}
      {children}
    </span>
  );
}

// ── Botón (o enlace con aspecto de botón) ────────────────────────────
type Variante = "primary" | "secondary" | "ghost" | "danger";

export function Button({
  children, onClick, href, disabled, variante = "primary", tamano = "md",
  type = "button", full, style, titulo,
}: {
  children: ReactNode; onClick?: () => void; href?: string; disabled?: boolean;
  variante?: Variante; tamano?: "sm" | "md" | "lg"; type?: "button" | "submit";
  full?: boolean; style?: CSSProperties; titulo?: string;
}) {
  const pad = tamano === "sm" ? "6px 12px" : tamano === "lg" ? "12px 22px" : "9px 16px";
  const fs = tamano === "sm" ? 12 : tamano === "lg" ? 14 : 13;
  const variantes: Record<Variante, CSSProperties> = {
    primary:   { background: "var(--c-brand)", color: "#fff", border: "1px solid var(--c-brand)" },
    secondary: { background: "var(--c-surface)", color: "var(--c-text-1)", border: "1px solid var(--c-border)" },
    ghost:     { background: "transparent", color: "var(--c-text-2)", border: "1px solid transparent" },
    danger:    { background: "var(--c-surface)", color: "var(--c-red)", border: "1px solid var(--c-red-border)" },
  };
  const base: CSSProperties = {
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
    padding: pad, fontSize: fs, fontWeight: 600, fontFamily: sans, borderRadius: "var(--radius-md)",
    cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.55 : 1, whiteSpace: "nowrap",
    textDecoration: "none", width: full ? "100%" : undefined, ...variantes[variante], ...style,
  };

  if (href && !disabled) {
    return /^https?:/.test(href)
      ? <a href={href} title={titulo} style={base}>{children}</a>
      : <Link href={href} title={titulo} style={base}>{children}</Link>;
  }
  return <button type={type} onClick={onClick} disabled={disabled} title={titulo} style={base}>{children}</button>;
}

// ── Tarjeta de cifra ─────────────────────────────────────────────────
export function StatCard({ etiqueta, valor, nota, tono, href }: {
  etiqueta: string; valor: ReactNode; nota?: ReactNode; tono?: Tono; href?: string;
}) {
  const color = tono ? TONOS[tono].fg : "var(--c-text-1)";
  const contenido = (
    <Card padding={18} style={{ height: "100%" }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--c-text-3)", marginBottom: 10 }}>
        {etiqueta}
      </div>
      <div className="num" style={{ fontSize: 24, fontWeight: 700, color, lineHeight: 1.15 }}>{valor}</div>
      {nota && <div style={{ fontSize: 12, color: "var(--c-text-3)", marginTop: 6, lineHeight: 1.45 }}>{nota}</div>}
    </Card>
  );
  return href
    ? <Link href={href} style={{ textDecoration: "none", color: "inherit", display: "block" }}>{contenido}</Link>
    : contenido;
}

// ── Barra de progreso (uso del plan, avance de pasos) ────────────────
export function ProgressBar({ valor, maximo, tono = "brand" }: { valor: number; maximo: number; tono?: Tono }) {
  const pct = maximo > 0 ? Math.min(100, (valor / maximo) * 100) : 0;
  const alerta = pct >= 90 ? "danger" : pct >= 75 ? "warning" : tono;
  return (
    <div role="progressbar" aria-valuenow={valor} aria-valuemax={maximo}
      style={{ height: 8, background: "var(--c-border-lt)", borderRadius: 999, overflow: "hidden" }}>
      <div style={{ width: `${pct}%`, height: "100%", borderRadius: 999, background: TONOS[alerta].dot, transition: "width .25s" }} />
    </div>
  );
}

// ── Estado vacío ─────────────────────────────────────────────────────
export function EmptyBlock({ titulo, texto, accion }: { titulo: string; texto?: string; accion?: ReactNode }) {
  return (
    <div style={{
      padding: "36px 20px", textAlign: "center", border: "1px dashed var(--c-border)",
      borderRadius: "var(--radius-lg)", background: "var(--c-surface)",
    }}>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: texto ? 6 : 0 }}>{titulo}</div>
      {texto && <p style={{ fontSize: 12, color: "var(--c-text-3)", maxWidth: 380, margin: "0 auto", lineHeight: 1.5 }}>{texto}</p>}
      {accion && <div style={{ marginTop: 14 }}>{accion}</div>}
    </div>
  );
}

// ── Avatar con iniciales ─────────────────────────────────────────────
const AVATAR_COLORES = ["#2540D9", "#7c3aed", "#b45309", "#0f766e", "#be185d", "#4338ca", "#15803d"];

export function Avatar({ nombre, tamano = 34 }: { nombre: string; tamano?: number }) {
  const limpio = nombre.trim() || "?";
  const iniciales = limpio.split(/\s+/).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
  let h = 0;
  for (const ch of limpio) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return (
    <span aria-hidden style={{
      width: tamano, height: tamano, borderRadius: "50%", flexShrink: 0,
      background: AVATAR_COLORES[h % AVATAR_COLORES.length], color: "#fff",
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      fontSize: tamano * 0.38, fontWeight: 700, fontFamily: sans,
    }}>
      {iniciales}
    </span>
  );
}

// ── Estilos de tabla compartidos ─────────────────────────────────────
export const th: CSSProperties = {
  padding: "10px 14px", textAlign: "left", fontSize: 10.5, fontWeight: 700,
  color: "var(--c-text-3)", textTransform: "uppercase", letterSpacing: "0.05em",
  background: "var(--c-bg)", whiteSpace: "nowrap",
};
export const td: CSSProperties = { padding: "12px 14px", fontSize: 13, borderTop: "1px solid var(--c-border-lt)" };
export const tablaWrap: CSSProperties = {
  border: "1px solid var(--c-border)", borderRadius: "var(--radius-lg)", overflow: "hidden",
  background: "var(--c-surface)", overflowX: "auto",
};
