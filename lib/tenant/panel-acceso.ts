import "server-only";
import { redirect } from "next/navigation";
import { getSessionUid } from "@/lib/auth/session";
import { getMembership } from "@/lib/tenant/get-memberships";
import { getTenantById } from "@/lib/tenant/resolve-tenant";
import type { RolMembership, Tenant } from "@/types/tenant";

// Guarda de las pantallas del panel de cuenta (Server Components). El layout
// ya exige sesión + membresía; esto agrega el rol mínimo de cada pantalla y
// devuelve el tenant y el rol para no volver a leerlos. Quien no tiene el
// rol vuelve al resumen, nunca ve una página a medias.
export async function requerirRolPanel(
  tenantId: string, roles: RolMembership[],
): Promise<{ uid: string; rol: RolMembership; tenant: Tenant }> {
  const uid = await getSessionUid();
  if (!uid) redirect(`/login?redirect=/panel/${tenantId}`);
  const [membership, tenant] = await Promise.all([getMembership(uid, tenantId), getTenantById(tenantId)]);
  if (!membership || !tenant) redirect("/panel");
  if (!roles.includes(membership.rol)) redirect(`/panel/${tenantId}`);
  return { uid, rol: membership.rol, tenant };
}
