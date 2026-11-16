import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requireTenantEnCertificacion } from "@/lib/certificacion/auth";
import type { FacturaPrueba } from "@/lib/certificacion/tipos";

// La DGII reinicia TODO el lote de simulación cuando rechaza un comprobante:
// los que estaban Aceptados dejan de valer y hay que regenerarlos con eNCF nuevos.
// Aquí se marcan como "Reiniciado" los comprobantes de simulación (Paso 4) que no
// son el rechazado, para que la pantalla no los dé por buenos. El rechazado conserva
// su estado y su mensaje.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const tenantId = body?.tenantId ?? "";
  const verif = await requireTenantEnCertificacion(tenantId);
  if (!verif.ok) return verif.response;

  const ref = adminDb.collection("tenants").doc(tenantId).collection("certificacion").doc("facturas_prueba");
  const snap = await ref.get();
  const datos = (snap.data() ?? {}) as Record<string, FacturaPrueba>;
  const cambios: Record<string, string> = {};
  for (const [eCF, p] of Object.entries(datos)) {
    if (p.descripcion?.startsWith("Simulación #") && !/rechazad|reiniciad/i.test(p.estadoDGII ?? "")) {
      cambios[`${eCF}.estadoDGII`] = "Reiniciado";
    }
  }
  if (Object.keys(cambios).length > 0) await ref.update(cambios);
  return NextResponse.json({ ok: true, reiniciados: Object.keys(cambios).length });
}
