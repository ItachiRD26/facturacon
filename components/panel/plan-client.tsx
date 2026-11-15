"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/modals/modal";
import { Button, Card, CardTitle, PageHeader, Pill, ProgressBar } from "@/components/ui/kit";
import { useSuscripcion } from "@/hooks/use-suscripcion";
import { PLANES, type Plan } from "@/lib/payments/planes";
import type { EstadoTenant } from "@/types/tenant";
import SuscripcionWizard from "./suscripcion-wizard";
import TutorialButton from "./tutorial-button";
import JornadaProgreso from "./jornada-progreso";
import { etapaActualPara } from "@/lib/tenant/jornada";

const ESTADO_PILL = {
  activa:       { texto: "Activo",        tono: "success" },
  pago_fallido: { texto: "Pago fallido",  tono: "danger" },
  cancelada:    { texto: "Cancelado",     tono: "neutral" },
} as const;

function TarjetaPlan({ plan, onElegir, destacada, soloVer }: { plan: Plan; onElegir?: () => void; destacada?: boolean; soloVer?: boolean }) {
  return (
    <Card padding={18} style={{ display: "flex", flexDirection: "column", gap: 4, borderColor: destacada ? "var(--c-brand)" : undefined, boxShadow: destacada ? "0 0 0 3px var(--c-brand-bg)" : undefined }}>
      <div className="num" style={{ fontSize: 22, fontWeight: 700 }}>{plan.facturas.toLocaleString("es-DO")}</div>
      <div style={{ fontSize: 12, color: "var(--c-text-3)", marginBottom: 10 }}>comprobantes al mes · hasta {plan.usuarios} usuarios</div>
      <div className="num" style={{ fontSize: 18, fontWeight: 700, marginBottom: 14 }}>
        RD$ {plan.montoRD.toLocaleString("es-DO")}<span style={{ fontSize: 12, fontWeight: 500, color: "var(--c-text-3)" }}> /mes</span>
      </div>
      {!soloVer && <Button variante={destacada ? "primary" : "secondary"} onClick={onElegir} full>Elegir este plan</Button>}
    </Card>
  );
}

export default function PlanClient({
  tenantId, estadoTenant, ambienteLive, usoMes, abrirAlInicio, urlSistema,
}: {
  tenantId: string; estadoTenant: EstadoTenant; ambienteLive: boolean; usoMes: number; abrirAlInicio: boolean; urlSistema?: string;
}) {
  const router = useRouter();
  const { suscripcion, loading } = useSuscripcion(tenantId);
  const [wizard, setWizard] = useState<{ abierto: boolean; planId: string | null; saltar: boolean }>({ abierto: abrirAlInicio, planId: null, saltar: false });
  const [confirmarCancelar, setConfirmarCancelar] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const [error, setError] = useState("");

  const certificado = estadoTenant === "activo" || estadoTenant === "suspendido";
  const plan = suscripcion ? PLANES.find((p) => p.id === suscripcion.planId) : undefined;
  const etapa = etapaActualPara(estadoTenant, suscripcion?.estado ?? null);

  const abrir = (planId: string | null, saltar = false) => setWizard({ abierto: true, planId, saltar });

  const cancelar = async () => {
    setCancelando(true); setError("");
    try {
      const res = await fetch("/api/payments/tokenizacion/cancelar", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tenantId }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "No se pudo cancelar.");
      setConfirmarCancelar(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cancelar.");
    } finally { setCancelando(false); }
  };

  if (loading) return <div style={{ maxWidth: 820, margin: "0 auto", fontSize: 13, color: "var(--c-text-3)" }}>Cargando…</div>;

  const proximoCobro = suscripcion?.ultimoPagoEn
    ? new Date(new Date(suscripcion.ultimoPagoEn).setMonth(new Date(suscripcion.ultimoPagoEn).getMonth() + 1)).toLocaleDateString("es-DO", { day: "numeric", month: "long" })
    : null;
  const estado = suscripcion ? ESTADO_PILL[suscripcion.estado] : null;
  const sinPlanActivo = !suscripcion || suscripcion.estado === "cancelada";

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", fontFamily: "var(--font-sans)" }}>
      <PageHeader
        titulo="Plan y facturación"
        descripcion="La certificación ante la DGII es gratis. Pagas una mensualidad según cuántos comprobantes emites, solo desde que estás certificado."
      />

      <Card style={{ marginBottom: 22 }}>
        <JornadaProgreso actual={etapa} completa={etapa === "facturar"} />
      </Card>

      {/* ── Antes de certificarse: explica cuándo y cómo se paga ── */}
      {!certificado && (
        <>
          <Card style={{ marginBottom: 22, background: "var(--c-brand-bg)", borderColor: "var(--c-brand-border)" }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>Todavía no tienes que pagar nada</div>
            <p style={{ fontSize: 13, color: "var(--c-text-2)", lineHeight: 1.6 }}>
              Primero te certificas con la DGII, sin costo. Cuando termines, aquí mismo eliges tu plan y agregas tu tarjeta en dos minutos para empezar a emitir comprobantes reales.
              Estos son los planes que podrás elegir:
            </p>
          </Card>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
            {PLANES.map((p) => <TarjetaPlan key={p.id} plan={p} soloVer />)}
          </div>
        </>
      )}

      {/* ── Certificado y sin plan: elegir ── */}
      {certificado && sinPlanActivo && (
        <>
          {suscripcion?.estado === "cancelada" && (
            <div style={{ padding: "11px 14px", marginBottom: 16, borderRadius: "var(--radius-md)", fontSize: 13, background: "var(--c-yellow-bg)", border: "1px solid var(--c-yellow-border)", color: "var(--c-yellow)" }}>
              Cancelaste tu cobro recurrente. No puedes emitir comprobantes reales hasta que actives un plan de nuevo.
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>Elige cuántos comprobantes necesitas al mes</div>
            <TutorialButton titulo="Cómo activar tu cobro recurrente" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
            {PLANES.map((p) => <TarjetaPlan key={p.id} plan={p} onElegir={() => abrir(p.id, true)} destacada={p.id === suscripcion?.planId} />)}
          </div>
          <p style={{ fontSize: 12, color: "var(--c-text-3)", marginTop: 14, lineHeight: 1.55 }}>
            Se cobra cada mes a tu tarjeta de forma automática hasta que canceles. Tu tarjeta se envía directo a Pagadito, nuestra pasarela de pago; nunca pasa por los servidores de Facturacon.
          </p>
        </>
      )}

      {/* ── Pago fallido ── */}
      {suscripcion?.estado === "pago_fallido" && (
        <Card style={{ marginBottom: 18, background: "var(--c-red-bg)", borderColor: "var(--c-red-border)" }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: "var(--c-red)", marginBottom: 6 }}>No pudimos cobrar tu última mensualidad</div>
          <p style={{ fontSize: 13, color: "var(--c-red)", lineHeight: 1.55, marginBottom: 14 }}>
            Tu cuenta está pausada para emitir comprobantes. Tus datos y facturas están a salvo; confirma tu tarjeta y se reactiva al instante.
          </p>
          <Button onClick={() => abrir(suscripcion.planId, true)}>Arreglar mi pago ahora →</Button>
        </Card>
      )}

      {/* ── Plan activo ── */}
      {suscripcion && suscripcion.estado === "activa" && (
        <>
          <Card style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14, flexWrap: "wrap", marginBottom: 18 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 17, fontWeight: 700 }}>Plan de <span className="num">{suscripcion.facturasMes.toLocaleString("es-DO")}</span> comprobantes al mes</span>
                  {estado && <Pill tono={estado.tono}>{estado.texto}</Pill>}
                </div>
                <div className="num" style={{ fontSize: 13, color: "var(--c-text-3)" }}>
                  {plan ? `RD$ ${plan.montoRD.toLocaleString("es-DO")} al mes` : null}
                  {plan && plan.usuarios ? ` · hasta ${plan.usuarios} usuarios` : null}
                </div>
              </div>
              {urlSistema && <Button href={urlSistema}>Abrir mi sistema →</Button>}
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--c-text-3)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Uso este mes</div>
            <div className="num" style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
              {usoMes.toLocaleString("es-DO")} de {suscripcion.facturasMes.toLocaleString("es-DO")} comprobantes
            </div>
            <ProgressBar valor={usoMes} maximo={suscripcion.facturasMes} />
          </Card>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14, marginBottom: 16 }}>
            <Card padding={18}>
              <CardTitle>Método de pago</CardTitle>
              <div style={{ fontSize: 14, fontWeight: 600 }}>
                {suscripcion.ultimos4 ? <>Tarjeta terminada en <span className="num">{suscripcion.ultimos4}</span></> : "Sin tarjeta registrada"}
              </div>
              {suscripcion.cardHolderName && <div style={{ fontSize: 12, color: "var(--c-text-3)", marginTop: 2 }}>{suscripcion.cardHolderName}</div>}
              <div style={{ marginTop: 12 }}>
                <Button variante="secondary" tamano="sm" onClick={() => abrir(suscripcion.planId, true)}>Cambiar tarjeta</Button>
              </div>
            </Card>
            <Card padding={18}>
              <CardTitle>Próximo cobro</CardTitle>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{proximoCobro ? `Alrededor del ${proximoCobro}` : "Se calcula con tu primer cobro"}</div>
              <div style={{ fontSize: 12, color: "var(--c-text-3)", marginTop: 2 }}>Mensual, automático, en pesos al cambio del día.</div>
            </Card>
          </div>

          <Card padding={18}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
              <div style={{ fontSize: 12.5, color: "var(--c-text-3)", lineHeight: 1.55, maxWidth: 520 }}>
                ¿Necesitas más comprobantes o usuarios? Escríbenos desde <strong>Ayuda y soporte</strong> y cambiamos tu plan. Si cancelas, dejarás de poder emitir comprobantes reales.
              </div>
              <Button variante="danger" tamano="sm" onClick={() => setConfirmarCancelar(true)}>Cancelar cobro recurrente</Button>
            </div>
          </Card>
        </>
      )}

      {error && <div role="alert" style={{ fontSize: 13, color: "var(--c-red)", marginTop: 12 }}>{error}</div>}

      <SuscripcionWizard
        open={wizard.abierto} onClose={() => setWizard((w) => ({ ...w, abierto: false }))} tenantId={tenantId}
        ambienteLive={ambienteLive} planIdActual={wizard.planId ?? suscripcion?.planId} saltarPlan={wizard.saltar}
        urlSistema={urlSistema} onActivada={() => router.refresh()}
      />

      <Modal open={confirmarCancelar} onClose={() => setConfirmarCancelar(false)} title="¿Cancelar el cobro recurrente?" maxWidth={440}>
        <p style={{ fontSize: 13, color: "var(--c-text-2)", lineHeight: 1.6, marginBottom: 18 }}>
          Tu plan dejará de renovarse y no podrás emitir comprobantes reales hasta que lo actives de nuevo. Tus facturas anteriores y tu certificación se conservan.
        </p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Button variante="secondary" onClick={() => setConfirmarCancelar(false)}>Mantener mi plan</Button>
          <Button variante="danger" onClick={cancelar} disabled={cancelando}>{cancelando ? "Cancelando…" : "Sí, cancelar"}</Button>
        </div>
      </Modal>
    </div>
  );
}
