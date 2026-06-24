import { redirect } from "next/navigation";
import { getSessionUid } from "@/lib/auth/session";
import { getMembership, listMembershipsForUser } from "@/lib/tenant/get-memberships";
import { getTenantById } from "@/lib/tenant/resolve-tenant";
import CuentaShell from "@/components/panel/cuenta-shell";

export default async function CuentaLayout({
  children, params,
}: { children: React.ReactNode; params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  const uid = await getSessionUid();
  if (!uid) redirect(`/login?redirect=/panel/${tenantId}`);

  const [membership, tenant, memberships] = await Promise.all([
    getMembership(uid, tenantId),
    getTenantById(tenantId),
    listMembershipsForUser(uid),
  ]);
  if (!membership || !tenant) redirect("/panel");

  return (
    <CuentaShell tenant={tenant} tenantId={tenantId} multiplesEmpresas={memberships.length > 1}>
      {children}
    </CuentaShell>
  );
}
