import {
  contarActividadSandbox, contarComprobantesEsteMes, contarMetodosPago,
  obtenerComprobantesPorMes, obtenerDesglosePorEstado,
} from "@/lib/tenant/estadisticas";
import { getTenantById } from "@/lib/tenant/resolve-tenant";
import Badge from "@/components/ui/badge";
import BarChart from "@/components/ui/bar-chart";

const ESTADO_LABEL: Record<string, string> = {
  demo:                     "Entorno de prueba",
  pendiente_certificacion:  "Pendiente de certificación",
  certificando:             "Certificando ante la DGII",
  activo:                   "Activo",
  suspendido:               "Suspendido",
};

const PASOS_ESTADO: { estado: string; t: string }[] = [
  { estado: "demo",                    t: "Probar el sistema" },
  { estado: "pendiente_certificacion", t: "Subir certificado y cédula" },
  { estado: "certificando",            t: "Certificarte ante la DGII" },
  { estado: "activo",                  t: "Facturar de verdad" },
];

function ProgresoEstado({ estado }: { estado: string }) {
  const idx = PASOS_ESTADO.findIndex((p) => p.estado === estado);
  if (idx === -1) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", marginBottom: 24 }}>
      {PASOS_ESTADO.map((p, i) => (
        <div key={p.estado} style={{ display: "flex", alignItems: "center", flex: i < PASOS_ESTADO.length - 1 ? 1 : "0 0 auto" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flexShrink: 0 }}>
            <div style={{
              width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 700,
              background: i <= idx ? "var(--c-brand)" : "var(--c-bg)",
              color: i <= idx ? "#fff" : "var(--c-text-4)",
              border: i <= idx ? "none" : "1px solid var(--c-border)",
            }}>
              {i < idx ? "✓" : i + 1}
            </div>
            <div style={{ fontSize: 10, color: i <= idx ? "var(--c-text-2)" : "var(--c-text-4)", fontWeight: i === idx ? 700 : 500, textAlign: "center", maxWidth: 92 }}>
              {p.t}
            </div>
          </div>
          {i < PASOS_ESTADO.length - 1 && (
            <div style={{ flex: 1, height: 2, background: i < idx ? "var(--c-brand)" : "var(--c-border)", margin: "0 6px", marginBottom: 18 }} />
          )}
        </div>
      ))}
    </div>
  );
}

const ESTADO_FACTURA_LABEL: Record<string, string> = {
  pagada: "Pagadas", pendiente: "Pendientes", anulada: "Anuladas",
};
const ESTADO_FACTURA_COLOR: Record<string, string> = {
  pagada: "#166534", pendiente: "#92400e", anulada: "#991b1b",
};

export default async function CuentaResumenPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;

  const tenant = await getTenantById(tenantId);
  if (!tenant) return null;

  // Las facturas del entorno de prueba viven en la misma colección que las
  // reales (para que el sandbox se vea/comporte igual), pero son simuladas
  // y no deben contarse como actividad real de negocio en el resumen de
  // cuenta — solo se calculan estas métricas una vez el tenant está activo.
  const esActivo = tenant.estado === "activo";
  const [comprobantesEsteMes, metodosPago, porMes, desglose, actividadSandbox] = await Promise.all([
    esActivo ? contarComprobantesEsteMes(tenantId) : Promise.resolve(0),
    contarMetodosPago(tenantId),
    esActivo ? obtenerComprobantesPorMes(tenantId) : Promise.resolve([]),
    esActivo ? obtenerDesglosePorEstado(tenantId) : Promise.resolve([]),
    !esActivo ? contarActividadSandbox(tenantId) : Promise.resolve(null),
  ]);

  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN;
  const esCertificado = esActivo && !!tenant.slug;
  const totalFacturas = desglose.reduce((acc, d) => acc + d.cantidad, 0);

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", fontFamily: "var(--font-sans)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, gap: 12, flexWrap: "wrap" }}>
        <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "1.5rem" }}>Resumen de cuenta</h1>
        <Badge tipo={esCertificado ? "success" : "warning"}>{ESTADO_LABEL[tenant.estado] ?? tenant.estado}</Badge>
      </div>

      {!esActivo && <ProgresoEstado estado={tenant.estado} />}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginBottom: 20 }}>
        <div style={{ border: "1px solid var(--c-border)", borderRadius: 8, padding: "16px 18px", background: "var(--c-surface)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", color: "var(--c-text-3)", textTransform: "uppercase", marginBottom: 8 }}>
            Plan
          </div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>
            {tenant.estado === "demo" ? "Prueba gratuita" : "Por definir"}
          </div>
          <div style={{ fontSize: 12, color: "var(--c-text-3)", marginTop: 4 }}>
            {tenant.estado === "demo"
              ? "Sin costo mientras pruebas el sistema."
              : "Los planes de suscripción se activan al completar la certificación."}
          </div>
        </div>

        <div style={{ border: "1px solid var(--c-border)", borderRadius: 8, padding: "16px 18px", background: "var(--c-surface)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", color: "var(--c-text-3)", textTransform: "uppercase", marginBottom: 8 }}>
            Comprobantes este mes
          </div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{esActivo ? comprobantesEsteMes : "—"}</div>
          <div style={{ fontSize: 12, color: "var(--c-text-3)", marginTop: 4 }}>
            {esActivo
              ? "Comprobantes electrónicos reales emitidos a la DGII."
              : "Se activa cuando tu cuenta esté certificada. Lo que emitas en el entorno de prueba no cuenta aquí."}
          </div>
        </div>

        <div style={{ border: "1px solid var(--c-border)", borderRadius: 8, padding: "16px 18px", background: "var(--c-surface)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", color: "var(--c-text-3)", textTransform: "uppercase", marginBottom: 8 }}>
            Desglose de costos
          </div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>RD$ 0.00</div>
          <div style={{ fontSize: 12, color: "var(--c-text-3)", marginTop: 4 }}>
            Aún no se han generado cargos. Verás el detalle aquí una vez tu cuenta esté certificada y activa.
          </div>
        </div>

        <a href={`/panel/${tenantId}/metodos-pago`} style={{
          border: "1px solid var(--c-border)", borderRadius: 8, padding: "16px 18px",
          background: "var(--c-surface)", textDecoration: "none", color: "inherit", display: "block",
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", color: "var(--c-text-3)", textTransform: "uppercase", marginBottom: 8 }}>
            Métodos de pago
          </div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>
            {metodosPago === 0 ? "Ninguno configurado" : `${metodosPago} guardado${metodosPago > 1 ? "s" : ""}`}
          </div>
          <div style={{ fontSize: 12, color: "var(--c-brand)", marginTop: 4, fontWeight: 600 }}>
            Administrar →
          </div>
        </a>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 14, marginBottom: 20 }}>
        <div style={{ border: "1px solid var(--c-border)", borderRadius: 8, padding: "18px 20px", background: "var(--c-surface)" }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Comprobantes emitidos — últimos 6 meses</div>
          {esActivo ? <BarChart data={porMes} /> : (
            <div style={{ fontSize: 12, color: "var(--c-text-3)" }}>
              Esta gráfica se activa cuando tu cuenta esté certificada.
            </div>
          )}
        </div>

        <div style={{ border: "1px solid var(--c-border)", borderRadius: 8, padding: "18px 20px", background: "var(--c-surface)" }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>
            {esActivo ? "Estado de tus facturas" : "Tu actividad en el entorno de prueba"}
          </div>
          {!esActivo && actividadSandbox ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
              {[
                { l: "Clientes", v: actividadSandbox.clientes },
                { l: "Productos", v: actividadSandbox.productos },
                { l: "Facturas de prueba", v: actividadSandbox.facturas },
                { l: "Cotizaciones", v: actividadSandbox.cotizaciones },
              ].map((s) => (
                <div key={s.l}>
                  <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "var(--font-serif)" }}>{s.v}</div>
                  <div style={{ fontSize: 11, color: "var(--c-text-3)" }}>{s.l}</div>
                </div>
              ))}
            </div>
          ) : totalFacturas === 0 ? (
            <div style={{ fontSize: 12, color: "var(--c-text-3)" }}>Aún no has emitido facturas.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {desglose.map((d) => (
                <div key={d.estado}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                    <span style={{ color: "var(--c-text-3)" }}>{ESTADO_FACTURA_LABEL[d.estado]}</span>
                    <span style={{ fontWeight: 600 }}>{d.cantidad}</span>
                  </div>
                  <div style={{ height: 6, background: "var(--c-bg)", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{
                      height: "100%", borderRadius: 3,
                      width: `${totalFacturas ? (d.cantidad / totalFacturas) * 100 : 0}%`,
                      background: ESTADO_FACTURA_COLOR[d.estado],
                    }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12,
        border: "1px solid var(--c-border)", borderRadius: 8, padding: "16px 18px", marginBottom: 16,
      }}>
        <div style={{ fontSize: 13 }}>
          {esCertificado
            ? "Tu sistema de facturación electrónica está listo."
            : "Mientras completas la certificación, puedes seguir explorando el sistema con datos de ejemplo."}
        </div>
        {esCertificado ? (
          <a href={`https://${tenant.slug}.${rootDomain}`} style={{
            fontSize: 13, fontWeight: 700, color: "#fff", background: "var(--c-brand)",
            padding: "8px 16px", borderRadius: 6, textDecoration: "none", flexShrink: 0,
          }}>
            Abrir mi sistema →
          </a>
        ) : (
          <a href={`/onboarding/sandbox/dashboard?t=${tenantId}`} style={{
            fontSize: 13, fontWeight: 700, color: "#fff", background: "var(--c-brand)",
            padding: "8px 16px", borderRadius: 6, textDecoration: "none", flexShrink: 0,
          }}>
            Seguir probando →
          </a>
        )}
      </div>

      {tenant.estado === "demo" && (
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12,
          padding: "14px 16px", background: "var(--c-yellow-bg)",
          border: "1px solid var(--c-yellow-border)", borderRadius: 8, fontSize: 13,
        }}>
          <div>
            <strong>Próximo paso: certificación ante la DGII.</strong> Sube tu certificado de firma
            digital y verifica tu cédula para empezar.
          </div>
          <a href={`/onboarding/requisitos?t=${tenantId}`} style={{
            fontSize: 13, fontWeight: 700, color: "#fff", background: "var(--c-brand)",
            padding: "8px 16px", borderRadius: 6, textDecoration: "none", flexShrink: 0,
          }}>
            Comenzar certificación →
          </a>
        </div>
      )}

      {tenant.estado === "pendiente_certificacion" && (
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12,
          padding: "14px 16px", background: "var(--c-yellow-bg)",
          border: "1px solid var(--c-yellow-border)", borderRadius: 8, fontSize: 13,
        }}>
          <div>
            <strong>Certificado y cédula verificados ✓</strong> Sigue con el asistente de
            certificación técnica ante la DGII — son varios pasos, puedes pausar y volver cuando
            quieras.
          </div>
          <a href={`/panel/${tenantId}/certificacion`} style={{
            fontSize: 13, fontWeight: 700, color: "#fff", background: "var(--c-brand)",
            padding: "8px 16px", borderRadius: 6, textDecoration: "none", flexShrink: 0,
          }}>
            Ir al asistente →
          </a>
        </div>
      )}

      {tenant.estado === "certificando" && (
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12,
          padding: "14px 16px", background: "var(--c-brand-bg)",
          border: "1px solid var(--c-brand-border)", borderRadius: 8, fontSize: 13,
        }}>
          <div>
            <strong>Certificación en proceso.</strong> Continúa el asistente donde lo dejaste.
          </div>
          <a href={`/panel/${tenantId}/certificacion`} style={{
            fontSize: 13, fontWeight: 700, color: "#fff", background: "var(--c-brand)",
            padding: "8px 16px", borderRadius: 6, textDecoration: "none", flexShrink: 0,
          }}>
            Continuar →
          </a>
        </div>
      )}
    </div>
  );
}
