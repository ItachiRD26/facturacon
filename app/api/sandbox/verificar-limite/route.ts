import { NextRequest, NextResponse } from "next/server";
import { getSessionUid } from "@/lib/auth/session";
import { adminDb } from "@/lib/firebase-admin";
import { getMembership } from "@/lib/tenant/get-memberships";
import { LIMITES_SANDBOX, mensajeLimite, type ColeccionLimitada } from "@/lib/sandbox/limites";

const ETIQUETAS: Record<ColeccionLimitada, string> = {
  clientes: "clientes",
  productos: "productos/servicios",
  facturas_recibidas: "facturas recibidas",
};

// No bloquea la escritura en sí (esa sigue yendo directo a Firestore desde
// el cliente, como el resto de la app) — pero el formulario llama aquí
// primero y no continúa si la respuesta dice que ya se llegó al tope. Es una
// salvaguarda a nivel de aplicación contra scripts que repitan el flujo
// normal una y otra vez, no una garantía a nivel de base de datos.
export async function POST(req: NextRequest) {
  const uid = await getSessionUid();
  if (!uid) return NextResponse.json({ error: "Sesión requerida" }, { status: 401 });

  const body = await req.json().catch(() => null) as { tenantId?: string; coleccion?: ColeccionLimitada } | null;
  if (!body?.tenantId || !body.coleccion || !(body.coleccion in LIMITES_SANDBOX)) {
    return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
  }

  const membership = await getMembership(uid, body.tenantId);
  if (!membership) return NextResponse.json({ error: "Sin acceso a este tenant" }, { status: 403 });

  const tenantSnap = await adminDb.collection("tenants").doc(body.tenantId).get();
  const enModoDemo = tenantSnap.exists && tenantSnap.data()?.estado !== "activo";
  if (!enModoDemo) return NextResponse.json({ ok: true });

  const tope = LIMITES_SANDBOX[body.coleccion];
  const conteo = await adminDb.collection("tenants").doc(body.tenantId).collection(body.coleccion).count().get();
  if (conteo.data().count >= tope) {
    return NextResponse.json({ ok: false, error: mensajeLimite(ETIQUETAS[body.coleccion], tope) }, { status: 429 });
  }
  return NextResponse.json({ ok: true });
}
