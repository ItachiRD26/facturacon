import { redirect } from "next/navigation";
import { getSessionUid } from "@/lib/auth/session";
import { listMembershipsForUser } from "@/lib/tenant/get-memberships";
import { getTenantById } from "@/lib/tenant/resolve-tenant";
import { adminDb } from "@/lib/firebase-admin";
import LogoutButton from "@/components/panel/logout-button";
import Logo from "@/components/ui/logo";
import type { UserPerfil } from "@/types/tenant";

export default async function PanelPage() {
  const uid = await getSessionUid();
  if (!uid) redirect("/login?redirect=/panel");

  const perfilSnap = await adminDb.collection("users").doc(uid).get();
  const esGestor = (perfilSnap.data() as UserPerfil | undefined)?.tipoCuenta === "gestor";

  const memberships = await listMembershipsForUser(uid);

  // Una cuenta individual está ligada a una sola empresa de forma
  // permanente — no necesita ver esta lista nunca, va directo a su negocio
  // (o a crearlo si todavía no existe). Un gestor sí vive aquí siempre,
  // incluso sin ninguna empresa todavía, porque este es el lugar desde
  // donde agrega la primera y las siguientes.
  if (!esGestor) {
    if (memberships.length === 0) redirect("/onboarding");
    if (memberships.length === 1) redirect(`/panel/${memberships[0].tenantId}`);
  }

  const tenants = await Promise.all(
    memberships.map(async (m) => ({ membership: m, tenant: await getTenantById(m.tenantId) }))
  );

  return (
    <main style={{ maxWidth: 720, margin: "60px auto", padding: "0 24px", fontFamily: "var(--font-sans)" }}>
      <div style={{ marginBottom: 32 }}>
        <Logo size={26} />
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, gap: 12, flexWrap: "wrap" }}>
        <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "1.6rem" }}>
          Tus empresas
        </h1>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <a href="/onboarding" style={{
            padding: "9px 16px", background: "var(--c-brand)", color: "#fff", borderRadius: 6,
            fontSize: 13, fontWeight: 600, textDecoration: "none",
          }}>
            + Agregar empresa
          </a>
          <LogoutButton />
        </div>
      </div>

      {tenants.length === 0 ? (
        <div style={{
          border: "1px dashed var(--c-border)", borderRadius: 8, padding: "48px 24px",
          textAlign: "center", color: "var(--c-text-3)", fontSize: 13,
        }}>
          Todavía no administras ninguna empresa. Agrega la primera para empezar su certificación.
        </div>
      ) : (
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
      )}
    </main>
  );
}
