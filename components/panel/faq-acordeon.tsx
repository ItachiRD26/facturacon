"use client";

import { useState } from "react";
import { FAQ } from "@/lib/soporte/faq";

export default function FaqAcordeon() {
  const [abiertoId, setAbiertoId] = useState<string | null>(null);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {FAQ.map((item) => {
        const abierto = abiertoId === item.id;
        return (
          <div key={item.id} style={{ border: "1px solid var(--c-border)", borderRadius: 8, background: "var(--c-surface)" }}>
            <button
              onClick={() => setAbiertoId(abierto ? null : item.id)}
              style={{
                width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "13px 16px", background: "none", border: "none", cursor: "pointer",
                fontSize: 13, fontWeight: 600, textAlign: "left", color: "var(--c-text-1)", fontFamily: "var(--font-sans)",
              }}
            >
              {item.pregunta}
              <span style={{ color: "var(--c-text-3)", fontSize: 16, flexShrink: 0, marginLeft: 10 }}>{abierto ? "−" : "+"}</span>
            </button>
            {abierto && (
              <div style={{ padding: "0 16px 14px", fontSize: 13, color: "var(--c-text-2)", lineHeight: 1.5 }}>
                {item.respuesta}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
