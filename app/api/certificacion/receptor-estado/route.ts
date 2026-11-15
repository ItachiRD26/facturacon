import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requireTenantEnCertificacion } from "@/lib/certificacion/auth";

// Evidencia, desde NUESTRA base de datos, de que la DGII realmente llamó a los
// servicios receptor de esta empresa (/fe/*) durante las pruebas de
// certificación. El portal de la DGII a veces muestra "pendiente" aunque ya
// llegaron las llamadas, o al revés: esto deja ver qué pasó de verdad.
export async function GET(req: NextRequest) {
  const tenantId = req.nextUrl.searchParams.get("t") ?? "";
  const verif = await requireTenantEnCertificacion(tenantId);
  if (!verif.ok) return verif.response;

  const base = adminDb.collection("tenants").doc(tenantId);

  const resumen = async (coleccion: string, campoFecha: string) => {
    const snap = await base.collection(coleccion).orderBy(campoFecha, "desc").limit(50).get();
    // Solo cuentan los que llegaron por el receptor (traen el XML original):
    // en el sandbox del onboarding se pueden registrar recibidas a mano.
    const docs = snap.docs.map((d) => d.data()).filter((d) => !!d.xmlRecibido);
    return { total: docs.length, ultima: (docs[0]?.[campoFecha] as string | undefined) ?? null, hayMas: snap.size === 50 };
  };

  const [recepcion, aprobaciones, semillas] = await Promise.all([
    resumen("facturas_recibidas", "recibidoEn"),
    resumen("acecf_recibidas", "recibidoEn"),
    base.collection("receptor_semillas").where("usada", "==", true).count().get(),
  ]);

  return NextResponse.json({
    slug: verif.tenant.slug ?? null,
    autenticaciones: semillas.data().count,
    recepcion,
    aprobaciones,
  });
}
