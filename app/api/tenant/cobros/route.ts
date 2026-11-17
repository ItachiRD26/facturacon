import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requireRolEnTenant } from "@/lib/tenant/auth";
import type { CicloCobro } from "@/types/pagos";

// Historial de cobros del plan (ERN, número de aprobación, monto y fecha de cada uno). Solo dueño y administradores:
// los registros viven en una subcolección que el navegador no puede leer.
export async function GET(req: NextRequest) {
  const tenantId = req.nextUrl.searchParams.get("t") ?? "";
  const v = await requireRolEnTenant(tenantId, ["owner", "admin"]);
  if (!v.ok) return v.response;

  const snap = await adminDb.collection("tenants").doc(tenantId).collection("facturacion").doc("cargos")
    .collection("ciclos").orderBy("creadoEn", "desc").limit(36).get();
  const cobros = snap.docs.map((d) => {
    const c = d.data() as CicloCobro;
    return {
      id: d.id, estado: c.estado, motivo: c.motivo ?? "ciclo", fecha: c.fecha, creadoEn: c.creadoEn,
      planRD: c.planRD, adicionalesRD: c.adicionalesRD, totalRD: c.totalRD, totalUSD: c.totalUSD,
      ern: c.ern, autorizacion: c.autorizacion ?? null, intento: c.intento,
    };
  });
  return NextResponse.json({ cobros });
}
