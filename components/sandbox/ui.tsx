"use client";

export const sans = "var(--font-sans)";
export const serif = "var(--font-serif)";

export function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{
        display: "block", fontSize: 11, fontWeight: 600, color: "#374151",
        textTransform: "uppercase", marginBottom: 5, letterSpacing: 0.3,
      }}>{label}</label>
      {children}
    </div>
  );
}

const inputBase: React.CSSProperties = {
  width: "100%", padding: "9px 11px", border: "1px solid #d1d5db",
  borderRadius: 5, fontSize: 13, fontFamily: sans, background: "var(--c-surface)", color: "var(--c-text-1)",
};

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} style={{ ...inputBase, ...props.style }} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} style={{ ...inputBase, resize: "vertical", minHeight: 60, ...props.style }} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} style={{ ...inputBase, cursor: "pointer", ...props.style }} />;
}

export function Boton({ children, onClick, disabled, variant = "primary", type = "button", style }: {
  children: React.ReactNode; onClick?: () => void; disabled?: boolean;
  variant?: "primary" | "secondary" | "danger"; type?: "button" | "submit"; style?: React.CSSProperties;
}) {
  const bg = disabled ? "#9ca3af"
    : variant === "primary" ? "var(--c-brand)"
    : variant === "danger" ? "#dc2626"
    : "var(--c-surface)";
  return (
    <button onClick={onClick} disabled={disabled} type={type} style={{
      padding: "9px 18px", borderRadius: 6, fontSize: 13, fontWeight: 600, fontFamily: sans,
      cursor: disabled ? "not-allowed" : "pointer", background: bg,
      color: variant === "secondary" ? "var(--c-text-1)" : "#fff",
      border: variant === "secondary" ? "1px solid var(--c-border)" : "none",
      whiteSpace: "nowrap", ...style,
    }}>
      {children}
    </button>
  );
}

export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "green" | "yellow" | "red" | "blue" }) {
  const tones: Record<string, [string, string]> = {
    neutral: ["var(--c-bg)", "var(--c-text-3)"],
    green:   ["#f0faf4", "#166534"],
    yellow:  ["var(--c-yellow-bg)", "#92400e"],
    red:     ["#fef2f2", "#991b1b"],
    blue:    ["#eff6ff", "#1d4ed8"],
  };
  const [bg, fg] = tones[tone];
  return (
    <span style={{
      display: "inline-block", padding: "2px 9px", borderRadius: 12, fontSize: 11,
      fontWeight: 700, background: bg, color: fg, whiteSpace: "nowrap",
    }}>{children}</span>
  );
}

export function EmptyState({ texto }: { texto: string }) {
  return (
    <div style={{
      padding: "32px 16px", textAlign: "center", color: "var(--c-text-3)",
      fontSize: 13, border: "1px dashed var(--c-border)", borderRadius: 8,
    }}>{texto}</div>
  );
}
