import { requerirRolPanel } from "@/lib/tenant/panel-acceso";
import { contarComprobantesEsteMes } from "@/lib/tenant/estadisticas";
import PlanClient from "@/components/panel/plan-client";

export default async function PlanPage({
  params, searchParams,
}: { params: Promise<{ tenantId: string }>; searchParams: Promise<{ activar?: string }> }) {
  const { tenantId } = await params;
  const { activar } = await searchParams;
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
      // ?activar=1 lo manda el botón "Elegir mi plan" del resumen: abre directo el asistente de pago.
      abrirAlInicio={activar === "1" && certificado}
      urlSistema={certificado && tenant.slug ? `https://${tenant.slug}.${rootDomain}` : undefined}
    />
  );
}
