import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requireRolEnTenant } from "@/lib/tenant/auth";
import { resumenAdicionales, type CargoMes } from "@/lib/payments/adicionales";

// Uso del mes y adicionales (comprobantes y usuarios extra) más los últimos cierres.
// Solo dueño y administradores: es información de facturación de la cuenta.
export async function GET(req: NextRequest) {
  const tenantId = req.nextUrl.searchParams.get("t") ?? "";
  const v = await requireRolEnTenant(tenantId, ["owner", "admin"]);
  if (!v.ok) return v.response;

  const [resumen, cargosSnap] = await Promise.all([
    resumenAdicionales(tenantId),
    adminDb.collection("tenants").doc(tenantId).collection("facturacion").doc("cargos").collection("meses")
      .orderBy("mes", "desc").limit(3).get(),
  ]);
  return NextResponse.json({
    resumen: resumen && { mes: resumen.mes, comprobantes: resumen.comprobantes, usuarios: resumen.usuarios, totalRD: resumen.totalRD },
    cargos: cargosSnap.docs.map((d) => {
      const c = d.data() as CargoMes;
      return { mes: c.mes, estado: c.estado, totalRD: c.totalRD, excedentes: c.excedentes, usuariosExtra: c.usuariosExtra };
    }),
  });
}
