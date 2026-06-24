import { NextRequest, NextResponse } from "next/server";
import { getSessionUid } from "@/lib/auth/session";
import { adminDb } from "@/lib/firebase-admin";
import { getMembership } from "@/lib/tenant/get-memberships";
import { LIMITES_SANDBOX, mensajeLimite } from "@/lib/sandbox/limites";

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

  const tenantSnap = await adminDb.collection("tenants").doc(body.tenantId).get();
  const enModoDemo = tenantSnap.exists && tenantSnap.data()?.estado !== "activo";

  const ref = adminDb.collection("tenants").doc(body.tenantId).collection("config").doc("secuencias");
  try {
    const siguiente = await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const data = (snap.exists ? snap.data() : {}) as Record<string, number>;
      const current = data[body.tipo!] ?? 0;

      if (enModoDemo) {
        const totalActual = Object.values(data).reduce((s, n) => s + (n || 0), 0);
        if (totalActual >= LIMITES_SANDBOX.secuencias) {
          throw new Error(mensajeLimite("comprobantes y cotizaciones de prueba", LIMITES_SANDBOX.secuencias));
        }
      }

      const next = current + 1;
      tx.set(ref, { [body.tipo!]: next }, { merge: true });
      return next;
    });
    return NextResponse.json({ secuencia: siguiente });
  } catch (err) {
    const mensaje = err instanceof Error ? err.message : "No se pudo generar el número de secuencia";
    return NextResponse.json({ error: mensaje }, { status: 429 });
  }
}
