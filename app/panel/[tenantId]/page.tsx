import {
  contarComprobantesEsteMes, contarMetodosPago,
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
  const [comprobantesEsteMes, metodosPago, porMes, desglose] = await Promise.all([
    esActivo ? contarComprobantesEsteMes(tenantId) : Promise.resolve(0),
    contarMetodosPago(tenantId),
    esActivo ? obtenerComprobantesPorMes(tenantId) : Promise.resolve([]),
    esActivo ? obtenerDesglosePorEstado(tenantId) : Promise.resolve([]),
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
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Estado de tus facturas</div>
          {!esActivo ? (
            <div style={{ fontSize: 12, color: "var(--c-text-3)" }}>
              Esta métrica se activa cuando tu cuenta esté certificada.
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

      {!esCertificado && (
        <div style={{
          padding: "14px 16px", background: "var(--c-yellow-bg)",
          border: "1px solid var(--c-yellow-border)", borderRadius: 8, fontSize: 13,
        }}>
          <strong>Próximo paso: certificación ante la DGII.</strong> Estamos terminando de construir el
          asistente de certificación (carga de tu certificado de firma digital, validación de tu cédula
          y los pasos ante la DGII) — todavía no está disponible aquí. Si tienes preguntas, visita{" "}
          <a href={`/panel/${tenantId}/soporte`} style={{ color: "var(--c-brand)", fontWeight: 600 }}>
            soporte
          </a>.
        </div>
      )}
    </div>
  );
}
