import { redirect } from "next/navigation";
import { getSessionUid } from "@/lib/auth/session";
import { listMembershipsForUser } from "@/lib/tenant/get-memberships";
import { getTenantById } from "@/lib/tenant/resolve-tenant";
import LogoutButton from "@/components/panel/logout-button";

export default async function PanelPage() {
  const uid = await getSessionUid();
  if (!uid) redirect("/login?redirect=/panel");

  const memberships = await listMembershipsForUser(uid);
  if (memberships.length === 0) redirect("/onboarding");
  if (memberships.length === 1) redirect(`/panel/${memberships[0].tenantId}`);

  const tenants = await Promise.all(
    memberships.map(async (m) => ({ membership: m, tenant: await getTenantById(m.tenantId) }))
  );

  return (
    <main style={{ maxWidth: 720, margin: "60px auto", padding: "0 24px", fontFamily: "var(--font-sans)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, gap: 12, flexWrap: "wrap" }}>
        <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "1.6rem" }}>
          Tus empresas
        </h1>
        <LogoutButton />
      </div>

      <ul style={{ display: "flex", flexDirection: "column", gap: 12, listStyle: "none" }}>
        {tenants.map(({ membership, tenant }) => (
          <li key={membership.tenantId}>
            <a href={`/panel/${membership.tenantId}`} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              border: "1px solid var(--c-border)", borderRadius: 6, padding: "16px 18px",
              background: "var(--c-surface)", textDecoration: "none", color: "inherit",
            }}>
              <div>
                <div style={{ fontWeight: 600 }}>{tenant?.nombreNegocio ?? "(sin nombre)"}</div>
                <div style={{ fontSize: 12, color: "var(--c-text-3)" }}>
                  RNC {tenant?.rnc ?? "—"} · estado: {tenant?.estado ?? "—"} · rol: {membership.rol}
                </div>
              </div>
              <span style={{ fontSize: 13, color: "var(--c-brand)", fontWeight: 600, flexShrink: 0 }}>
                Ver cuenta →
              </span>
            </a>
          </li>
        ))}
      </ul>
    </main>
  );
}
