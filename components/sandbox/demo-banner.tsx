"use client";

import { useRouter } from "next/navigation";
import { useSandbox } from "@/contexts/SandboxContext";

export default function DemoBanner() {
  const router = useRouter();
  const { tenantId } = useSandbox();

  return (
    <div style={{
      flexShrink: 0, background: "#111827", color: "#fff",
      padding: "8px 20px", display: "flex", justifyContent: "space-between",
      alignItems: "center", gap: 12, flexWrap: "wrap", fontFamily: "var(--font-sans)",
    }}>
      <div style={{ fontSize: 12 }}>
        <strong>Entorno de prueba</strong> — datos y comprobantes simulados, nada se envía a la DGII real.
      </div>
      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
        <button onClick={() => router.push(`/panel/${tenantId}`)} style={{
          padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer",
          border: "1px solid rgba(255,255,255,0.3)", background: "transparent", color: "#fff",
        }}>
          ← Mi cuenta
        </button>
        <button onClick={() => router.push(`/panel/${tenantId}`)} data-tour="btn-comenzar-certificacion" style={{
          padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer",
          border: "none", background: "var(--c-brand)", color: "#fff",
        }}>
          Listo, comenzar certificación →
        </button>
      </div>
    </div>
  );
}
