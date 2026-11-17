import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { reenviarPendientes, sincronizarEstados } from "@/lib/dgii/reenvio";

// Red de seguridad diaria: envía a la DGII lo que haya quedado pendiente y actualiza estados, aunque
// nadie tenga el sistema abierto. Lo llama el cron de Vercel (ver vercel.json) con
// "Authorization: Bearer $CRON_SECRET". Sin CRON_SECRET configurado, la ruta no responde.
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const secreto = process.env.CRON_SECRET;
  if (!secreto || req.headers.get("authorization") !== `Bearer ${secreto}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const tenants = await adminDb.collection("tenants").where("estado", "==", "activo").get();
  const resumen = { empresas: 0, enviados: 0, rechazados: 0, pendientes: 0, aceptados: 0, empresasSinDGII: 0 };
  const inicio = Date.now();
  for (const t of tenants.docs) {
    if (Date.now() - inicio > 240_000) break;     // margen antes del límite de la función
    resumen.empresas++;
    try {
      const r = await reenviarPendientes(t.id, 40);
      resumen.enviados += r.enviados; resumen.rechazados += r.rechazados; resumen.pendientes += r.pendientes;
      if (r.dgiiNoResponde) resumen.empresasSinDGII++;
      const e = await sincronizarEstados(t.id, 40);
      resumen.aceptados += e.aceptados; resumen.rechazados += e.rechazados;
    } catch (e) {
      console.error(`[reenviar-pendientes][${t.id}]`, e instanceof Error ? e.message : e);
    }
  }
  return NextResponse.json(resumen);
}
