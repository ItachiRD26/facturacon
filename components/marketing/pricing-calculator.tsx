"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PLANES } from "@/lib/payments/planes";

const MIN = PLANES[0].facturas;
const MAX = PLANES[PLANES.length - 1].facturas;
const PASO = 50;

// Calculadora en vez de 6 tarjetas en fila — el precio de referencia más
// bajo se comunica arriba ("Desde RD$X/mes") y el usuario ajusta un slider
// para ver exactamente qué plan y precio le toca según su volumen real de
// comprobantes, sin tener que comparar tarjetas una por una.
export default function PricingCalculator() {
  const [facturas, setFacturas] = useState(PLANES[2].facturas); // arranca en un punto medio (plan 1000)

  const plan = useMemo(() => PLANES.find((p) => p.facturas >= facturas), [facturas]);
  const aMedida = !plan;

  const pct = ((Math.min(facturas, MAX) - MIN) / (MAX - MIN)) * 100;

  return (
    <div style={{ maxWidth: 560, margin: "0 auto" }}>
      <div style={{
        background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 16,
        padding: "36px 32px", textAlign: "center",
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--c-text-3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
          ¿Cuántos comprobantes emites al mes?
        </div>

        <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.05rem", fontWeight: 700, color: "var(--c-brand)", marginBottom: 18 }}>
          {facturas >= MAX ? `${MAX}+` : facturas.toLocaleString("es-DO")} comprobantes/mes
        </div>

        <div style={{ position: "relative", padding: "0 2px", marginBottom: 8 }}>
          <div style={{
            position: "absolute", left: 0, right: 0, top: "50%", height: 4, borderRadius: 2,
            background: "var(--c-border)", transform: "translateY(-50%)", pointerEvents: "none",
          }} />
          <div style={{
            position: "absolute", left: 0, top: "50%", height: 4, borderRadius: 2, width: `${pct}%`,
            background: "var(--c-brand)", transform: "translateY(-50%)", pointerEvents: "none",
          }} />
          <input
            type="range" min={MIN} max={MAX} step={PASO} value={Math.min(facturas, MAX)}
            onChange={(e) => setFacturas(Number(e.target.value))}
            className="price-slider" aria-label="Comprobantes por mes"
            style={{ position: "relative", width: "100%", margin: 0 }}
          />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--c-text-4)", marginBottom: 32, fontFamily: "var(--font-mono)" }}>
          <span>{MIN}</span>
          <span>{MAX}+</span>
        </div>

        <div style={{ borderTop: "1px solid var(--c-border-lt)", paddingTop: 28 }}>
          {aMedida ? (
            <>
              <div style={{ fontFamily: "var(--font-serif)", fontSize: "1.6rem", fontWeight: 700, marginBottom: 6 }}>
                Plan a medida
              </div>
              <div style={{ fontSize: 12.5, color: "var(--c-text-3)", marginBottom: 20 }}>
                Más de {MAX.toLocaleString("es-DO")} comprobantes/mes — hablemos de lo que necesitas.
              </div>
              <a href="mailto:contacto@facturacon.com.do" style={{
                display: "inline-block", padding: "12px 28px", borderRadius: "var(--radius)",
                background: "var(--c-brand)", color: "#fff", fontWeight: 700, fontSize: 13, textDecoration: "none",
              }}>
                Escríbenos
              </a>
            </>
          ) : (
            <>
              <div style={{ fontFamily: "var(--font-serif)", fontSize: "2.2rem", fontWeight: 700, lineHeight: 1 }}>
                RD$ {plan.montoRD.toLocaleString("es-DO")}
                <span style={{ fontSize: "1rem", fontWeight: 500, color: "var(--c-text-3)" }}> /mes</span>
              </div>
              <div style={{ fontSize: 12.5, color: "var(--c-text-3)", margin: "8px 0 24px" }}>
                Hasta {plan.facturas.toLocaleString("es-DO")} comprobantes/mes · {plan.usuarios} usuarios incluidos
              </div>
              <Link href={`/registro?plan=${plan.id}`} style={{
                display: "inline-block", padding: "12px 28px", borderRadius: "var(--radius)",
                background: "var(--c-brand)", color: "#fff", fontWeight: 700, fontSize: 13, textDecoration: "none",
              }}>
                Empezar con este plan →
              </Link>
            </>
          )}
        </div>
      </div>

      <p style={{ fontSize: 12, color: "var(--c-text-4)", marginTop: 20 }}>
        Cifras de referencia mientras confirmamos los montos finales — no son precios cerrados
        todavía. Te avisaremos antes de que se active cualquier cobro.
      </p>
    </div>
  );
}
