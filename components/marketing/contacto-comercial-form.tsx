"use client";

import { useState } from "react";
import { PLANES, VOLUMEN_EMPRESA } from "@/lib/payments/planes";

const campo: React.CSSProperties = {
  width: "100%", padding: "12px 14px", border: "1px solid var(--c-border)", borderRadius: "var(--radius-md)",
  fontSize: 15, fontFamily: "var(--font-sans)", background: "#fff", color: "var(--c-text-1)", marginTop: 6,
};
const etiqueta: React.CSSProperties = { fontSize: 14, fontWeight: 600, display: "block" };

// Formulario de contacto comercial (plan empresarial / a la medida).
export default function ContactoComercialForm({ volumenInicial }: { volumenInicial?: number }) {
  const [f, setF] = useState({
    nombre: "", empresa: "", rnc: "", email: "", telefono: "", mensaje: "", web: "",
    volumen: volumenInicial && volumenInicial > 0 ? String(volumenInicial) : "",
  });
  const [estado, setEstado] = useState<"idle" | "enviando" | "listo">("idle");
  const [error, setError] = useState("");
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setF((x) => ({ ...x, [k]: e.target.value }));

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setEstado("enviando"); setError("");
    try {
      const res = await fetch("/api/contacto-comercial", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...f, volumen: Number(f.volumen) || undefined }),
      });
      const d = await res.json().catch(() => null);
      if (!res.ok) throw new Error(d?.error ?? "No se pudo enviar tu solicitud.");
      setEstado("listo");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar tu solicitud.");
      setEstado("idle");
    }
  }

  if (estado === "listo") {
    return (
      <div role="status" style={{ padding: 28, background: "var(--c-green-bg)", border: "1px solid var(--c-green-border)", borderRadius: "var(--radius-lg)", color: "var(--c-green)" }}>
        <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 6 }}>Recibimos tu solicitud</div>
        <p style={{ fontSize: 15.5, lineHeight: 1.6 }}>
          Alguien de nuestro equipo te contactará para entender tu operación y proponerte un plan.
          Si es urgente, escríbenos a <a href="mailto:contacto@facturacon.com.do" style={{ color: "inherit", fontWeight: 700 }}>contacto@facturacon.com.do</a>.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={enviar} style={{ display: "flex", flexDirection: "column", gap: 16, background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: "var(--radius-lg)", padding: 28, boxShadow: "var(--shadow-md)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
        <label style={etiqueta}>Tu nombre
          <input style={campo} required autoComplete="name" value={f.nombre} onChange={set("nombre")} />
        </label>
        <label style={etiqueta}>Empresa
          <input style={campo} required autoComplete="organization" value={f.empresa} onChange={set("empresa")} />
        </label>
        <label style={etiqueta}>Correo
          <input style={campo} type="email" autoComplete="email" value={f.email} onChange={set("email")} />
        </label>
        <label style={etiqueta}>Teléfono o WhatsApp
          <input style={campo} type="tel" autoComplete="tel" value={f.telefono} onChange={set("telefono")} />
        </label>
        <label style={etiqueta}>RNC (opcional)
          <input style={campo} inputMode="numeric" value={f.rnc} onChange={set("rnc")} />
        </label>
        <label style={etiqueta}>Comprobantes al mes (aprox.)
          <input style={campo} inputMode="numeric" placeholder={`Ej. ${VOLUMEN_EMPRESA.toLocaleString("es-DO")}`} value={f.volumen}
            onChange={(e) => setF((x) => ({ ...x, volumen: e.target.value.replace(/\D/g, "") }))} />
        </label>
      </div>
      <label style={etiqueta}>Cuéntanos de tu operación (opcional)
        <textarea style={{ ...campo, minHeight: 110, resize: "vertical" }} value={f.mensaje} onChange={set("mensaje")}
          placeholder="Sucursales, cajeros, sistemas que usas hoy, fecha en que necesitas empezar…" />
      </label>
      {/* Campo trampa: invisible para personas. */}
      <input tabIndex={-1} autoComplete="off" aria-hidden="true" value={f.web} onChange={set("web")}
        style={{ position: "absolute", left: -9999, width: 1, height: 1, opacity: 0 }} />
      <p style={{ fontSize: 13, color: "var(--c-text-3)" }}>Déjanos al menos un correo o un teléfono. Los planes fijos llegan hasta {PLANES[PLANES.length - 1].facturas.toLocaleString("es-DO")} comprobantes al mes.</p>
      {error && <p role="alert" style={{ fontSize: 14, color: "var(--c-red)" }}>{error}</p>}
      <button type="submit" disabled={estado === "enviando"} className="btn-l btn-brand" style={{ border: "none", cursor: "pointer", alignSelf: "flex-start", fontFamily: "var(--font-sans)" }}>
        {estado === "enviando" ? "Enviando…" : "Enviar solicitud"}
      </button>
    </form>
  );
}
