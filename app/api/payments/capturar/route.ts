import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requireTenantEnCertificacion } from "@/lib/certificacion/auth";
import { capturarOrden, MONTO_CERTIFICACION_USD } from "@/lib/payments/paypal";

// Captura el pago tras la aprobación del usuario en el flujo de botones de
// PayPal. Verifica monto y moneda contra lo esperado antes de marcar el
// pago como capturado — nunca confiamos en lo que mande el cliente, solo en
// la respuesta de PayPal y en el orderId que nosotros mismos guardamos.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const tenantId = body?.tenantId ?? "";
  const orderId = body?.orderId ?? "";
  const verif = await requireTenantEnCertificacion(tenantId);
  if (!verif.ok) return verif.response;

  const ref = adminDb.collection("tenants").doc(tenantId).collection("certificacion").doc("pago");
  const actual = await ref.get();
  const data = actual.data();
  if (data?.estado === "capturada") return NextResponse.json({ ok: true });
  if (!data || data.orderId !== orderId) {
    return NextResponse.json({ error: "La orden no corresponde a esta empresa." }, { status: 400 });
  }

  const captura = await capturarOrden(orderId);
  if (captura.status !== "COMPLETED" || captura.monedaCapturada !== "USD" || captura.montoCapturado !== MONTO_CERTIFICACION_USD) {
    return NextResponse.json({ error: "El pago no se completó correctamente." }, { status: 400 });
  }

  await ref.set({
    estado: "capturada", captureId: captura.id,
    montoCapturado: captura.montoCapturado, monedaCapturada: captura.monedaCapturada,
    capturadoEn: new Date().toISOString(),
  }, { merge: true });

  return NextResponse.json({ ok: true });
}
