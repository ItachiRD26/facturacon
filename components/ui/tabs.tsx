"use client";

import type { ReactNode } from "react";

// Pestañas controladas. El padre decide qué mostrar según `valor` — así cada
// pantalla puede además reflejar la pestaña en la URL (?tab=) si lo necesita.
export default function Tabs<T extends string>({ items, valor, onChange }: {
  items: { id: T; etiqueta: ReactNode; cuenta?: number }[];
  valor: T; onChange: (id: T) => void;
}) {
  return (
    <div role="tablist" style={{
      display: "flex", gap: 4, borderBottom: "1px solid var(--c-border)", marginBottom: 22, overflowX: "auto",
      fontFamily: "var(--font-sans)",
    }}>
      {items.map((it) => {
        const activa = it.id === valor;
        return (
          <button key={it.id} role="tab" aria-selected={activa} type="button" onClick={() => onChange(it.id)} style={{
            padding: "10px 14px", fontSize: 13, fontWeight: activa ? 700 : 500, cursor: "pointer",
            background: "none", border: "none", whiteSpace: "nowrap",
            color: activa ? "var(--c-brand-dark)" : "var(--c-text-3)",
            borderBottom: `2px solid ${activa ? "var(--c-brand)" : "transparent"}`, marginBottom: -1,
          }}>
            {it.etiqueta}
            {it.cuenta !== undefined && (
              <span className="num" style={{
                marginLeft: 7, fontSize: 11, fontWeight: 700, padding: "1px 7px", borderRadius: 999,
                background: activa ? "var(--c-brand-bg)" : "var(--c-bg)", color: activa ? "var(--c-brand-dark)" : "var(--c-text-3)",
              }}>
                {it.cuenta}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
