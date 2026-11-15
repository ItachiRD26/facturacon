"use client";

import { useState } from "react";
import { Sparkle } from "@phosphor-icons/react/dist/ssr";

// Se muestra en Facturas cuando la empresa de prueba está vacía (sin productos ni
// clientes): sin ellos no se puede facturar. Los datos nuevos aparecen solos en pantalla.
export default function AvisoDatosEjemplo({ tenantId }: { tenantId: string }) {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  const cargar = async () => {
    setCargando(true); setError("");
    try {
      const res = await fetch("/api/sandbox/datos-ejemplo", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tenantId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudieron cargar los datos de ejemplo.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron cargar los datos de ejemplo.");
    } finally { setCargando(false); }
  };

  return (
    <div role="status" style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", padding: "14px 16px", marginBottom: 20, background: "var(--c-brand-bg)", border: "1px solid var(--c-brand-border)", borderRadius: 12, fontFamily: "var(--font-sans)" }}>
      <Sparkle size={26} weight="duotone" color="var(--c-brand)" aria-hidden="true" style={{ flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 220 }}>
        <div style={{ fontWeight: 700, fontSize: 14.5 }}>Tu entorno de prueba está vacío</div>
        <div style={{ fontSize: 13.5, color: "var(--c-text-2)", marginTop: 2 }}>
          Para facturar hacen falta productos y clientes. Carga unos de ejemplo y emite tu primera factura en segundos.
          {error && <span style={{ color: "var(--c-red)", display: "block", marginTop: 4 }}>{error}</span>}
        </div>
      </div>
      <button type="button" onClick={cargar} disabled={cargando} className="auth-boton" style={{ width: "auto", height: 42, padding: "0 20px", fontSize: 14.5, opacity: cargando ? 0.6 : 1, cursor: cargando ? "wait" : "pointer" }}>
        {cargando ? "Cargando…" : "Cargar datos de ejemplo"}
      </button>
    </div>
  );
}
