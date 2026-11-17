import { requerirRolPanel } from "@/lib/tenant/panel-acceso";
import { contarComprobantesEsteMes } from "@/lib/tenant/estadisticas";
import PlanClient from "@/components/panel/plan-client";

export default async function PlanPage({
  params,
}: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  const { tenant } = await requerirRolPanel(tenantId, ["owner", "admin"]);

  const certificado = tenant.estado === "activo" || tenant.estado === "suspendido";
  const usoMes = certificado ? await contarComprobantesEsteMes(tenantId) : 0;
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN;

  return (
    <PlanClient
      tenantId={tenantId}
      estadoTenant={tenant.estado}
      ambienteLive={process.env.PAGADITO_ENV === "live"}
      usoMes={usoMes}
      urlSistema={certificado && tenant.slug ? `https://${tenant.slug}.${rootDomain}` : undefined}
    />
  );
}
