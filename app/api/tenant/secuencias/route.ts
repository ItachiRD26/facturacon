import { NextRequest, NextResponse } from "next/server";
import { requireRolEnTenant } from "@/lib/tenant/auth";
import { registrarAuditoria } from "@/lib/auditoria/registrar";
import { ErrorSecuencia, guardarRango, leerSecuencias, registrarCantidad } from "@/lib/tenant/secuencias-fiscales";
import type { TipoECF } from "@/types";

// Secuencias fiscales autorizadas por la DGII. Solo dueño/administrador:
// definen qué números de e-NCF puede emitir la empresa.
export async function GET(req: NextRequest) {
  const tenantId = req.nextUrl.searchParams.get("t") ?? "";
  const v = await requireRolEnTenant(tenantId, ["owner", "admin"]);
  if (!v.ok) return v.response;
  return NextResponse.json({ secuencias: await leerSecuencias(tenantId) });
}

export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => null) as { tenantId?: string; tipo?: TipoECF; cantidad?: number; desde?: number; hasta?: number; vencimiento?: string } | null;
  const v = await requireRolEnTenant(body?.tenantId ?? "", ["owner", "admin"]);
  if (!v.ok) return v.response;
  try {
    if (body!.cantidad !== undefined) {
      // Camino normal: el usuario solo dice cuántos comprobantes pidió; el rango y el vencimiento se calculan.
      await registrarCantidad(body!.tenantId!, body!.tipo as TipoECF, Number(body!.cantidad));
    } else {
      // Avanzado: la DGII autorizó una numeración distinta a la esperada.
      await guardarRango(body!.tenantId!, body!.tipo as TipoECF, {
        desde: Number(body!.desde), hasta: Number(body!.hasta), vencimiento: String(body!.vencimiento ?? ""),
      });
    }
    await registrarAuditoria({
      tenantId: body!.tenantId!, uid: v.uid, accion: "secuencias.cambio", recurso: String(body!.tipo ?? ""), req,
      detalle: body!.cantidad !== undefined
        ? { cantidad: Number(body!.cantidad) }
        : { desde: Number(body!.desde), hasta: Number(body!.hasta), vencimiento: String(body!.vencimiento ?? "") },
    });
    return NextResponse.json({ ok: true, secuencias: await leerSecuencias(body!.tenantId!) });
  } catch (e) {
    if (e instanceof ErrorSecuencia) return NextResponse.json({ error: e.message }, { status: 400 });
    return NextResponse.json({ error: "No se pudo guardar la secuencia." }, { status: 500 });
  }
}
