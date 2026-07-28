"use client";

import { useState } from "react";

interface Faq { q: string; a: string; }

// Acordeón simple (una pregunta abierta a la vez) — antes el FAQ se
// mostraba siempre expandido; esto reduce el scroll inicial de la sección.
export default function FaqAccordion({ faqs }: { faqs: Faq[] }) {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {faqs.map((f, i) => {
        const isOpen = open === i;
        return (
          <div key={f.q} style={{
            border: "1px solid var(--c-border)", borderRadius: 10, overflow: "hidden", background: "var(--c-surface)",
          }}>
            <button
              onClick={() => setOpen(isOpen ? null : i)}
              style={{
                width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12,
                padding: "16px 18px", background: "transparent", border: "none", cursor: "pointer",
                textAlign: "left", fontFamily: "var(--font-sans)", fontSize: 14, fontWeight: 700, color: "var(--c-text-1)",
              }}
            >
              {f.q}
              <span style={{
                flexShrink: 0, width: 22, height: 22, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                background: "var(--c-brand-bg)", color: "var(--c-brand)", fontSize: 16, lineHeight: 1,
                transform: isOpen ? "rotate(45deg)" : "none", transition: "transform 0.15s ease",
              }}>
                +
              </span>
            </button>
            {isOpen && (
              <div style={{ padding: "0 18px 16px", fontSize: 13, color: "var(--c-text-3)", lineHeight: 1.6 }}>
                {f.a}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
