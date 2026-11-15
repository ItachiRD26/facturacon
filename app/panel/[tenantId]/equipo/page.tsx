import { requerirRolPanel } from "@/lib/tenant/panel-acceso";
import EquipoClient from "@/components/panel/equipo-client";

export default async function EquipoPage({
  params, searchParams,
}: { params: Promise<{ tenantId: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { tenantId } = await params;
  const { tab } = await searchParams;
  const { rol } = await requerirRolPanel(tenantId, ["owner", "admin"]);

  return (
    <EquipoClient
      tenantId={tenantId}
      esOwner={rol === "owner"}
      tabInicial={tab === "admins" || tab === "permisos" ? tab : "personal"}
    />
  );
}
