"use client";

import type { MetodoPago } from "@/types/pagos";

const MARCA_ESTILO: Record<string, { bg: string; label: string }> = {
  visa:       { bg: "linear-gradient(135deg, #1a1f71, #2d3eb5)", label: "VISA" },
  mastercard: { bg: "linear-gradient(135deg, #1a1a2e, #4a2545)", label: "Mastercard" },
  amex:       { bg: "linear-gradient(135deg, #0f4c75, #1a6fa8)", label: "American Express" },
  otra:       { bg: "linear-gradient(135deg, #374151, #1f2937)", label: "Tarjeta" },
};

export default function PaymentCardVisual({
  metodo, onEliminar, onMarcarPredeterminado,
}: { metodo: MetodoPago; onEliminar: () => void; onMarcarPredeterminado: () => void }) {
  const estilo = MARCA_ESTILO[metodo.marca] ?? MARCA_ESTILO.otra;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{
        background: estilo.bg, borderRadius: 12, padding: "18px 20px", color: "#fff",
        minHeight: 120, display: "flex", flexDirection: "column", justifyContent: "space-between",
        boxShadow: "0 6px 16px rgba(0,0,0,0.15)", position: "relative", fontFamily: "var(--font-sans)",
      }}>
        {metodo.predeterminado && (
          <span style={{
            position: "absolute", top: 12, right: 14, fontSize: 10, fontWeight: 700,
            background: "rgba(255,255,255,0.2)", padding: "2px 8px", borderRadius: 10, letterSpacing: "0.04em",
          }}>
            PREDETERMINADA
          </span>
        )}
        <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.03em", opacity: 0.9 }}>{estilo.label}</div>
        <div>
          <div style={{ fontSize: 17, fontFamily: "var(--font-mono)", letterSpacing: "0.12em", marginBottom: 6 }}>
            •••• •••• •••• {metodo.ultimos4}
          </div>
          <div style={{ fontSize: 11, opacity: 0.8 }}>Vence {metodo.vencimiento}</div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, fontSize: 12 }}>
        {!metodo.predeterminado && (
          <button onClick={onMarcarPredeterminado} style={{
            background: "none", border: "none", color: "var(--c-brand)", fontWeight: 600, cursor: "pointer", padding: 0,
          }}>
            Hacer predeterminada
          </button>
        )}
        <button onClick={onEliminar} style={{
          background: "none", border: "none", color: "#991b1b", fontWeight: 600, cursor: "pointer", padding: 0, marginLeft: "auto",
        }}>
          Eliminar
        </button>
      </div>
    </div>
  );
}
