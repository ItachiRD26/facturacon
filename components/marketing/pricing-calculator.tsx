"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PLANES, VOLUMEN_EMPRESA } from "@/lib/payments/planes";

const MIN = PLANES[0].facturas;
const MAX_PLAN = PLANES[PLANES.length - 1].facturas;   // el plan fijo más grande
const MAX = VOLUMEN_EMPRESA;                            // tope del slider: desde aquí es plan empresarial
const PASO = 50;

const boton = {
  display: "inline-block", padding: "13px 28px", borderRadius: "var(--radius-md)",
  background: "var(--c-brand)", color: "#fff", fontWeight: 700, fontSize: 14.5, textDecoration: "none",
} as const;

// Calculadora en vez de 6 tarjetas en fila: el precio de referencia más bajo se
// comunica arriba ("Desde RD$X al mes") y el usuario ajusta un slider para ver
// exactamente qué plan y precio le toca según su volumen real de comprobantes.
// Los planes fijos llegan hasta MAX_PLAN; por encima el precio se conversa con
// ventas, y desde VOLUMEN_EMPRESA se ofrece un plan empresarial a la medida.
export default function PricingCalculator() {
  const [facturas, setFacturas] = useState(PLANES[2].facturas); // arranca en un punto medio (plan 1000)

  const plan = useMemo(() => PLANES.find((p) => p.facturas >= facturas), [facturas]);
  const empresarial = facturas >= MAX;
  const pct = ((Math.min(facturas, MAX) - MIN) / (MAX - MIN)) * 100;
  const hablarConVentas = `/empresas?volumen=${Math.min(facturas, MAX)}`;

  return (
    <div>
      <div style={{
        background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 16,
        padding: "36px 32px", textAlign: "center", boxShadow: "0 24px 48px rgba(7,16,80,0.35)", color: "var(--c-text-1)",
      }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "var(--c-text-2)", marginBottom: 12 }}>
          ¿Cuántos comprobantes emites al mes?
        </div>

        <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.05rem", fontWeight: 700, color: "var(--c-brand)", marginBottom: 18 }}>
          {empresarial ? `${MAX.toLocaleString("es-DO")}+` : facturas.toLocaleString("es-DO")} comprobantes/mes
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
          <span>{MAX.toLocaleString("es-DO")}+</span>
        </div>

        <div style={{ borderTop: "1px solid var(--c-border-lt)", paddingTop: 28 }}>
          {plan ? (
            <>
              <div style={{ fontWeight: 800, fontSize: "2.2rem", lineHeight: 1, letterSpacing: "-0.03em" }}>
                RD$ {plan.montoRD.toLocaleString("es-DO")}
                <span style={{ fontSize: "1rem", fontWeight: 500, color: "var(--c-text-3)" }}> /mes</span>
              </div>
              <div style={{ fontSize: 13.5, color: "var(--c-text-3)", margin: "8px 0 24px" }}>
                Hasta {plan.facturas.toLocaleString("es-DO")} comprobantes al mes y {plan.usuarios} usuarios incluidos
              </div>
              <Link href="/registro" style={boton}>Empezar con este plan</Link>
            </>
          ) : (
            <>
              <div style={{ fontWeight: 800, fontSize: "1.7rem", lineHeight: 1.1, letterSpacing: "-0.03em", marginBottom: 8 }}>
                {empresarial ? "Plan empresarial" : "Plan a la medida"}
              </div>
              <div style={{ fontSize: 14.5, color: "var(--c-text-2)", lineHeight: 1.55, margin: "0 auto 22px", maxWidth: 360 }}>
                {empresarial
                  ? "Para empresas con 10,000 comprobantes o más al mes: armamos un plan adaptado a tu operación, con atención directa y condiciones acordadas contigo."
                  : `Pasas de ${MAX_PLAN.toLocaleString("es-DO")} comprobantes al mes: armamos un plan según tu volumen y tus usuarios.`}
              </div>
              <Link href={hablarConVentas} style={boton}>Hablar con ventas</Link>
            </>
          )}
        </div>
      </div>

      <p style={{ fontSize: 13.5, color: "rgba(255,255,255,0.8)", marginTop: 18, lineHeight: 1.55 }}>
        ¿Emites 10,000 comprobantes o más al mes?{" "}
        <Link href="/empresas" style={{ color: "#fff", fontWeight: 700 }}>Hablemos de un plan para tu empresa</Link>.
      </p>
      <p style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", marginTop: 8, lineHeight: 1.55 }}>
        Cifras de referencia mientras confirmamos los montos finales; no son precios cerrados
        todavía. Te avisaremos antes de que se active cualquier cobro.
      </p>
    </div>
  );
}
