"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { MESES_COBRADOS_ANUAL, PLANES, TARIFAS_ADICIONALES, montoPeriodoRD, textoUsuarios, type Plan, type PeriodoPlan } from "@/lib/payments/planes";

// Selector de plan (Paso 1 del alta de suscripción): tarjetas con el desglose de cada plan, una guía
// para saber cuál conviene según cuántos comprobantes se emiten, y el resumen de lo que se va a pagar.
const rd = (n: number) => `RD$ ${n.toLocaleString("es-DO", { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 })}`;
const nombreDe = (p: Plan) => p.nombre ?? `Plan ${p.facturas.toLocaleString("es-DO")}`;

const INCLUIDO_EN_TODOS = [
  "Facturas, notas de crédito y de débito electrónicas",
  "Clientes, cotizaciones y cuentas por cobrar",
  "Inventario y caja rápida con lector de código",
  "Facturas de tus proveedores (recepción)",
  "Reportes para tu contador (606 y 607)",
  "Certificación ante la DGII sin costo",
];

// Cuánto pagaría en un mes un negocio que emite `n` comprobantes con este plan (mensualidad + extras).
const costoMes = (p: Plan, n: number) => p.montoRD + Math.max(0, n - p.facturas) * p.extraRD;
// Por seguridad, el sistema pausa la emisión al triple del plan (ver /api/facturas/emitir).
const alcanza = (p: Plan, n: number) => n <= p.facturas * 3;

export type { PeriodoPlan };
const precioAnual = (p: Plan) => montoPeriodoRD(p, "anual");

export default function SelectorPlan({ planId, onElegir, onContinuar, periodo, onPeriodo }: {
  planId: string | null; onElegir: (id: string) => void;
  /** Botón al pie de cada plan: elige ese plan y pasa directo al pago, sin bajar hasta el final. */
  onContinuar?: (id: string) => void;
  periodo: PeriodoPlan; onPeriodo: (p: PeriodoPlan) => void;
}) {
  const [cantidad, setCantidad] = useState("");
  const [equipo, setEquipo] = useState(false);
  const n = Number(cantidad);
  const hayCantidad = Number.isInteger(n) && n > 0;

  const recomendado = useMemo(() => {
    if (!hayCantidad) return null;
    const candidatos = PLANES
      .filter((p) => alcanza(p, n) && (!equipo || (!p.soloUnUsuario && p.usuarios >= 2)))
      .sort((a, b) => costoMes(a, n) - costoMes(b, n) || a.facturas - b.facturas);
    return candidatos[0] ?? null;
  }, [n, hayCantidad, equipo]);

  const elegido = PLANES.find((p) => p.id === planId);
  const sobrepasa = hayCantidad && n > PLANES[PLANES.length - 1].facturas * 3;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Mensual / Anual */}
      <div role="group" aria-label="Frecuencia de pago" style={{ display: "inline-flex", alignSelf: "flex-start", border: "1px solid var(--c-border)", borderRadius: 999, padding: 4, background: "var(--c-bg)", gap: 4 }}>
        {([{ v: "mensual", t: "Mensual" }, { v: "anual", t: "Anual · 2 meses gratis" }] as const).map((o) => (
          <button key={o.v} type="button" onClick={() => onPeriodo(o.v)} aria-pressed={periodo === o.v} style={{
            padding: "8px 16px", fontSize: 13, fontWeight: 700, border: "none", borderRadius: 999, cursor: "pointer",
            background: periodo === o.v ? "var(--c-brand)" : "transparent", color: periodo === o.v ? "#fff" : "inherit",
          }}>{o.t}</button>
        ))}
      </div>

      {/* Guía: cuál conviene */}
      <div style={{ border: "1px solid var(--c-brand-border)", background: "var(--c-brand-bg)", borderRadius: 12, padding: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>¿No sabes cuál elegir? Dinos cuánto facturas</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <label style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 8 }}>
            Emito unos
            <input
              inputMode="numeric" value={cantidad} placeholder="ej. 150" aria-label="Comprobantes que emites al mes"
              onChange={(e) => setCantidad(e.target.value.replace(/\D/g, "").slice(0, 6))}
              style={{ width: 90, padding: "7px 9px", border: "1px solid var(--c-border)", borderRadius: 8, fontSize: 13 }}
            />
            comprobantes al mes
          </label>
          <div role="group" aria-label="Quiénes usarán el sistema" style={{ display: "inline-flex", border: "1px solid var(--c-border)", borderRadius: 8, overflow: "hidden", background: "#fff" }}>
            {[{ v: false, t: "Solo yo" }, { v: true, t: "Yo y mi equipo" }].map((o) => (
              <button key={o.t} type="button" onClick={() => setEquipo(o.v)} style={{
                padding: "7px 12px", fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer",
                background: equipo === o.v ? "var(--c-brand)" : "transparent", color: equipo === o.v ? "#fff" : "inherit",
              }}>{o.t}</button>
            ))}
          </div>
        </div>
        {hayCantidad && (
          <div style={{ fontSize: 12, marginTop: 10, lineHeight: 1.5 }}>
            {sobrepasa
              ? <>Con ese volumen conviene un plan a la medida. <Link href="/empresas" style={{ color: "var(--c-brand)", fontWeight: 700 }}>Escríbenos →</Link></>
              : recomendado
                ? <>Te conviene el <strong>{nombreDe(recomendado)}</strong>: pagarías unos <strong>{rd(costoMes(recomendado, n))}</strong> al mes
                    {n > recomendado.facturas && ` (${rd(recomendado.montoRD)} del plan + ${(n - recomendado.facturas).toLocaleString("es-DO")} comprobantes extra)`}.</>
                : "No encontramos un plan para ese volumen con ese equipo."}
          </div>
        )}
      </div>

      {/* Qué incluyen todos */}
      <div style={{ fontSize: 12 }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Incluido en todos los planes</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "4px 14px", color: "var(--c-text-3)" }}>
          {INCLUIDO_EN_TODOS.map((t) => <div key={t}>✓ {t}</div>)}
        </div>
      </div>

      {/* Planes */}
      <div role="group" aria-label="Planes" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(215px, 1fr))", gap: 12 }}>
        {PLANES.map((p) => {
          const activo = planId === p.id;
          const reco = recomendado?.id === p.id;
          return (
            <div key={p.id} onClick={() => onElegir(p.id)} style={{
              position: "relative", textAlign: "left", padding: "16px 14px 14px", borderRadius: 12, cursor: "pointer",
              border: `2px solid ${activo ? "var(--c-brand)" : reco ? "var(--c-brand-border)" : "var(--c-border)"}`,
              background: activo ? "var(--c-brand-bg)" : "#fff", display: "flex", flexDirection: "column", gap: 10,
            }}>
              {(reco || p.soloUnUsuario) && (
                <span style={{ position: "absolute", top: -10, left: 12, fontSize: 10, fontWeight: 800, letterSpacing: 0.4, padding: "3px 8px", borderRadius: 999, background: reco ? "var(--c-brand)" : "var(--c-ink, #0F1A30)", color: "#fff" }}>
                  {reco ? "RECOMENDADO PARA TI" : "PARA EMPEZAR"}
                </span>
              )}
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--c-text-3)" }}>{p.nombre ?? "Plan"}</div>
                <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.1 }}>
                  {p.facturas.toLocaleString("es-DO")} <span style={{ fontSize: 12, fontWeight: 600 }}>comprobantes/mes</span>
                </div>
              </div>
              {periodo === "mensual" ? (
                <div>
                  <div style={{ fontSize: 22, fontWeight: 800 }}>{rd(p.montoRD)}<span style={{ fontSize: 12, fontWeight: 500 }}>/mes</span></div>
                  <div style={{ fontSize: 11, color: "var(--c-text-3)" }}>≈ {rd(p.montoRD / p.facturas)} por comprobante</div>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: 22, fontWeight: 800 }}>{rd(precioAnual(p))}<span style={{ fontSize: 12, fontWeight: 500 }}>/año</span></div>
                  <div style={{ fontSize: 11, color: "var(--c-text-3)" }}>
                    Equivale a {rd(precioAnual(p) / 12)}/mes · <span style={{ color: "#166534", fontWeight: 700 }}>ahorras {rd(p.montoRD * (12 - MESES_COBRADOS_ANUAL))}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--c-text-3)" }}>≈ {rd(precioAnual(p) / 12 / p.facturas)} por comprobante</div>
                </div>
              )}
              <ul style={{ margin: 0, padding: 0, listStyle: "none", fontSize: 12, lineHeight: 1.6, display: "flex", flexDirection: "column", gap: 2 }}>
                <li><strong>{p.soloUnUsuario ? "1 usuario" : `Hasta ${textoUsuarios(p.usuarios)}`}</strong>{p.soloUnUsuario ? " · tú haces todo" : ""}</li>
                <li>Si te pasas: {rd(p.extraRD)} por comprobante extra</li>
                <li>{p.soloUnUsuario ? "Sin usuarios adicionales" : `Usuario adicional: ${rd(TARIFAS_ADICIONALES.usuarioRD)}/mes`}</li>
              </ul>
              <button type="button" onClick={(e) => { e.stopPropagation(); onElegir(p.id); onContinuar?.(p.id); }} aria-label={`Elegir ${nombreDe(p)}`} style={{
                marginTop: "auto", width: "100%", padding: "10px 12px", fontSize: 13, fontWeight: 700, borderRadius: 8, cursor: "pointer",
                border: `1.5px solid var(--c-brand)`, background: activo || reco ? "var(--c-brand)" : "#fff", color: activo || reco ? "#fff" : "var(--c-brand)",
              }}>
                {activo ? "Continuar con este plan →" : "Elegir este plan →"}
              </button>
            </div>
          );
        })}
      </div>

      {/* Resumen */}
      {elegido ? (
        <div style={{ border: "1px solid var(--c-border)", borderRadius: 12, padding: 14, fontSize: 12, lineHeight: 1.6, background: "var(--c-bg)" }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
            Tu plan: {nombreDe(elegido)} · {periodo === "mensual" ? `${rd(elegido.montoRD)}/mes` : `${rd(precioAnual(elegido))} al año (2 meses gratis)`}
          </div>
          Incluye <strong>{elegido.facturas.toLocaleString("es-DO")} comprobantes al mes</strong> y {elegido.soloUnUsuario ? "1 usuario" : textoUsuarios(elegido.usuarios)}.
          Si un mes emites más, cada comprobante extra cuesta {rd(elegido.extraRD)} y se suma a tu siguiente cobro (sin bloqueos, hasta {(elegido.facturas * 3).toLocaleString("es-DO")} al mes por seguridad).
          Los comprobantes incluidos son de cada mes. {periodo === "anual" ? "El plan anual se paga una sola vez al año; los adicionales se acumulan y se suman al pago del año siguiente. " : ""}Al elegir el plan se cobra el primer periodo; después, cada aniversario. Puedes cancelar cuando quieras.
        </div>
      ) : (
        <div style={{ fontSize: 12, color: "var(--c-text-3)" }}>Elige un plan para ver el resumen de lo que pagarás.</div>
      )}

      <div style={{ fontSize: 12, color: "var(--c-text-3)" }}>
        ¿Más de {PLANES[PLANES.length - 1].facturas.toLocaleString("es-DO")} comprobantes al mes? <Link href="/empresas" style={{ color: "var(--c-brand)", fontWeight: 700 }}>Hablemos de un plan a la medida →</Link>
      </div>
    </div>
  );
}
