"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Check, Receipt, Package, ChartBar, Printer, ClipboardText, SealCheck, ShieldCheck, Info,
} from "@phosphor-icons/react/dist/ssr";
import { MESES_COBRADOS_ANUAL, PLANES, TARIFAS_ADICIONALES, VOLUMEN_EMPRESA, montoPeriodoRD, type Plan, type PeriodoPlan } from "@/lib/payments/planes";

// Selector de plan: vive en la página Plan y facturación (no en un modal). Cada plan dice para quién es, qué
// incluye en concreto y cuánto cuesta; debajo se explica qué trae TODO plan y cómo funciona el cobro.
// Al pulsar el botón de un plan se abre solo el modal de pago. Los valores salen de lib/payments/planes.ts.
const rd = (n: number) => `RD$ ${n.toLocaleString("es-DO", { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 })}`;
const nombreDe = (p: Plan) => p.nombre ?? `Plan ${p.facturas.toLocaleString("es-DO")}`;
// Días de venta al mes (lunes a sábado) para traducir el tope a «ventas por día».
const porDia = (p: Plan) => Math.max(1, Math.round(p.facturas / 26));

// Cuánto pagaría en un mes un negocio que emite `n` comprobantes con este plan (mensualidad + extras).
const costoMes = (p: Plan, n: number) => p.montoRD + Math.max(0, n - p.facturas) * p.extraRD;
// Por seguridad, el sistema pausa la emisión al triple del plan (ver /api/facturas/emitir).
const alcanza = (p: Plan, n: number) => n <= p.facturas * 3;

export type { PeriodoPlan };
const precioAnual = (p: Plan) => montoPeriodoRD(p, "anual");

// Lo que trae CUALQUIER plan (la diferencia entre planes es el volumen y el equipo, no las funciones).
const GRUPOS: { icono: ReactNode; titulo: string; puntos: string[] }[] = [
  { icono: <Receipt size={20} weight="duotone" />, titulo: "Facturación electrónica", puntos: [
    "Facturas de consumo y de crédito fiscal, notas de crédito y de débito",
    "Firma y envío a la DGII automáticos",
    "Si la DGII no responde, sigues facturando y se envía después",
  ] },
  { icono: <ClipboardText size={20} weight="duotone" />, titulo: "Clientes y ventas", puntos: [
    "Clientes con su RNC o cédula validados",
    "Cotizaciones que conviertes en factura con un clic",
    "Cuentas por cobrar y registro de cómo te pagan",
  ] },
  { icono: <Package size={20} weight="duotone" />, titulo: "Inventario", puntos: [
    "Productos, precios y existencias",
    "Caja rápida con lector de código de barras",
    "Un acceso para tu encargado de almacén",
  ] },
  { icono: <ChartBar size={20} weight="duotone" />, titulo: "Compras y contabilidad", puntos: [
    "Recepción de las facturas electrónicas de tus proveedores",
    "Reportes 606 y 607 listos para tu contador",
  ] },
  { icono: <Printer size={20} weight="duotone" />, titulo: "Impresión con tu marca", puntos: [
    "Facturas en hoja A4 y en impresora térmica",
    "Con tu logo o, si no tienes, el nombre de tu negocio",
  ] },
  { icono: <ShieldCheck size={20} weight="duotone" />, titulo: "Equipo y seguridad", puntos: [
    "Roles con permisos: cada quien ve solo lo suyo",
    "Los cajeros entran con un código, sin necesitar correo",
    "Tu certificado digital se guarda cifrado",
  ] },
];

const PASOS = [
  { t: "Eliges tu plan", d: "Pones tu tarjeta en un formulario seguro; nadie más la ve." },
  { t: "Se cobra el primer periodo", d: "El día que activas se cobra un mes (o el año, si lo eliges anual)." },
  { t: "Se renueva solo", d: "El mismo día de cada mes, hasta que cancelas. Te avisamos por correo antes si algo falla." },
  { t: "Si te pasas del tope", d: "Sigues facturando sin bloqueos; cada comprobante o usuario extra se suma al siguiente cobro." },
];

function Punto({ children, fuerte }: { children: ReactNode; fuerte?: boolean }) {
  return (
    <li style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 12.5, lineHeight: 1.45, color: fuerte ? "var(--c-text-1)" : "var(--c-text-2)" }}>
      <Check size={14} weight="bold" color="var(--c-green)" style={{ flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
      <span>{children}</span>
    </li>
  );
}

export default function SelectorPlan({ onContinuar, periodo, onPeriodo }: {
  /** Botón de cada plan: abre el pago de ese plan. */
  onContinuar: (id: string) => void;
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
  const sobrepasa = hayCantidad && n > PLANES[PLANES.length - 1].facturas * 3;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      {/* Frecuencia + guía en una franja */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "stretch" }}>
        <div role="group" aria-label="Frecuencia de pago" style={{ display: "inline-flex", alignSelf: "center", border: "1px solid var(--c-border)", borderRadius: 999, padding: 4, background: "#fff", gap: 4 }}>
          {([{ v: "mensual", t: "Mensual" }, { v: "anual", t: "Anual · 2 meses gratis" }] as const).map((o) => (
            <button key={o.v} type="button" onClick={() => onPeriodo(o.v)} aria-pressed={periodo === o.v} style={{
              padding: "8px 16px", fontSize: 13, fontWeight: 700, border: "none", borderRadius: 999, cursor: "pointer",
              background: periodo === o.v ? "var(--c-brand)" : "transparent", color: periodo === o.v ? "#fff" : "inherit",
            }}>{o.t}</button>
          ))}
        </div>

        <div style={{ flex: "1 1 340px", border: "1px solid var(--c-brand-border)", background: "var(--c-brand-bg)", borderRadius: 12, padding: "10px 14px" }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", fontSize: 12.5 }}>
            <b>¿No sabes cuál elegir?</b>
            <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
              Emito unos
              <input
                inputMode="numeric" value={cantidad} placeholder="ej. 150" aria-label="Comprobantes que emites al mes"
                onChange={(e) => setCantidad(e.target.value.replace(/\D/g, "").slice(0, 6))}
                style={{ width: 80, padding: "6px 8px", border: "1px solid var(--c-border)", borderRadius: 8, fontSize: 13 }}
              />
              al mes
            </label>
            <div role="group" aria-label="Quiénes usarán el sistema" style={{ display: "inline-flex", border: "1px solid var(--c-border)", borderRadius: 8, overflow: "hidden", background: "#fff" }}>
              {[{ v: false, t: "Solo yo" }, { v: true, t: "Yo y mi equipo" }].map((o) => (
                <button key={o.t} type="button" onClick={() => setEquipo(o.v)} style={{
                  padding: "6px 11px", fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer",
                  background: equipo === o.v ? "var(--c-brand)" : "transparent", color: equipo === o.v ? "#fff" : "inherit",
                }}>{o.t}</button>
              ))}
            </div>
          </div>
          {hayCantidad && (
            <div style={{ fontSize: 12.5, marginTop: 8, lineHeight: 1.5 }}>
              {sobrepasa
                ? <>Con ese volumen conviene un plan a la medida. <Link href="/empresas" style={{ color: "var(--c-brand)", fontWeight: 700 }}>Escríbenos →</Link></>
                : recomendado
                  ? <>Te conviene el <strong>{nombreDe(recomendado)}</strong>: pagarías unos <strong>{rd(costoMes(recomendado, n))}</strong> al mes
                      {n > recomendado.facturas && ` (${rd(recomendado.montoRD)} del plan + ${(n - recomendado.facturas).toLocaleString("es-DO")} comprobantes extra)`}.</>
                  : "No encontramos un plan para ese volumen con ese equipo."}
            </div>
          )}
        </div>
      </div>

      {/* Planes */}
      <div role="group" aria-label="Planes" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16, alignItems: "stretch" }}>
        {PLANES.map((p) => {
          const reco = recomendado?.id === p.id;
          const solo = !!p.soloUnUsuario;
          return (
            <article key={p.id} aria-label={nombreDe(p)} style={{
              position: "relative", display: "flex", flexDirection: "column", padding: "20px 18px 18px", borderRadius: 14, background: "#fff",
              border: `${reco ? 2 : 1}px solid ${reco ? "var(--c-brand)" : "var(--c-border)"}`,
              boxShadow: reco ? "0 0 0 4px var(--c-brand-bg)" : "0 1px 2px rgba(15,26,48,.04)",
            }}>
              {(reco || solo) && (
                <span style={{ position: "absolute", top: -11, left: 16, fontSize: 10, fontWeight: 800, letterSpacing: 0.5, padding: "3px 9px", borderRadius: 999, background: reco ? "var(--c-brand)" : "var(--c-navy)", color: "#fff" }}>
                  {reco ? "RECOMENDADO PARA TI" : "PARA EMPEZAR"}
                </span>
              )}

              <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 0.4, textTransform: "uppercase", color: "var(--c-brand)" }}>{nombreDe(p)}</div>
              <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.3, marginTop: 4, minHeight: 40 }}>{p.paraQuien}</div>
              <div style={{ fontSize: 12, color: "var(--c-text-3)", lineHeight: 1.45, marginTop: 4, minHeight: 52 }}>{p.ejemplos}</div>

              <div style={{ margin: "14px 0 12px", paddingTop: 14, borderTop: "1px solid var(--c-border-lt)" }}>
                {periodo === "mensual" ? (
                  <>
                    <div className="num-sans" style={{ fontSize: 28, fontWeight: 800, lineHeight: 1.05 }}>{rd(p.montoRD)}<span style={{ fontSize: 13, fontWeight: 600, color: "var(--c-text-3)" }}> /mes</span></div>
                    <div style={{ fontSize: 11.5, color: "var(--c-text-3)", marginTop: 3 }}>≈ {rd(p.montoRD / p.facturas)} por comprobante</div>
                  </>
                ) : (
                  <>
                    <div className="num-sans" style={{ fontSize: 28, fontWeight: 800, lineHeight: 1.05 }}>{rd(precioAnual(p))}<span style={{ fontSize: 13, fontWeight: 600, color: "var(--c-text-3)" }}> /año</span></div>
                    <div style={{ fontSize: 11.5, color: "var(--c-text-3)", marginTop: 3 }}>
                      Equivale a {rd(Math.round(precioAnual(p) / 12))}/mes · <span style={{ color: "var(--c-green)", fontWeight: 700 }}>ahorras {rd(p.montoRD * (12 - MESES_COBRADOS_ANUAL))}</span>
                    </div>
                  </>
                )}
              </div>

              <button type="button" onClick={() => onContinuar(p.id)} aria-label={`Elegir ${nombreDe(p)}`} style={{
                width: "100%", padding: "11px 12px", fontSize: 13.5, fontWeight: 700, borderRadius: 9, cursor: "pointer",
                border: "1.5px solid var(--c-brand)", background: reco ? "var(--c-brand)" : "#fff", color: reco ? "#fff" : "var(--c-brand)",
              }}>
                Elegir este plan →
              </button>

              <ul style={{ margin: "16px 0 0", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 9 }}>
                <Punto fuerte><b className="num-sans">{p.facturas.toLocaleString("es-DO")}</b> comprobantes al mes <span style={{ color: "var(--c-text-3)" }}>(unas {porDia(p)} ventas por día)</span></Punto>
                {solo ? (
                  <Punto fuerte><b>1 usuario:</b> tú eres dueño y cajero a la vez. Facturas, cotizas y manejas tu inventario desde la misma cuenta</Punto>
                ) : (
                  <Punto fuerte><b>Hasta {p.usuarios} usuarios:</b> tú y {p.usuarios - 1} {p.usuarios - 1 === 1 ? "persona más" : "personas más"} (cajeros, almacén o contador), cada uno con su acceso</Punto>
                )}
                <Punto>Todas las funciones del sistema incluidas (detalle más abajo)</Punto>
                <Punto>Si te pasas del tope: {rd(p.extraRD)} por comprobante extra, sin bloqueos</Punto>
                {!solo && <Punto>Usuario adicional: {rd(TARIFAS_ADICIONALES.usuarioRD)} al mes</Punto>}
              </ul>

              {solo && (
                <div style={{ display: "flex", gap: 8, alignItems: "flex-start", marginTop: 14, padding: "9px 10px", borderRadius: 9, background: "var(--c-yellow-bg)", border: "1px solid var(--c-yellow-border)", color: "var(--c-yellow)", fontSize: 11.5, lineHeight: 1.45 }}>
                  <Info size={15} weight="bold" style={{ flexShrink: 0, marginTop: 1 }} aria-hidden="true" />
                  <span>Pensado para negocios pequeños de una sola persona. No admite más usuarios; si tienes cajeros o un equipo, elige el plan de 250.</span>
                </div>
              )}
            </article>
          );
        })}

        <article aria-label="Plan a la medida" style={{ display: "flex", flexDirection: "column", padding: "20px 18px 18px", borderRadius: 14, background: "var(--c-navy)", color: "#fff", border: "1px solid var(--c-navy)" }}>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 0.4, textTransform: "uppercase", color: "var(--c-ticket)" }}>A la medida</div>
          <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.3, marginTop: 4 }}>Más de {PLANES[PLANES.length - 1].facturas.toLocaleString("es-DO")} comprobantes al mes o varias sucursales</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,.72)", lineHeight: 1.5, marginTop: 8 }}>
            Desde {VOLUMEN_EMPRESA.toLocaleString("es-DO")} comprobantes al mes, o si manejas varias sucursales, armamos un plan a tu medida y lo acordamos contigo.
          </div>
          <ul style={{ margin: "16px 0 0", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8, fontSize: 12.5, color: "rgba(255,255,255,.85)" }}>
            <li>• Precio por volumen acordado</li>
            <li>• Varias empresas desde un solo acceso (cuenta gestor)</li>
            <li>• Acompañamiento para configurarlo</li>
          </ul>
          <Link href="/empresas" style={{ marginTop: "auto", paddingTop: 16 }}>
            <span style={{ display: "block", textAlign: "center", padding: "11px 12px", fontSize: 13.5, fontWeight: 700, borderRadius: 9, background: "#fff", color: "var(--c-text-1)" }}>Hablar con ventas →</span>
          </Link>
        </article>
      </div>

      {/* Qué incluye TODO plan */}
      <section aria-labelledby="inc-todos" style={{ background: "#fff", border: "1px solid var(--c-border)", borderRadius: 14, padding: "20px 20px 18px" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
          <h3 id="inc-todos" style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Todos los planes incluyen lo mismo</h3>
          <span style={{ fontSize: 12.5, color: "var(--c-text-3)" }}>Lo que cambia entre planes es el volumen de comprobantes y cuántas personas usan el sistema.</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "18px 22px" }}>
          {GRUPOS.map((g) => (
            <div key={g.titulo}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, color: "var(--c-brand)" }}>
                <span style={{ width: 32, height: 32, borderRadius: 9, background: "var(--c-brand-bg)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{g.icono}</span>
                <b style={{ fontSize: 13.5, color: "var(--c-text-1)" }}>{g.titulo}</b>
              </div>
              <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
                {g.puntos.map((t) => <Punto key={t}>{t}</Punto>)}
              </ul>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 18, paddingTop: 14, borderTop: "1px solid var(--c-border-lt)", fontSize: 12.5, color: "var(--c-text-2)", flexWrap: "wrap" }}>
          <SealCheck size={18} weight="duotone" color="var(--c-green)" aria-hidden="true" />
          <b>Siempre gratis:</b> la certificación ante la DGII y el entorno de prueba con datos de ejemplo.
        </div>
      </section>

      {/* Cómo funciona el cobro */}
      <section aria-labelledby="como-cobra" style={{ background: "var(--c-navy)", color: "#fff", borderRadius: 14, padding: "20px 20px 18px" }}>
        <h3 id="como-cobra" style={{ margin: "0 0 14px", fontSize: 16, fontWeight: 800 }}>Cómo funciona el cobro</h3>
        <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 16 }}>
          {PASOS.map((s, i) => (
            <li key={s.t} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <span className="num" style={{ flexShrink: 0, width: 26, height: 26, borderRadius: "50%", background: "var(--c-ticket)", color: "var(--c-text-1)", fontWeight: 800, fontSize: 13, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{i + 1}</span>
              <span style={{ fontSize: 12.5, lineHeight: 1.5, color: "rgba(255,255,255,.82)" }}><b style={{ color: "#fff", display: "block", fontSize: 13.5 }}>{s.t}</b>{s.d}</span>
            </li>
          ))}
        </ol>
        <div style={{ marginTop: 14, fontSize: 12, color: "rgba(255,255,255,.7)", lineHeight: 1.5 }}>
          Puedes cancelar cuando quieras desde esta misma página. {periodo === "anual" && "En el plan anual se paga una sola vez al año; los adicionales se acumulan y se suman al pago del año siguiente. "}
          El tope de seguridad es el triple de tu plan por mes; pasado ese punto se pausa la emisión hasta que subas de plan.
        </div>
      </section>
    </div>
  );
}
