import { requerirRolPanel } from "@/lib/tenant/panel-acceso";
import { estadoVerificacion } from "@/lib/auth/mfa";
import { PageHeader } from "@/components/ui/kit";
import SeguridadClient from "@/components/panel/seguridad-client";

// Seguridad de la cuenta de la persona que entró (no de la empresa): verificación en dos pasos.
export const dynamic = "force-dynamic";

const TODOS = ["owner", "admin", "vendedor", "operador", "contador", "viewer"] as const;

export default async function SeguridadPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  const { uid, rol } = await requerirRolPanel(tenantId, [...TODOS]);
  const estado = await estadoVerificacion(uid);
  const esAdmin = rol === "owner" || rol === "admin";

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", fontFamily: "var(--font-sans)" }}>
      <PageHeader titulo="Seguridad de tu cuenta" descripcion="Protege el acceso con un segundo paso: además de tu contraseña, se pide un código de 6 dígitos de tu teléfono." />
      <SeguridadClient activa={estado.activa} correo={estado.correo} correoVerificado={estado.correoVerificado} recomendada={esAdmin} />
    </div>
  );
}
