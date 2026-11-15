"use client";

import { useState } from "react";

// Espacio reservado, honesto, para un video-tutorial futuro de este paso
// concreto — mismo patrón que VideoPlaceholder (no se fabrica un enlace que
// no existe, solo se avisa que viene).
export default function TutorialButton({ titulo }: { titulo: string }) {
  const [abierto, setAbierto] = useState(false);

  return (
    <span style={{ position: "relative", display: "inline-flex" }}>
      <button
        type="button" onClick={() => setAbierto((a) => !a)}
        style={{
          display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 20,
          border: "1px solid var(--c-border)", background: "var(--c-bg)", color: "var(--c-text-3)",
          fontSize: 11, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
        }}
      >
        ▶ Ver tutorial
      </button>
      {abierto && (
        <span
          onClick={() => setAbierto(false)}
          style={{
            position: "absolute", top: "calc(100% + 6px)", left: 0,
            background: "#111", color: "#fff", fontSize: 11, padding: "8px 10px", borderRadius: 6,
            width: 200, zIndex: 30, lineHeight: 1.4, cursor: "pointer",
            boxShadow: "0 6px 20px rgba(0,0,0,0.25)",
          }}
        >
          Video de &quot;{titulo}&quot; — próximamente.
        </span>
      )}
    </span>
  );
}
