"use client";

import { useState } from "react";

// Botón "?" reutilizable — aclara un campo o decisión sin saturar el
// formulario con párrafos de explicación permanentes.
export default function InfoTooltip({ texto }: { texto: string }) {
  const [abierto, setAbierto] = useState(false);

  return (
    <span style={{ position: "relative", display: "inline-flex" }}>
      <button
        type="button" onClick={() => setAbierto((a) => !a)} aria-label="Más información"
        style={{
          width: 16, height: 16, borderRadius: "50%", border: "1px solid var(--c-border)",
          background: "var(--c-bg)", color: "var(--c-text-3)", fontSize: 10, fontWeight: 700,
          cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center",
          lineHeight: 1, padding: 0, flexShrink: 0,
        }}
      >
        ?
      </button>
      {abierto && (
        <span
          onClick={() => setAbierto(false)}
          style={{
            position: "absolute", bottom: "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)",
            background: "#111", color: "#fff", fontSize: 11, padding: "8px 10px", borderRadius: 6,
            width: 220, zIndex: 30, lineHeight: 1.45, textAlign: "left", cursor: "pointer",
            boxShadow: "0 6px 20px rgba(0,0,0,0.25)",
          }}
        >
          {texto}
        </span>
      )}
    </span>
  );
}
