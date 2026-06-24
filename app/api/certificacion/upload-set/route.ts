import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requireTenantEnCertificacion } from "@/lib/certificacion/auth";
import { parseSetPaso2 } from "@/lib/certificacion/excel";
import type { FilaSetPrueba } from "@/lib/certificacion/tipos";

// Sube el Excel del "set de pruebas" que la DGII le asigna al tenant para el
// Paso 2 (25 comprobantes de ejemplo). Las filas se guardan como mapa
// {encf: FilaSetPrueba} en un solo documento — cada fila se actualiza luego
// de forma independiente (estadoEnvio/trackId) sin reescribir el documento
// completo. firestore.rules ya expone certificacion/{paso} solo lectura al
// cliente; la escritura pasa siempre por aquí (Admin SDK).
export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Formulario inválido" }, { status: 400 });

  const tenantId = form.get("tenantId")?.toString() ?? "";
  const verif = await requireTenantEnCertificacion(tenantId);
  if (!verif.ok) return verif.response;

  const file = form.get("excel");
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "No se recibió el archivo Excel" }, { status: 400 });
  }

  let filas: FilaSetPrueba[];
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    filas = parseSetPaso2(buffer);
  } catch (e) {
    return NextResponse.json({ error: `No se pudo leer el Excel: ${e instanceof Error ? e.message : e}` }, { status: 400 });
  }

  if (filas.length === 0) {
    return NextResponse.json({ error: "El Excel no tiene filas con un eNCF reconocible (columna ENCF)." }, { status: 400 });
  }

  const mapaFilas: Record<string, FilaSetPrueba> = {};
  for (const f of filas) mapaFilas[f.encf] = f;

  await adminDb.collection("tenants").doc(tenantId).collection("certificacion").doc("set_paso2").set({
    filas: mapaFilas,
    totalFilas: filas.length,
    subidoEn: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true, totalFilas: filas.length, filas });
}

export async function GET(req: NextRequest) {
  const tenantId = req.nextUrl.searchParams.get("t") ?? "";
  const verif = await requireTenantEnCertificacion(tenantId);
  if (!verif.ok) return verif.response;

  const snap = await adminDb.collection("tenants").doc(tenantId).collection("certificacion").doc("set_paso2").get();
  if (!snap.exists) return NextResponse.json({ filas: {} });
  return NextResponse.json(snap.data());
}
