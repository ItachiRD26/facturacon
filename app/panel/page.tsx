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
            border: "1px solid var(--c-border)", borderRadius: 6, padding: "14px 18px",
            background: "var(--c-surface)", display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
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
          </li>
        ))}
      </ul>
    </main>
  );
}
