import { requerirRolPanel } from "@/lib/tenant/panel-acceso";
import { contarComprobantesEsteMes } from "@/lib/tenant/estadisticas";
import PlanClient from "@/components/panel/plan-client";

export default async function PlanPage({
  params,
}: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  const { tenant } = await requerirRolPanel(tenantId, ["owner", "admin"]);

  const certificado = tenant.estado === "activo" || tenant.estado === "suspendido";
  // El conteo del mes es un dato secundario: si Firestore tarda o falla, la página de planes igual debe abrir.
  let usoMes = 0;
  if (certificado) {
    try { usoMes = await contarComprobantesEsteMes(tenantId); } catch (e) { console.error("[plan] no se pudo contar los comprobantes del mes", e); }
  }
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
