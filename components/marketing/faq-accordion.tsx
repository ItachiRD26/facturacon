"use client";

import { useState } from "react";
import Reveal from "./reveal";

interface Faq { q: string; a: string; }

// Acordeón simple (una pregunta abierta a la vez) — antes el FAQ se
// mostraba siempre expandido; esto reduce el scroll inicial de la sección.
export default function FaqAccordion({ faqs }: { faqs: Faq[] }) {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <Reveal stagger style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {faqs.map((f, i) => {
        const isOpen = open === i;
        return (
          <div key={f.q} style={{
            border: "1px solid var(--c-border)", borderRadius: "var(--radius-lg)", overflow: "hidden", background: "var(--c-surface)",
          }}>
            <button
              onClick={() => setOpen(isOpen ? null : i)}
              style={{
                width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12,
                padding: "18px 20px", background: "transparent", border: "none", cursor: "pointer",
                textAlign: "left", fontFamily: "var(--font-sans)", fontSize: 16, fontWeight: 700, color: "var(--c-text-1)",
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
            <div className="faq-cuerpo" data-abierto={isOpen}>
              <div><div style={{ padding: "0 20px 18px", fontSize: 15, color: "var(--c-text-2)", lineHeight: 1.65 }}>
                {f.a}
              </div></div>
            </div>
          </div>
        );
      })}
    </Reveal>
  );
}
