// Verificación compartida por las rutas del sistema real (Fase 7) — exige
// sesión + membership con permiso de operar + tenant ya "activo" (con
// certificación de la DGII completada). Análogo a
// lib/certificacion/auth.ts pero para el otro lado del ciclo de vida del
// tenant: ese exige estar EN proceso de certificación, este exige haberlo
// terminado.
import "server-only";
import { NextResponse } from "next/server";
import { getSessionUid } from "@/lib/auth/session";
import { getMembership } from "@/lib/tenant/get-memberships";
import { getTenantById } from "@/lib/tenant/resolve-tenant";
import type { Tenant, RolMembership } from "@/types/tenant";

export type VerificacionOk = { ok: true; uid: string; tenant: Tenant; rol: RolMembership };
export type VerificacionError = { ok: false; response: NextResponse };

const ROLES_OPERATIVOS: RolMembership[] = ["owner", "admin", "vendedor"];

export async function requireTenantActivo(
  tenantId: string,
  roles: RolMembership[] = ROLES_OPERATIVOS,
): Promise<VerificacionOk | VerificacionError> {
  const uid = await getSessionUid();
  if (!uid) {
    return { ok: false, response: NextResponse.json({ error: "Sesión requerida" }, { status: 401 }) };
  }

  const membership = await getMembership(uid, tenantId);
  if (!membership || !roles.includes(membership.rol)) {
    return { ok: false, response: NextResponse.json({ error: "No tienes permiso para esta acción" }, { status: 403 }) };
  }

  const tenant = await getTenantById(tenantId);
  if (!tenant) {
    return { ok: false, response: NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 }) };
  }
  if (tenant.estado !== "activo") {
    return { ok: false, response: NextResponse.json({ error: "Esta empresa todavía no está certificada/activa." }, { status: 400 }) };
  }

  return { ok: true, uid, tenant, rol: membership.rol };
}

// Para gestión de equipo/roles — a diferencia de requireTenantActivo, no
// exige que el tenant esté certificado (se puede armar el equipo desde el
// sandbox), solo que quien llama sea owner o admin.
export async function requireOwnerOAdmin(tenantId: string): Promise<VerificacionOk | VerificacionError> {
  const uid = await getSessionUid();
  if (!uid) {
    return { ok: false, response: NextResponse.json({ error: "Sesión requerida" }, { status: 401 }) };
  }
  const membership = await getMembership(uid, tenantId);
  if (!membership || (membership.rol !== "owner" && membership.rol !== "admin")) {
    return { ok: false, response: NextResponse.json({ error: "No tienes permiso para esta acción" }, { status: 403 }) };
  }
  const tenant = await getTenantById(tenantId);
  if (!tenant) {
    return { ok: false, response: NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 }) };
  }
  return { ok: true, uid, tenant, rol: membership.rol };
}
