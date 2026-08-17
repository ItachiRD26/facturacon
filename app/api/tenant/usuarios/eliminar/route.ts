import { NextRequest, NextResponse } from "next/server";
import { requireOwnerOAdmin } from "@/lib/tenant/auth";
import { getMembership, deleteMembership } from "@/lib/tenant/get-memberships";

interface Body { tenantId: string; uid: string }

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as Body | null;
  if (!body?.tenantId || !body.uid) return NextResponse.json({ error: "Faltan datos" }, { status: 400 });

  const verif = await requireOwnerOAdmin(body.tenantId);
  if (!verif.ok) return verif.response;

  const objetivo = await getMembership(body.uid, body.tenantId);
  if (!objetivo) return NextResponse.json({ error: "Esa persona no es parte del equipo." }, { status: 404 });
  if (objetivo.rol === "owner") {
    return NextResponse.json({ error: "No se puede eliminar al dueño de la cuenta." }, { status: 400 });
  }
  if (objetivo.uid === verif.uid) {
    return NextResponse.json({ error: "No puedes eliminarte a ti mismo." }, { status: 400 });
  }

  await deleteMembership(body.uid, body.tenantId);
  return NextResponse.json({ ok: true });
}
