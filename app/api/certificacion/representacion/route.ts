import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requireTenantEnCertificacion } from "@/lib/certificacion/auth";
import { CATEGORIAS_RI, ejemploDeCategoria, nombreArchivoRI } from "@/lib/certificacion/categorias-ri";
import { representacionPdf } from "@/lib/certificacion/representacion-impresa";
import type { FacturaPrueba } from "@/lib/certificacion/tipos";
import type { AmbienteDGII } from "@/lib/dgii/qr-builder";

// Paso 5 — representaciones impresas. Sin `cat`: lista las 11 categorías con el
// comprobante de simulación que sirve de ejemplo. Con `cat`: devuelve el PDF de
// ese comprobante, armado desde el XML firmado que ya se envió a la DGII.
export async function GET(req: NextRequest) {
  const tenantId = req.nextUrl.searchParams.get("t") ?? "";
  const cat = req.nextUrl.searchParams.get("cat");
  const verif = await requireTenantEnCertificacion(tenantId);
  if (!verif.ok) return verif.response;

  const certRef = adminDb.collection("tenants").doc(tenantId).collection("certificacion");
  const [pruebasSnap, empresaSnap] = await Promise.all([
    certRef.doc("facturas_prueba").get(),
    adminDb.collection("tenants").doc(tenantId).collection("config").doc("empresa").get(),
  ]);
  const pruebas = Object.values((pruebasSnap.data() ?? {}) as Record<string, FacturaPrueba>);

  if (!cat) {
    return NextResponse.json({
      categorias: CATEGORIAS_RI.map((c) => {
        const p = ejemploDeCategoria(c, pruebas);
        return { id: c.id, etiqueta: c.etiqueta, eCF: p?.eCF ?? null, archivo: p ? nombreArchivoRI(c, p.eCF) : null };
      }),
    });
  }

  const categoria = CATEGORIAS_RI.find((c) => c.id === cat);
  if (!categoria) return NextResponse.json({ error: "Categoría desconocida" }, { status: 400 });
  const ejemplo = ejemploDeCategoria(categoria, pruebas);
  if (!ejemplo) {
    return NextResponse.json({ error: "Todavía no hay un comprobante aceptado de este tipo en el Paso 4." }, { status: 404 });
  }

  const firmado = (await certRef.doc("ecf_firmados").get()).data()?.[ejemplo.eCF] as { xmlFirmado?: string; codigoSeguridad?: string } | undefined;
  if (!firmado?.xmlFirmado) {
    return NextResponse.json({ error: `No se guardó el XML firmado de ${ejemplo.eCF}.` }, { status: 404 });
  }

  const ambiente = (empresaSnap.data()?.ambiente ?? "certecf") as AmbienteDGII;
  try {
    const { pdf } = await representacionPdf(firmado.xmlFirmado, ambiente, firmado.codigoSeguridad);
    return new NextResponse(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${nombreArchivoRI(categoria, ejemplo.eCF)}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("[representacion] no se pudo armar el PDF", e);
    return NextResponse.json({ error: `No se pudo armar el PDF: ${e instanceof Error ? e.message : "error desconocido"}` }, { status: 500 });
  }
}
