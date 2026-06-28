import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { consultarEstado } from "@/lib/payments/pagadito";

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "localhost:3000";

// Pagadito redirige aquí al cliente después de pagar (o cancelar) en su
// página segura. La URL de retorno se configura UNA VEZ en el panel de
// Pagadito (Configuración Técnica → Parámetros de Integración) como:
//
//   https://{ROOT_DOMAIN}/api/payments/retorno?token={value}&ern={ern_value}
//
// No confiamos en que el cliente haya completado bien el redirect (puede
// cerrar la pestaña a mitad de camino) — por eso esta misma ruta vuelve a
// verificar el estado real contra Pagadito vía get_status() antes de marcar
// el pago como capturado, en vez de confiar en los parámetros de la URL.
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";
  const ern = req.nextUrl.searchParams.get("ern") ?? "";
  const tenantId = ern.replace(/^cert-/, "");

  if (!token || !tenantId) {
    return NextResponse.redirect(`https://${ROOT_DOMAIN}/?error=pago-invalido`);
  }

  const ref = adminDb.collection("tenants").doc(tenantId).collection("certificacion").doc("pago");
  const snap = await ref.get();
  const data = snap.data();

  if (!data || data.tokenTrans !== token) {
    return NextResponse.redirect(`https://${ROOT_DOMAIN}/?error=pago-no-coincide`);
  }
  if (data.estado === "capturada") {
    return NextResponse.redirect(`https://${ROOT_DOMAIN}/panel/${tenantId}/certificacion`);
  }

  try {
    const consulta = await consultarEstado(token);
    if (consulta.estado === "COMPLETED") {
      await ref.set({
        estado: "capturada", referenciaPagadito: consulta.referencia,
        fechaTransaccion: consulta.fechaTransaccion, capturadoEn: new Date().toISOString(),
      }, { merge: true });
      return NextResponse.redirect(`https://${ROOT_DOMAIN}/panel/${tenantId}/certificacion`);
    }

    await ref.set({ estado: "fallida", estadoPagadito: consulta.estado }, { merge: true });
    return NextResponse.redirect(`https://${ROOT_DOMAIN}/panel/${tenantId}/certificacion?error=pago-${consulta.estado.toLowerCase()}`);
  } catch {
    return NextResponse.redirect(`https://${ROOT_DOMAIN}/panel/${tenantId}/certificacion?error=pago-verificacion`);
  }
}
