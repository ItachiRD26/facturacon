import { requerirRolPanel } from "@/lib/tenant/panel-acceso";
import CertificadoClient from "@/components/panel/certificado-client";

export default async function CertificadoPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  await requerirRolPanel(tenantId, ["owner", "admin"]);
  return <CertificadoClient tenantId={tenantId} />;
}
