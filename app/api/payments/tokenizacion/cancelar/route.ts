import { NextRequest, NextResponse } from "next/server";
import { requireTenantActivo } from "@/lib/tenant/auth";
import { cancelarCobroRecurrente } from "@/lib/payments/suscripcion";

interface Body { tenantId: string }

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as Body | null;
  if (!body?.tenantId) return NextResponse.json({ error: "Falta tenantId" }, { status: 400 });

  const verif = await requireTenantActivo(body.tenantId, ["owner", "admin"]);
  if (!verif.ok) return verif.response;

  try {
    await cancelarCobroRecurrente(body.tenantId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const mensaje = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: `No se pudo cancelar el cobro recurrente: ${mensaje}` }, { status: 502 });
  }
}
