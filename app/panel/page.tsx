import { redirect } from "next/navigation";
import { getSessionUid } from "@/lib/auth/session";
import { listMembershipsForUser } from "@/lib/tenant/get-memberships";
import { getTenantById } from "@/lib/tenant/resolve-tenant";

export default async function PanelPage() {
  const uid = await getSessionUid();
  if (!uid) redirect("/login?redirect=/panel");

  const memberships = await listMembershipsForUser(uid);
  if (memberships.length === 0) redirect("/onboarding");

  const tenants = await Promise.all(
    memberships.map(async (m) => ({ membership: m, tenant: await getTenantById(m.tenantId) }))
  );

  return (
    <main style={{ maxWidth: 720, margin: "60px auto", padding: "0 24px", fontFamily: "var(--font-sans)" }}>
      <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "1.6rem", marginBottom: 24 }}>
        Tus empresas
      </h1>

      <ul style={{ display: "flex", flexDirection: "column", gap: 12, listStyle: "none" }}>
        {tenants.map(({ membership, tenant }) => (
          <li key={membership.tenantId} style={{
            border: "1px solid var(--c-border)", borderRadius: 6, padding: "16px 18px",
            background: "var(--c-surface)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: tenant?.estado === "demo" ? 14 : 0 }}>
              <div>
                <div style={{ fontWeight: 600 }}>{tenant?.nombreNegocio ?? "(sin nombre)"}</div>
                <div style={{ fontSize: 12, color: "var(--c-text-3)" }}>
                  RNC {tenant?.rnc ?? "—"} · estado: {tenant?.estado ?? "—"} · rol: {membership.rol}
                </div>
              </div>
              {tenant?.estado === "activo" && tenant.slug && (
                <a href={`https://${tenant.slug}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}`}
                   style={{ fontSize: 13, color: "var(--c-brand)", fontWeight: 600 }}>
                  Abrir sistema →
                </a>
              )}
              {tenant?.estado === "demo" && (
                <a href={`/onboarding/sandbox/dashboard?t=${membership.tenantId}`}
                   style={{ fontSize: 13, color: "var(--c-brand)", fontWeight: 600 }}>
                  Seguir probando →
                </a>
              )}
            </div>

            {tenant?.estado === "demo" && (
              <div style={{
                padding: "12px 14px", background: "var(--c-yellow-bg)",
                border: "1px solid var(--c-yellow-border)", borderRadius: 6, fontSize: 13,
              }}>
                <strong>Próximo paso: certificación ante la DGII.</strong> Estamos terminando de
                construir el asistente de certificación (carga de tu certificado de firma digital,
                validación de tu cédula y los pasos ante la DGII) — todavía no está disponible aquí.
                Mientras tanto, puedes seguir probando el sistema completo con datos de ejemplo.
                Si quieres que te avisemos en cuanto esté listo,{" "}
                <a href="mailto:contacto@facturacon.cfd" style={{ color: "var(--c-brand)", fontWeight: 600 }}>
                  escríbenos
                </a>.
              </div>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
