import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { cerrarMesYCobrar, mesActual, mesAnterior } from "@/lib/payments/adicionales";

// Cierre mensual de adicionales (comprobantes extra y usuarios extra). Lo llama el
// cron de Vercel el día 1 (ver vercel.json), que manda "Authorization: Bearer
// $CRON_SECRET". Procesa el mes anterior; con ?mes=YYYY-MM se puede reintentar uno
// puntual. Sin CRON_SECRET configurado, la ruta no responde.
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const secreto = process.env.CRON_SECRET;
  if (!secreto || req.headers.get("authorization") !== `Bearer ${secreto}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const mes = req.nextUrl.searchParams.get("mes") ?? mesAnterior(mesActual());
  if (!/^\d{4}-\d{2}$/.test(mes)) return NextResponse.json({ error: "Mes inválido" }, { status: 400 });

  const tenants = await adminDb.collection("tenants").where("estado", "==", "activo").get();
  const resumen = { mes, revisados: 0, sinCargo: 0, cobrados: 0, fallidos: 0, pendientes: 0 };
  for (const t of tenants.docs) {
    resumen.revisados++;
    try {
      const c = await cerrarMesYCobrar(t.id, mes);
      if (!c) continue;
      if (c.estado === "sin_cargo") resumen.sinCargo++;
      else if (c.estado === "cobrado") resumen.cobrados++;
      else if (c.estado === "fallido") resumen.fallidos++;
      else resumen.pendientes++;
    } catch (e) {
      resumen.fallidos++;
      console.error(`[cierre-mensual][${t.id}]`, e instanceof Error ? e.message : e);
    }
  }
  return NextResponse.json(resumen);
}
