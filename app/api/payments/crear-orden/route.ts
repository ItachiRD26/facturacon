import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requireTenantEnCertificacion } from "@/lib/certificacion/auth";
import { crearOrden, MONTO_CERTIFICACION_USD } from "@/lib/payments/paypal";

// Crea (o reutiliza) la orden de PayPal del pago único de certificación.
// Idempotente respecto a una orden ya capturada: si el pago ya está
// capturado no genera una nueva orden ni permite cobrar dos veces.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const tenantId = body?.tenantId ?? "";
  const verif = await requireTenantEnCertificacion(tenantId);
  if (!verif.ok) return verif.response;

  const ref = adminDb.collection("tenants").doc(tenantId).collection("certificacion").doc("pago");
  const actual = await ref.get();
  if (actual.data()?.estado === "capturada") {
    return NextResponse.json({ error: "Ya pagaste la certificación de esta empresa." }, { status: 400 });
  }

  const orden = await crearOrden(tenantId, `cert-${tenantId}`);
  await ref.set({ estado: "creada", orderId: orden.id, montoUSD: MONTO_CERTIFICACION_USD, creadoEn: new Date().toISOString() }, { merge: true });

  return NextResponse.json({ orderId: orden.id });
}
