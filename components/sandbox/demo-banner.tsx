"use client";

import { useRouter } from "next/navigation";

export default function DemoBanner() {
  const router = useRouter();

  return (
    <div style={{
      flexShrink: 0, background: "#111827", color: "#fff",
      padding: "8px 20px", display: "flex", justifyContent: "space-between",
      alignItems: "center", gap: 12, flexWrap: "wrap", fontFamily: "var(--font-sans)",
    }}>
      <div style={{ fontSize: 12 }}>
        <strong>Entorno de prueba</strong> — datos y comprobantes simulados, nada se envía a la DGII real.
      </div>
      <button onClick={() => router.push("/panel")} data-tour="btn-comenzar-certificacion" style={{
        padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer",
        border: "none", background: "var(--c-brand)", color: "#fff", flexShrink: 0,
      }}>
        Listo, comenzar certificación →
      </button>
    </div>
  );
}
