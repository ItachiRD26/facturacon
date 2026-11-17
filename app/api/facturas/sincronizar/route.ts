import { NextRequest, NextResponse } from "next/server";
import { requireTenantActivo } from "@/lib/tenant/auth";
import { limitar } from "@/lib/seguridad/limite-tasa";
import { registrarAuditoria } from "@/lib/auditoria/registrar";
import { reenviarPendientes, resumenPendientes, sincronizarEstados } from "@/lib/dgii/reenvio";

// Contingencia: GET devuelve cuántos comprobantes están pendientes de llegar a la DGII (solo lectura,
// barato). POST los envía (los más antiguos primero) y actualiza el estado de los ya enviados. El sistema
// de la empresa lo llama solo cada pocos minutos mientras hay internet.
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const tenantId = req.nextUrl.searchParams.get("t") ?? "";
  const v = await requireTenantActivo(tenantId, ["owner", "admin", "vendedor", "contador", "viewer", "almacen"]);
  if (!v.ok) return v.response;
  return NextResponse.json(await resumenPendientes(tenantId));
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as { tenantId?: string } | null;
  const tenantId = body?.tenantId ?? "";
  const v = await requireTenantActivo(tenantId, ["owner", "admin", "vendedor"]);
  if (!v.ok) return v.response;
  // Un solo barrido a la vez por empresa y con tope de frecuencia: la DGII no se martilla.
  const lim = await limitar(req, { nombre: "dgii-sincronizar", id: tenantId, max: 6, ventanaSeg: 60 });
  if (lim) return lim;

  const reenvio = await reenviarPendientes(tenantId, 20);
  const estados = await sincronizarEstados(tenantId, 20);
  // Solo se deja constancia cuando de verdad se envió algo (el sistema consulta esto solo cada pocos minutos).
  const enviados = Number((reenvio as { enviados?: number } | undefined)?.enviados ?? 0);
  if (enviados > 0) await registrarAuditoria({ tenantId, uid: v.uid, accion: "factura.sincronizacion", req, detalle: { enviados } });
  return NextResponse.json({ reenvio, estados, resumen: await resumenPendientes(tenantId) });
}
