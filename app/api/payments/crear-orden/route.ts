import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requireTenantEnCertificacion } from "@/lib/certificacion/auth";
import { conectar, crearTransaccion, MONTO_CERTIFICACION_USD } from "@/lib/payments/pagadito";

// Crea la transacción de Pagadito del pago único de certificación e
// inicia el redirect a su página de pago segura. Idempotente respecto a un
// pago ya capturado: si ya está pagado no genera una nueva transacción.
//
// El ERN (identificador de Pagadito) se construye como `cert-${tenantId}`
// para poder recuperar el tenant en /api/payments/retorno sin depender de
// una consulta cross-tenant en Firestore — la URL de retorno configurada en
// el panel de Pagadito debe reenviar el ERN como `{ern_value}`.
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

  try {
    const token = await conectar();
    const ern = `cert-${tenantId}`;
    const { tokenTrans, url } = await crearTransaccion(token, ern, "Certificación como emisor electrónico — Facturacon");

    await ref.set({
      estado: "creada", tokenTrans, ern, montoUSD: MONTO_CERTIFICACION_USD, creadoEn: new Date().toISOString(),
    }, { merge: true });

    return NextResponse.json({ url });
  } catch (e) {
    const mensaje = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: `No se pudo iniciar el pago con Pagadito: ${mensaje}` }, { status: 502 });
  }
}
