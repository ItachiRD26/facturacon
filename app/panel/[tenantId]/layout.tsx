import { redirect } from "next/navigation";
import { getSessionUid } from "@/lib/auth/session";
import { getMembership, listMembershipsForUser } from "@/lib/tenant/get-memberships";
import { getTenantById } from "@/lib/tenant/resolve-tenant";
import CuentaShell from "@/components/panel/cuenta-shell";
import SesionFirebase from "@/components/tenant/sesion-firebase";

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
    <SesionFirebase uid={uid} bloquear={false}>
      <CuentaShell tenant={tenant} tenantId={tenantId} multiplesEmpresas={memberships.length > 1} rol={membership.rol}>
        {children}
      </CuentaShell>
    </SesionFirebase>
  );
}
