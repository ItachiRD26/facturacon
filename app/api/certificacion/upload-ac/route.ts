import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requireTenantEnCertificacion } from "@/lib/certificacion/auth";
import { parseACSet } from "@/lib/certificacion/excel";
import { TIPOS_SIN_AC, type ItemAC } from "@/lib/certificacion/tipos";

// Sube el Excel de Aprobaciones Comerciales que la DGII publica en su portal
// para el Paso 3 — descarta filas de tipos que no requieren AC (E32, E41,
// E43, E46, E47) para que la UI no las muestre como pendientes de envío.
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

  let items: ItemAC[];
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    items = parseACSet(buffer).filter((i) => !TIPOS_SIN_AC.has(i.tipoECF));
  } catch (e) {
    return NextResponse.json({ error: `No se pudo leer el Excel: ${e instanceof Error ? e.message : e}` }, { status: 400 });
  }

  if (items.length === 0) {
    return NextResponse.json({ error: "El Excel no tiene filas aplicables a Aprobación Comercial." }, { status: 400 });
  }

  const mapaItems: Record<string, ItemAC> = {};
  for (const it of items) mapaItems[it.encf] = it;

  await adminDb.collection("tenants").doc(tenantId).collection("certificacion").doc("ac_set").set({
    items: mapaItems,
    totalFilas: items.length,
    subidoEn: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true, totalFilas: items.length, items });
}

export async function GET(req: NextRequest) {
  const tenantId = req.nextUrl.searchParams.get("t") ?? "";
  const verif = await requireTenantEnCertificacion(tenantId);
  if (!verif.ok) return verif.response;

  const snap = await adminDb.collection("tenants").doc(tenantId).collection("certificacion").doc("ac_set").get();
  if (!snap.exists) return NextResponse.json({ items: {} });
  return NextResponse.json(snap.data());
}
