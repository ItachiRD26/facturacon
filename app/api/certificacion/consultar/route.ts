import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requireTenantEnCertificacion } from "@/lib/certificacion/auth";
import { getToken, consultarEstado } from "@/lib/dgii/dgii-client";
import { obtenerCertificado } from "@/lib/kms/p12-vault";
import type { FilaSetPrueba } from "@/lib/certificacion/tipos";
import type { EmpresaConfig } from "@/types/tenant";

// Consulta el estado de un eNCF ya enviado por su trackId — usado por el
// polling del cliente mientras espera que la DGII acepte la "compuerta"
// (ver dependenciasDeEnvio en mapeo.ts) antes de enviar las notas E33/E34.
export async function GET(req: NextRequest) {
  const tenantId = req.nextUrl.searchParams.get("t") ?? "";
  const encf     = req.nextUrl.searchParams.get("encf") ?? "";
  const verif = await requireTenantEnCertificacion(tenantId);
  if (!verif.ok) return verif.response;
  if (!encf) return NextResponse.json({ error: "Falta el eNCF" }, { status: 400 });

  const certRef = adminDb.collection("tenants").doc(tenantId).collection("certificacion");
  // origen=prueba → comprobante de simulación del Paso 4 (facturas_prueba); si no, fila del set del Paso 2.
  const esPrueba = req.nextUrl.searchParams.get("origen") === "prueba";
  const setRef = esPrueba ? certRef.doc("facturas_prueba") : certRef.doc("set_paso2");
  const [setSnap, empresaSnap] = await Promise.all([
    setRef.get(),
    adminDb.collection("tenants").doc(tenantId).collection("config").doc("empresa").get(),
  ]);
  if (!setSnap.exists || !empresaSnap.exists) {
    return NextResponse.json({ error: "Falta el set de pruebas o los datos de empresa" }, { status: 400 });
  }

  const campo = esPrueba ? encf : `filas.${encf}`;
  const fila = esPrueba
    ? (setSnap.data()?.[encf] as { trackId?: string } | undefined)
    : ((setSnap.data()?.filas ?? {}) as Record<string, FilaSetPrueba>)[encf];
  if (!fila?.trackId) return NextResponse.json({ error: `${encf} no tiene trackId — aún no se envió` }, { status: 400 });

  const empresa = empresaSnap.data() as EmpresaConfig;
  const tenant = { tenantId, rnc: empresa.rnc, ambiente: empresa.ambiente };

  try {
    const token = await getToken(tenant, async () => obtenerCertificado(tenantId));
    const resultado = await consultarEstado(fila.trackId, tenant, token);

    await setRef.update({ [`${campo}.estadoDGII`]: resultado.estado, [`${campo}.mensajesDGII`]: resultado.mensajes });
    return NextResponse.json(resultado);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
