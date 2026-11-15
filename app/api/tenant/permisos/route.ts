import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requireRolEnTenant } from "@/lib/tenant/auth";
import { obtenerSuscripcion } from "@/lib/payments/suscripcion";
import { buscarPlan } from "@/lib/payments/planes";
import { limitar } from "@/lib/seguridad/limite-tasa";

// «Quién puede facturar»: interruptores del dueño (Equipo > Permisos).
//  - duenoFactura: «Yo también facturo» (el dueño emite facturas además de los cajeros).
//  - adminFactura: los administradores también emiten.
// Solo el dueño los cambia. En el plan Emprendedor (una sola persona) el dueño siempre factura.
export async function GET(req: NextRequest) {
  const tenantId = req.nextUrl.searchParams.get("t") ?? "";
  const v = await requireRolEnTenant(tenantId, ["owner", "admin"]);
  if (!v.ok) return v.response;
  const sus = await obtenerSuscripcion(tenantId);
  const soloUnUsuario = !!(sus?.estado === "activa" && buscarPlan(sus.planId)?.soloUnUsuario);
  return NextResponse.json({
    duenoFactura: soloUnUsuario || v.tenant.duenoFactura !== false,
    adminFactura: v.tenant.adminFactura === true,
    soloUnUsuario,
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as { tenantId?: string; duenoFactura?: boolean; adminFactura?: boolean } | null;
  const v = await requireRolEnTenant(body?.tenantId ?? "", ["owner"]);
  if (!v.ok) return v.response;
  const lim = await limitar(req, { nombre: "permisos", id: v.uid, max: 30, ventanaSeg: 600 });
  if (lim) return lim;

  const cambios: Record<string, boolean> = {};
  if (typeof body?.duenoFactura === "boolean") { cambios.duenoFactura = body.duenoFactura; cambios.duenoFacturaManual = true; }
  if (typeof body?.adminFactura === "boolean") cambios.adminFactura = body.adminFactura;
  if (Object.keys(cambios).length === 0) return NextResponse.json({ error: "Nada que cambiar." }, { status: 400 });

  await adminDb.collection("tenants").doc(v.tenant.id).update(cambios);
  return NextResponse.json({ ok: true, ...cambios });
}
