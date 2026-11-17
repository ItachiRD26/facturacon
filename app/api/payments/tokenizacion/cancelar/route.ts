import { NextRequest, NextResponse } from "next/server";
import { requireAccesoFacturacion } from "@/lib/tenant/auth";
import { cancelarCobroRecurrente } from "@/lib/payments/cobros";
import { registrarAuditoria } from "@/lib/auditoria/registrar";

interface Body { tenantId: string }

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as Body | null;
  if (!body?.tenantId) return NextResponse.json({ error: "Falta tenantId" }, { status: 400 });

  const verif = await requireAccesoFacturacion(body.tenantId);
  if (!verif.ok) return verif.response;

  try {
    const r = await cancelarCobroRecurrente(body.tenantId);
    await registrarAuditoria({ tenantId: body.tenantId, uid: verif.uid, accion: "plan.cancelado", req, detalle: { adicionalesCobradosRD: r.adicionalesCobradosRD } });
    return NextResponse.json({ ok: true, ...r });
  } catch (e) {
    const mensaje = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: `No se pudo cancelar el cobro recurrente: ${mensaje}` }, { status: 502 });
  }
}
