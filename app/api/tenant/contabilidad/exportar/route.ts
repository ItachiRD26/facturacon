import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requireRolEnTenant } from "@/lib/tenant/auth";
import { aCSV, mesValido, resumenContable } from "@/lib/tenant/contabilidad";

// Descarga el detalle de comprobantes de un mes en CSV (para el contador).
// Solo dueño, administrador y contador — un cajero no debe poder bajar el
// total facturado por todo el negocio.
export async function GET(req: NextRequest) {
  const tenantId = req.nextUrl.searchParams.get("t") ?? "";
  const verif = await requireRolEnTenant(tenantId, ["owner", "admin", "contador"]);
  if (!verif.ok) return verif.response;

  const mes = mesValido(req.nextUrl.searchParams.get("mes") ?? undefined);
  const resumen = await resumenContable(tenantId, mes, verif.tenant.estado !== "activo");

  // Nombres de clientes en una sola lectura, no una por factura.
  const clientesSnap = await adminDb.collection("tenants").doc(tenantId).collection("clientes").select("nombre", "rnc").get();
  const clientes = new Map(clientesSnap.docs.map((d) => [d.id, `${d.get("nombre") ?? ""}${d.get("rnc") ? ` (${d.get("rnc")})` : ""}`]));

  const csv = aCSV(resumen.filas, (f) => clientes.get(f.clienteId) ?? (f.clienteLibre || "Consumidor final"));
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="comprobantes-${mes}.csv"`,
    },
  });
}
