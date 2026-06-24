// Verificación compartida por todas las rutas /api/certificacion/* — exige
// sesión + membership owner/admin + tenant en proceso de certificación.
// Evita repetir las mismas 3 comprobaciones en cada route handler.
import "server-only";
import { NextResponse } from "next/server";
import { getSessionUid } from "@/lib/auth/session";
import { getMembership } from "@/lib/tenant/get-memberships";
import { getTenantById } from "@/lib/tenant/resolve-tenant";
import type { Tenant } from "@/types/tenant";

export type VerificacionOk = { ok: true; uid: string; tenant: Tenant };
export type VerificacionError = { ok: false; response: NextResponse };

// `exigirEstado` por defecto acepta "pendiente_certificacion" o
// "certificando" — los dos estados durante los que el wizard está activo.
export async function requireTenantEnCertificacion(
  tenantId: string,
  exigirEstado: Tenant["estado"][] = ["pendiente_certificacion", "certificando"],
): Promise<VerificacionOk | VerificacionError> {
  const uid = await getSessionUid();
  if (!uid) {
    return { ok: false, response: NextResponse.json({ error: "Sesión requerida" }, { status: 401 }) };
  }

  const membership = await getMembership(uid, tenantId);
  if (!membership || (membership.rol !== "owner" && membership.rol !== "admin")) {
    return { ok: false, response: NextResponse.json({ error: "No tienes acceso a esta empresa" }, { status: 403 }) };
  }

  const tenant = await getTenantById(tenantId);
  if (!tenant) {
    return { ok: false, response: NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 }) };
  }

  if (!exigirEstado.includes(tenant.estado)) {
    return { ok: false, response: NextResponse.json({ error: "Esta empresa no está en proceso de certificación." }, { status: 400 }) };
  }

  return { ok: true, uid, tenant };
}
