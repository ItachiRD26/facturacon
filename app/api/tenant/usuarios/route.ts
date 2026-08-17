import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebase-admin";
import { requireOwnerOAdmin } from "@/lib/tenant/auth";
import { listMembershipsForTenant, createMembership } from "@/lib/tenant/get-memberships";
import { ROLES_INVITABLES } from "@/lib/tenant/roles";
import type { RolMembership, UserPerfil } from "@/types/tenant";

// Lista el equipo del tenant con nombre/correo — no se puede armar esto
// desde el cliente porque firestore.rules solo deja leer la membership
// propia de cada quien, nunca la de otros miembros del mismo tenant.
export async function GET(req: NextRequest) {
  const tenantId = req.nextUrl.searchParams.get("t") ?? "";
  const verif = await requireOwnerOAdmin(tenantId);
  if (!verif.ok) return verif.response;

  const memberships = await listMembershipsForTenant(tenantId);
  const equipo = await Promise.all(memberships.map(async (m) => {
    const userSnap = await adminDb.collection("users").doc(m.uid).get();
    const user = userSnap.data() as UserPerfil | undefined;
    return {
      uid: m.uid, rol: m.rol, creadoEn: m.creadoEn,
      nombre: user?.nombre ?? "(sin nombre)", email: user?.email ?? "",
    };
  }));

  return NextResponse.json({ equipo });
}

interface BodyInvitar { tenantId: string; email: string; rol: RolMembership }

// Invita a alguien que YA tiene cuenta de Facturacon (por correo) — no crea
// cuentas nuevas. Si la persona no se ha registrado todavía, se le pide que
// cree su cuenta primero en /registro y luego se le vuelve a invitar.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as BodyInvitar | null;
  if (!body?.tenantId || !body.email?.trim() || !body.rol) {
    return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
  }
  const verif = await requireOwnerOAdmin(body.tenantId);
  if (!verif.ok) return verif.response;

  if (!ROLES_INVITABLES.includes(body.rol)) {
    return NextResponse.json({ error: "Rol inválido." }, { status: 400 });
  }

  let usuario;
  try {
    usuario = await adminAuth.getUserByEmail(body.email.trim());
  } catch {
    return NextResponse.json({
      error: "No encontramos una cuenta de Facturacon con ese correo. Pídele que cree una en /registro primero, y luego invítalo de nuevo.",
    }, { status: 404 });
  }

  const yaEsMiembro = await adminDb.collection("memberships").doc(`${usuario.uid}_${body.tenantId}`).get();
  if (yaEsMiembro.exists) {
    return NextResponse.json({ error: "Esa persona ya es parte de tu equipo." }, { status: 400 });
  }

  await createMembership(usuario.uid, body.tenantId, body.rol);
  return NextResponse.json({ ok: true });
}
