import Link from "next/link";
import { requerirRolPanel } from "@/lib/tenant/panel-acceso";
import { calcularJornada } from "@/lib/tenant/jornada";
import { cupoUsuarios } from "@/lib/tenant/limite-usuarios";
import { obtenerSuscripcion } from "@/lib/payments/suscripcion";
import { buscarPlan } from "@/lib/payments/planes";
import { resumenContable, mesValido } from "@/lib/tenant/contabilidad";
import { contarActividadSandbox, contarComprobantesEsteMes, obtenerComprobantesPorMes } from "@/lib/tenant/estadisticas";
import { fmt } from "@/types";
import BarChart from "@/components/ui/bar-chart";
import { Button, Card, CardTitle, PageHeader, Pill, ProgressBar, StatCard, th, td, tablaWrap } from "@/components/ui/kit";
import JornadaProgreso from "@/components/panel/jornada-progreso";

const TODOS = ["owner", "admin", "vendedor", "contador", "viewer"] as const;

export default async function CuentaResumenPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  const { tenant, rol } = await requerirRolPanel(tenantId, [...TODOS]);

  const esActivo = tenant.estado === "activo";
  const esAdmin = rol === "owner" || rol === "admin";
  const veContabilidad = esAdmin || rol === "contador";
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN;

  const [suscripcion, cupo, contab, usoMes, porMes, sandbox] = await Promise.all([
    esAdmin ? obtenerSuscripcion(tenantId) : Promise.resolve(null),
    esAdmin ? cupoUsuarios(tenantId) : Promise.resolve(null),
    esActivo && veContabilidad ? resumenContable(tenantId, mesValido(undefined), false) : Promise.resolve(null),
    esActivo && esAdmin ? contarComprobantesEsteMes(tenantId) : Promise.resolve(0),
    esActivo && veContabilidad ? obtenerComprobantesPorMes(tenantId) : Promise.resolve([]),
    !esActivo && veContabilidad ? contarActividadSandbox(tenantId) : Promise.resolve(null),
  ]);

  const jornada = calcularJornada({
    tenantId, estado: tenant.estado, suscripcion: suscripcion?.estado ?? null,
    urlSistema: tenant.slug ? `https://${tenant.slug}.${rootDomain}` : undefined,
  });
  const plan = suscripcion?.estado === "activa" ? buscarPlan(suscripcion.planId) : undefined;
  const { accion } = jornada;
  const variacion = contab && contab.totalMesAnterior > 0
    ? ((contab.total - contab.totalMesAnterior) / contab.totalMesAnterior) * 100 : null;

  return (
    <div style={{ maxWidth: 1040, margin: "0 auto", fontFamily: "var(--font-sans)" }}>
      <PageHeader
        titulo={tenant.nombreNegocio}
        descripcion={esAdmin ? "Estado de tu cuenta, tu avance y lo más importante de tu negocio." : "Resumen de la empresa."}
      />

      {esAdmin && (
        <Card padding={0} style={{ marginBottom: 20, overflow: "hidden" }}>
          <div style={{ padding: "22px 24px 8px" }}>
            <JornadaProgreso etapas={jornada.etapas} />
          </div>
          <div style={{
            margin: "14px 0 0", padding: "20px 24px", display: "flex", justifyContent: "space-between",
            alignItems: "center", gap: 20, flexWrap: "wrap",
            background: jornada.problemaDePago ? "var(--c-red-bg)" : jornada.completa ? "var(--c-green-bg)" : "var(--c-brand-bg)",
            borderTop: "1px solid var(--c-border)",
          }}>
            <div style={{ flex: "1 1 360px", minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{accion.titulo}</div>
              <p style={{ fontSize: 13, color: "var(--c-text-2)", lineHeight: 1.55 }}>{accion.detalle}</p>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {accion.secundaria && <Button variante="secondary" href={accion.secundaria.href}>{accion.secundaria.cta}</Button>}
              <Button href={accion.href} tamano="lg">{accion.cta} →</Button>
            </div>
          </div>
        </Card>
      )}

      {/* ── Cifras ── */}
      {esActivo && contab ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 14, marginBottom: 20 }}>
          <StatCard
            etiqueta={`Facturado en ${contab.etiquetaMes.split(" ")[0]}`}
            valor={`RD$ ${fmt(contab.total)}`}
            nota={variacion === null ? "Primer mes con movimiento" : `${variacion >= 0 ? "▲" : "▼"} ${Math.abs(variacion).toFixed(0)}% vs. mes anterior`}
            tono={variacion !== null && variacion < 0 ? "warning" : "success"}
            href={`/panel/${tenantId}/contabilidad`}
          />
          <StatCard etiqueta="Por cobrar" valor={`RD$ ${fmt(contab.porCobrar)}`} nota="Facturas a crédito pendientes" href={`/panel/${tenantId}/contabilidad`} />
          {esAdmin && plan ? (
            <Card padding={18}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--c-text-3)", marginBottom: 10 }}>
                Uso del plan
              </div>
              <div className="num" style={{ fontSize: 24, fontWeight: 700, marginBottom: 10 }}>
                {usoMes.toLocaleString("es-DO")} <span style={{ fontSize: 13, fontWeight: 500, color: "var(--c-text-3)" }}>/ {plan.facturas.toLocaleString("es-DO")}</span>
              </div>
              <ProgressBar valor={usoMes} maximo={plan.facturas} />
            </Card>
          ) : (
            <StatCard etiqueta="Comprobantes del mes" valor={contab.comprobantes.toLocaleString("es-DO")} nota={contab.anulados ? `${contab.anulados} anulados` : "Sin anulaciones"} />
          )}
          {esAdmin && cupo && (
            <StatCard
              etiqueta="Equipo" href={`/panel/${tenantId}/equipo`}
              valor={cupo.incluidos ? `${cupo.usados} / ${cupo.incluidos}` : cupo.usados}
              nota="Personas con acceso a tu sistema"
            />
          )}
        </div>
      ) : sandbox ? (
        <Card style={{ marginBottom: 20 }}>
          <CardTitle extra={<Pill tono="warning">Datos de prueba</Pill>}>Lo que has probado hasta ahora</CardTitle>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 16 }}>
            {[
              { l: "Clientes", v: sandbox.clientes },
              { l: "Productos", v: sandbox.productos },
              { l: "Facturas de prueba", v: sandbox.facturas },
              { l: "Cotizaciones", v: sandbox.cotizaciones },
            ].map((s) => (
              <div key={s.l}>
                <div className="num" style={{ fontSize: 24, fontWeight: 700 }}>{s.v}</div>
                <div style={{ fontSize: 12, color: "var(--c-text-3)" }}>{s.l}</div>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 12, color: "var(--c-text-3)", marginTop: 14 }}>
            Nada de esto se envía a la DGII. Cuando estés certificado, tus cifras reales aparecerán aquí.
          </p>
        </Card>
      ) : null}

      {/* ── Actividad ── */}
      {esActivo && contab && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 14 }}>
          <Card>
            <CardTitle>Comprobantes emitidos · últimos 6 meses</CardTitle>
            <BarChart data={porMes} />
          </Card>
          <Card padding={0}>
            <div style={{ padding: "18px 20px 12px" }}>
              <CardTitle extra={<Link href={`/panel/${tenantId}/contabilidad`} style={{ color: "var(--c-brand)", fontWeight: 600, textDecoration: "none" }}>Ver contabilidad →</Link>}>
                Últimos comprobantes
              </CardTitle>
            </div>
            {contab.ultimas.length === 0 ? (
              <p style={{ fontSize: 12, color: "var(--c-text-3)", padding: "0 20px 20px" }}>Todavía no has emitido comprobantes este mes.</p>
            ) : (
              <div style={{ ...tablaWrap, border: "none", borderRadius: 0 }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead><tr><th style={th}>e-CF</th><th style={th}>Fecha</th><th style={{ ...th, textAlign: "right" }}>Total</th></tr></thead>
                  <tbody>
                    {contab.ultimas.slice(0, 5).map((f) => (
                      <tr key={f.id}>
                        <td style={{ ...td, fontFamily: "var(--font-mono)", fontSize: 12 }}>{f.eCF}</td>
                        <td style={{ ...td, color: "var(--c-text-3)" }}>{f.fecha}</td>
                        <td className="num" style={{ ...td, textAlign: "right", fontWeight: 600 }}>RD$ {fmt(f.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ── Accesos directos para quien no es dueño/administrador ── */}
      {!esAdmin && (
        <Card>
          <CardTitle>Tu acceso</CardTitle>
          <p style={{ fontSize: 13, color: "var(--c-text-3)", lineHeight: 1.55, marginBottom: 14 }}>
            {rol === "contador"
              ? "Como contador puedes consultar la contabilidad y descargar los comprobantes de cada mes."
              : "Tu trabajo diario está en el sistema de la empresa."}
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {veContabilidad && <Button href={`/panel/${tenantId}/contabilidad`}>Ir a contabilidad</Button>}
            {tenant.slug && rol !== "contador" && <Button variante="secondary" href={`https://${tenant.slug}.${rootDomain}`}>Abrir el sistema</Button>}
          </div>
        </Card>
      )}
    </div>
  );
}
