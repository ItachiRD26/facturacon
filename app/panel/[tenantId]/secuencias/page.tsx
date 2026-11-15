import { requerirRolPanel } from "@/lib/tenant/panel-acceso";
import SecuenciasClient from "@/components/panel/secuencias-client";

export default async function SecuenciasPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  await requerirRolPanel(tenantId, ["owner", "admin"]);
  return <SecuenciasClient tenantId={tenantId} />;
}
