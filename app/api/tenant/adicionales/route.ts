import { NextRequest, NextResponse } from "next/server";
import { requireRolEnTenant } from "@/lib/tenant/auth";
import { resumenAdicionales } from "@/lib/payments/adicionales";

// Uso del mes y adicionales (comprobantes y usuarios extra) que se sumarán al próximo cobro.
// Solo dueño y administradores: es información de facturación de la cuenta.
export async function GET(req: NextRequest) {
  const tenantId = req.nextUrl.searchParams.get("t") ?? "";
  const v = await requireRolEnTenant(tenantId, ["owner", "admin"]);
  if (!v.ok) return v.response;

  const resumen = await resumenAdicionales(tenantId);
  return NextResponse.json({
    resumen: resumen && { mes: resumen.mes, comprobantes: resumen.comprobantes, usuarios: resumen.usuarios, totalRD: resumen.totalRD },
  });
}
