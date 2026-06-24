import { NextRequest, NextResponse } from "next/server";
import { getSessionUid } from "@/lib/auth/session";
import { adminDb } from "@/lib/firebase-admin";
import { getMembership } from "@/lib/tenant/get-memberships";

// `tenants/{tenantId}/config/secuencias` queda denegado a escritura/lectura
// de cliente en firestore.rules a propósito — es el mismo documento que
// usará el motor e-CF real en producción, y no conviene abrir esa puerta ni
// siquiera para tenants en modo demo. Esta ruta hace la misma transacción
// con el Admin SDK, autenticada por sesión + membership.
export async function POST(req: NextRequest) {
  const uid = await getSessionUid();
  if (!uid) return NextResponse.json({ error: "Sesión requerida" }, { status: 401 });

  const body = await req.json().catch(() => null) as { tenantId?: string; tipo?: string } | null;
  if (!body?.tenantId || !body.tipo) {
    return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
  }

  const membership = await getMembership(uid, body.tenantId);
  if (!membership) return NextResponse.json({ error: "Sin acceso a este tenant" }, { status: 403 });

  const ref = adminDb.collection("tenants").doc(body.tenantId).collection("config").doc("secuencias");
  const siguiente = await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const current = snap.exists ? ((snap.data() as Record<string, number>)[body.tipo!] ?? 0) : 0;
    const next = current + 1;
    tx.set(ref, { [body.tipo!]: next }, { merge: true });
    return next;
  });

  return NextResponse.json({ secuencia: siguiente });
}
