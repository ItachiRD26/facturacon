"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

export default function Modal({
  open, onClose, title, children, maxWidth = 520,
}: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode; maxWidth?: number;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.45)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20, zIndex: 1000, animation: "facturacon-backdrop-in 0.15s ease-out",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--c-surface)", borderRadius: 10, width: "100%", maxWidth,
          maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
          animation: "facturacon-modal-in 0.18s ease-out",
        }}
      >
        <div style={{
          position: "sticky", top: 0, background: "var(--c-surface)", zIndex: 1,
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "16px 20px", borderBottom: "1px solid var(--c-border)",
        }}>
          <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "1.05rem", margin: 0 }}>{title}</h2>
          <button onClick={onClose} type="button" aria-label="Cerrar" style={{
            border: "none", background: "transparent", fontSize: 18, cursor: "pointer",
            color: "var(--c-text-3)", lineHeight: 1,
          }}>✕</button>
        </div>
        <div style={{ padding: 20 }}>{children}</div>
      </div>
      <style>{`
        @keyframes facturacon-modal-in { from { opacity: 0; transform: scale(0.97); } to { opacity: 1; transform: scale(1); } }
        @keyframes facturacon-backdrop-in { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>,
    document.body
  );
}
