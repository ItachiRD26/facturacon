import { NextRequest, NextResponse } from "next/server";
import { requireOwnerOAdmin } from "@/lib/tenant/auth";
import { getMembership, updateMembershipRol } from "@/lib/tenant/get-memberships";
import { ROLES_INVITABLES } from "@/lib/tenant/roles";
import type { RolMembership } from "@/types/tenant";

interface Body { tenantId: string; uid: string; rol: RolMembership }

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as Body | null;
  if (!body?.tenantId || !body.uid || !body.rol) {
    return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
  }
  const verif = await requireOwnerOAdmin(body.tenantId);
  if (!verif.ok) return verif.response;

  if (!ROLES_INVITABLES.includes(body.rol)) {
    return NextResponse.json({ error: "Rol inválido." }, { status: 400 });
  }

  const objetivo = await getMembership(body.uid, body.tenantId);
  if (!objetivo) return NextResponse.json({ error: "Esa persona no es parte del equipo." }, { status: 404 });
  if (objetivo.rol === "owner") {
    return NextResponse.json({ error: "No se puede cambiar el rol del dueño de la cuenta." }, { status: 400 });
  }

  await updateMembershipRol(body.uid, body.tenantId, body.rol);
  return NextResponse.json({ ok: true });
}
