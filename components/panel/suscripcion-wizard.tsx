"use client";

import { useState } from "react";
import Script from "next/script";
import { PLANES, montoPeriodoRD, type PeriodoPlan } from "@/lib/payments/planes";
import Modal from "@/components/modals/modal";
import { Boton } from "@/components/sandbox/ui";
import TutorialButton from "./tutorial-button";
import FormularioTarjeta, { AvisoError, FORM_TARJETA_VACIO, erroresTarjeta, type FormTarjeta } from "./formulario-tarjeta";
import { limpiarDireccion, limpiarLugar, limpiarNombrePersona, limpiarTitular, parseVencimiento, soloDigitos, telefonoParaPagadito } from "@/lib/payments/tarjeta";

// País fijo: República Dominicana (ISO 3166 numérico 214, único mercado que
// atiende Facturacon hoy — ver APPENDIX List of ISO 3166 Country Codes de
// PG-TokenizationPayment.pdf).
const COUNTRY_ID_RD = "214";

declare global {
  interface Window {
    cybs_dfprofiler?: (merchantId: string, environment: "SANDBOX" | "LIVE") => string;
  }
}

// 1 = datos de pago, 2 = listo. El plan y el periodo (mensual/anual) ya se eligieron en la página de Plan y facturación.
type Paso = 1 | 2;

const rd = (n: number) => `RD$ ${n.toLocaleString("es-DO")}`;
const fmtFecha = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString("es-DO", { day: "numeric", month: "long", year: "numeric" });

// Asistente de pago: solo pide los datos de la tarjeta y cobra. El plan se elige antes, en las tarjetas
// de la página de Plan y facturación. Se monta solo mientras está abierto, así cada vez empieza con el formulario limpio.
export default function SuscripcionWizard({
  open, onClose, tenantId, onActivada, ambienteLive = false, planId, periodo, urlSistema,
}: {
  open: boolean; onClose: () => void; tenantId: string; onActivada: () => void;
  ambienteLive?: boolean;
  planId: string | null;
  periodo: PeriodoPlan;
  // Si se pasa, el mensaje final ofrece abrir el sistema ya listo para facturar.
  urlSistema?: string;
}) {
  const [paso, setPaso] = useState<Paso>(1);
  const [form, setForm] = useState<FormTarjeta>(FORM_TARJETA_VACIO);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [scriptListo, setScriptListo] = useState(false);
  const [activada, setActivada] = useState<{
    facturasMes: number; ultimos4?: string; proximoCobroEn?: string;
    comprobante?: { fecha?: string; montoRD?: number; montoUSD?: string; autorizacion?: string; ern?: string };
  } | null>(null);

  const plan = PLANES.find((p) => p.id === planId);
  const monto = plan ? montoPeriodoRD(plan, periodo) : 0;
  const nombrePlan = plan ? (plan.nombre ?? `Plan ${plan.facturas.toLocaleString("es-DO")}`) : "";
  const formValido = Object.keys(erroresTarjeta(form)).length === 0;

  const submit = async () => {
    if (!plan || !formValido || !window.cybs_dfprofiler) return;
    const venc = parseVencimiento(form.venc);
    if (!venc) return;
    setEnviando(true); setError("");
    try {
      const deviceFingerprintID = window.cybs_dfprofiler("pagadito", ambienteLive ? "LIVE" : "SANDBOX");

      const res = await fetch("/api/payments/tokenizacion/suscribir", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId, planId: plan.id, periodo, deviceFingerprintID,
          card: {
            number: soloDigitos(form.numero),
            expirationDate: `${venc.mes}/${venc.anio}`,
            cvv: soloDigitos(form.cvv),
            cardHolderName: limpiarTitular(form.nombreTitular),
            firstName: limpiarNombrePersona(form.nombre), lastName: limpiarNombrePersona(form.apellido),
            email: form.email.trim(),
            billingAddress: {
              city: limpiarLugar(form.ciudad), state: limpiarLugar(form.provincia), zip: "",
              countryId: COUNTRY_ID_RD, line1: limpiarDireccion(form.direccion), phone: telefonoParaPagadito(form.telefono),
            },
          },
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "No se pudo activar el cobro recurrente.");
      setActivada({ facturasMes: data.facturasMes, ultimos4: data.ultimos4, proximoCobroEn: data.proximoCobroEn, comprobante: data.comprobante });
      setPaso(2);
      onActivada();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally { setEnviando(false); }
  };

  const titulo = paso === 1 ? "Datos de pago" : "¡Listo!";

  return (
    <>
      {/* Requerido por Pagadito para evaluar el riesgo de la transacción —
          ver documentacion-pagadito/PG-TokenizationPayment.pdf. */}
      <Script src="/cybs_devicefingerprint.js" strategy="afterInteractive" onReady={() => setScriptListo(true)} />
      <Modal open={open} onClose={onClose} title={titulo} maxWidth={600}>
        {paso === 1 && (
          <form style={{ display: "flex", flexDirection: "column", gap: 16 }} onSubmit={(e) => { e.preventDefault(); void submit(); }} noValidate>
            {plan && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", padding: "12px 14px", borderRadius: 12, background: "var(--c-brand-bg)", border: "1px solid var(--c-brand-border)" }}>
                <div style={{ flex: "1 1 260px", minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 800 }}>{nombrePlan} · {plan.facturas.toLocaleString("es-DO")} comprobantes al mes</div>
                  <div style={{ fontSize: 12, color: "var(--c-text-2)", marginTop: 2 }}>
                    {periodo === "anual" ? "Pago anual (2 meses gratis). Se renueva cada año." : "Pago mensual. Se renueva el mismo día de cada mes."} Cancelas cuando quieras.
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 11, color: "var(--c-text-3)", fontWeight: 700, letterSpacing: 0.4 }}>PAGAS HOY</div>
                  <div className="num-sans" style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.1 }}>{rd(monto)}</div>
                </div>
              </div>
            )}

            <FormularioTarjeta valor={form} onCambio={setForm} deshabilitado={enviando} />

            {error && <AvisoError texto={error} />}

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Boton variant="secondary" onClick={onClose}>Cancelar</Boton>
                <TutorialButton titulo="Cómo activar tu cobro recurrente" />
              </div>
              <Boton type="submit" onClick={() => {}} disabled={!formValido || !scriptListo || enviando || !plan}>
                {enviando ? "Procesando el pago…" : !scriptListo ? "Preparando conexión segura…" : `Pagar ${rd(monto)} y activar el plan`}
              </Boton>
            </div>
          </form>
        )}

        {paso === 2 && activada && (
          <div style={{ textAlign: "center", padding: "16px 0 4px" }}>
            <div style={{
              width: 56, height: 56, borderRadius: "50%", background: "#166534", color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, margin: "0 auto 16px",
            }}>
              ✓
            </div>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>¡Pago recibido! Tu plan está activo</div>
            <p style={{ fontSize: 13, color: "var(--c-text-3)", marginBottom: 20, lineHeight: 1.6 }}>
              Plan de {activada.facturasMes.toLocaleString("es-DO")} comprobantes al mes{periodo === "anual" ? " (pago anual)" : ""}
              {activada.ultimos4 ? ` · tarjeta terminada en ${activada.ultimos4}` : ""}.
              {activada.proximoCobroEn ? <><br />Próximo cobro: <b>{fmtFecha(activada.proximoCobroEn)}</b>.</> : null}
              <br />Ya puedes emitir comprobantes fiscales reales.
            </p>
            {activada.comprobante?.autorizacion && (
              <div style={{ textAlign: "left", margin: "0 auto 20px", maxWidth: 420, border: "1px solid var(--c-border)", borderRadius: 10, padding: "12px 14px", background: "var(--c-bg)", fontSize: 12.5, lineHeight: 1.7 }}>
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.5, color: "var(--c-text-3)", marginBottom: 4 }}>COMPROBANTE DE PAGO</div>
                {activada.comprobante.fecha && <div><span style={{ color: "var(--c-text-3)" }}>Fecha y hora:</span> {new Date(activada.comprobante.fecha).toLocaleString("es-DO", { timeZone: "America/Santo_Domingo", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })}</div>}
                {activada.comprobante.montoRD !== undefined && <div><span style={{ color: "var(--c-text-3)" }}>Monto:</span> <b>RD$ {activada.comprobante.montoRD.toLocaleString("es-DO")}</b>{activada.comprobante.montoUSD ? ` (US$ ${activada.comprobante.montoUSD})` : ""}</div>}
                <div><span style={{ color: "var(--c-text-3)" }}>N.º de aprobación:</span> <b className="num-sans">{activada.comprobante.autorizacion}</b></div>
                {activada.comprobante.ern && <div style={{ wordBreak: "break-all" }}><span style={{ color: "var(--c-text-3)" }}>Referencia (ERN):</span> {activada.comprobante.ern}</div>}
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
              {urlSistema && <a href={urlSistema} style={{ padding: "9px 18px", borderRadius: 6, fontSize: 13, fontWeight: 600, background: "var(--c-brand)", color: "#fff", textDecoration: "none" }}>Abrir mi sistema →</a>}
              <Boton variant="secondary" onClick={onClose}>{urlSistema ? "Cerrar" : "Entendido"}</Boton>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
