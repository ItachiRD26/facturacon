"use client";

import { useState, type ReactNode, type InputHTMLAttributes } from "react";
import { Eye, EyeSlash, WarningCircle, CircleNotch } from "@phosphor-icons/react/dist/ssr";
import GoogleIcon from "@/components/ui/google-icon";

// Piezas compartidas de /login y /registro: mismos campos, botones y mensajes en
// las dos pantallas (antes cada una repetía sus estilos con mayúsculas y grises).
const sans = "var(--font-sans), system-ui, sans-serif";

export function TarjetaAuth({ children, ancho = 420 }: { children: ReactNode; ancho?: number }) {
  return (
    <div style={{
      width: "100%", maxWidth: ancho, background: "var(--c-surface)", border: "1px solid var(--c-border)",
      borderRadius: 18, padding: "clamp(24px, 5vw, 38px)", boxShadow: "var(--shadow-md)", fontFamily: sans,
    }}>
      {children}
    </div>
  );
}

export function Encabezado({ titulo, texto }: { titulo: string; texto?: ReactNode }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h1 style={{ fontSize: "1.65rem", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.15, marginBottom: texto ? 8 : 0 }}>{titulo}</h1>
      {texto && <p style={{ fontSize: 14.5, color: "var(--c-text-3)", lineHeight: 1.55 }}>{texto}</p>}
    </div>
  );
}

export function Campo({ etiqueta, ayuda, children, derecha }: { etiqueta: string; ayuda?: string; children: ReactNode; derecha?: ReactNode }) {
  return (
    <label style={{ display: "block" }}>
      <span style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
        <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--c-text-1)" }}>{etiqueta}</span>
        {derecha}
      </span>
      {children}
      {ayuda && <span style={{ display: "block", fontSize: 12.5, color: "var(--c-text-3)", marginTop: 6 }}>{ayuda}</span>}
    </label>
  );
}

export function Entrada(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className="auth-input" />;
}

// Contraseña con botón para ver u ocultar lo escrito.
export function EntradaClave(props: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const [ver, setVer] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <input {...props} type={ver ? "text" : "password"} className="auth-input" style={{ paddingRight: 46 }} />
      <button type="button" onClick={() => setVer((v) => !v)} aria-label={ver ? "Ocultar contraseña" : "Mostrar contraseña"}
        style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", width: 36, height: 36, border: "none", background: "transparent", cursor: "pointer", color: "var(--c-text-3)", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8 }}>
        {ver ? <EyeSlash size={20} weight="duotone" aria-hidden="true" /> : <Eye size={20} weight="duotone" aria-hidden="true" />}
      </button>
    </div>
  );
}

export function BotonAuth({ children, cargando, disabled, type = "submit", onClick }: {
  children: ReactNode; cargando?: boolean; disabled?: boolean; type?: "submit" | "button"; onClick?: () => void;
}) {
  const inactivo = disabled || cargando;
  return (
    <button type={type} onClick={onClick} disabled={inactivo} className="auth-boton" style={{ opacity: inactivo ? 0.6 : 1, cursor: inactivo ? "not-allowed" : "pointer" }}>
      {cargando && <CircleNotch size={18} weight="bold" className="giro" aria-hidden="true" />}
      {children}
    </button>
  );
}

export function BotonGoogle({ onClick, disabled, texto = "Continuar con Google" }: { onClick: () => void; disabled?: boolean; texto?: string }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="auth-google" style={{ cursor: disabled ? "not-allowed" : "pointer" }}>
      <GoogleIcon />
      {texto}
    </button>
  );
}

export function Divisor({ texto }: { texto: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "18px 0", fontSize: 13, color: "var(--c-text-4)" }}>
      <span style={{ flex: 1, height: 1, background: "var(--c-border)" }} />{texto}<span style={{ flex: 1, height: 1, background: "var(--c-border)" }} />
    </div>
  );
}

export function AlertaAuth({ children, accion }: { children: ReactNode; accion?: ReactNode }) {
  return (
    <div role="alert" style={{ display: "flex", gap: 10, padding: "11px 13px", background: "var(--c-red-bg)", border: "1px solid var(--c-red-border)", borderRadius: 10, fontSize: 13.5, color: "var(--c-red)", lineHeight: 1.45 }}>
      <WarningCircle size={20} weight="fill" style={{ flexShrink: 0, marginTop: 1 }} aria-hidden="true" />
      <div>{children}{accion && <div style={{ marginTop: 8 }}>{accion}</div>}</div>
    </div>
  );
}
