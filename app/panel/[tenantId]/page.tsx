import { redirect } from "next/navigation";
import { getSessionUid } from "@/lib/auth/session";
import { getMembership, listMembershipsForUser } from "@/lib/tenant/get-memberships";
import { getTenantById } from "@/lib/tenant/resolve-tenant";
import { contarComprobantesEsteMes } from "@/lib/tenant/estadisticas";
import Badge from "@/components/ui/badge";

const ESTADO_LABEL: Record<string, string> = {
  demo:                     "Entorno de prueba",
  pendiente_certificacion:  "Pendiente de certificación",
  certificando:             "Certificando ante la DGII",
  activo:                   "Activo",
  suspendido:               "Suspendido",
};

export default async function CuentaTenantPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  const uid = await getSessionUid();
  if (!uid) redirect(`/login?redirect=/panel/${tenantId}`);

  const [membership, tenant, memberships] = await Promise.all([
    getMembership(uid, tenantId),
    getTenantById(tenantId),
    listMembershipsForUser(uid),
  ]);
  if (!membership || !tenant) redirect("/panel");

  const comprobantesEsteMes = await contarComprobantesEsteMes(tenantId);
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN;
  const esCertificado = tenant.estado === "activo" && !!tenant.slug;

  return (
    <main style={{ maxWidth: 860, margin: "48px auto", padding: "0 24px", fontFamily: "var(--font-sans)" }}>
      {memberships.length > 1 && (
        <a href="/panel" style={{ fontSize: 13, color: "var(--c-text-3)", display: "inline-block", marginBottom: 16 }}>
          ← Cambiar de empresa
        </a>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "1.7rem", marginBottom: 6 }}>
            {tenant.nombreNegocio}
          </h1>
          <div style={{ fontSize: 13, color: "var(--c-text-3)" }}>RNC {tenant.rnc} · rol: {membership.rol}</div>
        </div>
        <Badge tipo={esCertificado ? "success" : "warning"}>{ESTADO_LABEL[tenant.estado] ?? tenant.estado}</Badge>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginBottom: 24 }}>
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
            Comprobantes emitidos este mes
          </div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{comprobantesEsteMes}</div>
          <div style={{ fontSize: 12, color: "var(--c-text-3)", marginTop: 4 }}>
            {tenant.estado === "demo" ? "Comprobantes simulados en el entorno de prueba." : "Comprobantes electrónicos reales emitidos a la DGII."}
          </div>
        </div>

        <div style={{ border: "1px solid var(--c-border)", borderRadius: 8, padding: "16px 18px", background: "var(--c-surface)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", color: "var(--c-text-3)", textTransform: "uppercase", marginBottom: 8 }}>
            Desglose de costos
          </div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>RD$ 0.00</div>
          <div style={{ fontSize: 12, color: "var(--c-text-3)", marginTop: 4 }}>
            Aún no se han generado cargos. Verás aquí el detalle una vez tu cuenta esté certificada y activa.
          </div>
        </div>

        <div style={{ border: "1px solid var(--c-border)", borderRadius: 8, padding: "16px 18px", background: "var(--c-surface)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", color: "var(--c-text-3)", textTransform: "uppercase", marginBottom: 8 }}>
            Métodos de pago
          </div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Ninguno configurado</div>
          <div style={{ fontSize: 12, color: "var(--c-text-3)", marginTop: 4 }}>
            Podrás agregar un método de pago cuando inicies el proceso de certificación.
          </div>
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
          y los pasos ante la DGII) — todavía no está disponible aquí. Si quieres que te avisemos en
          cuanto esté listo,{" "}
          <a href="mailto:contacto@facturacon.cfd" style={{ color: "var(--c-brand)", fontWeight: 600 }}>
            escríbenos
          </a>.
        </div>
      )}
    </main>
  );
}
