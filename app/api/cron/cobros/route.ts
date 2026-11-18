import { avisarCertificadosPorVencer } from "@/lib/certificacion/avisos-vencimiento";
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { cobrarCiclo } from "@/lib/payments/cobros";
import { hoyRD } from "@/lib/payments/ciclo-cobro";

// Cobro diario de los planes. Lo llama el cron de Vercel (ver vercel.json) con
// "Authorization: Bearer $CRON_SECRET". Para cada empresa con plan propio cobra lo que vence hoy
// (plan + adicionales de los meses cerrados) y aplica la política de fallas: reintento a los 2 y 5 días
// con aviso por correo y, si falla el último, suspensión. Sin CRON_SECRET configurado, la ruta no responde.
// Solo en pruebas (PAGADITO_ENV distinto de "live") se puede simular otro día con ?hoy=YYYY-MM-DD y
// limitar a una empresa con ?tenant=ID.
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const secreto = process.env.CRON_SECRET;
  if (!secreto || req.headers.get("authorization") !== `Bearer ${secreto}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const enPruebas = process.env.PAGADITO_ENV !== "live";
  const hoyParam = enPruebas ? req.nextUrl.searchParams.get("hoy") : null;
  if (hoyParam && !/^\d{4}-\d{2}-\d{2}$/.test(hoyParam)) return NextResponse.json({ error: "Fecha inválida" }, { status: 400 });
  const hoy = hoyParam ?? hoyRD();
  const soloTenant = enPruebas ? req.nextUrl.searchParams.get("tenant") : null;
  // Una fecha simulada solo se acepta junto con una empresa concreta: nunca debe recorrer todas con un día inventado.
  if (hoyParam && !soloTenant) return NextResponse.json({ error: "Con ?hoy= hay que indicar también ?tenant=ID" }, { status: 400 });

  // Las empresas suspendidas ya agotaron sus reintentos: no se les cobra hasta que actualicen su pago.
  const ids = soloTenant
    ? [soloTenant]
    : (await adminDb.collection("tenants").where("estado", "==", "activo").get()).docs.filter((d) => !d.data().esPrueba).map((d) => d.id);

  const resumen = { hoy, revisados: 0, cobrados: 0, reintentos: 0, suspendidos: 0, errores: 0 };
  for (const id of ids) {
    resumen.revisados++;
    try {
      const r = await cobrarCiclo(id, hoy);
      if (r === "cobrado") resumen.cobrados++;
      else if (r === "reintento") resumen.reintentos++;
      else if (r === "suspendido") resumen.suspendidos++;
    } catch (e) {
      resumen.errores++;
      console.error(`[cobros][${id}]`, e instanceof Error ? e.message : e);
    }
  }
  // Aviso diario de certificados por vencer (usa este mismo cron para no sumar otro).
  let certificados: { revisados: number; avisados: number } | null = null;
  if (!soloTenant) certificados = await avisarCertificadosPorVencer(ids).catch(() => null);
  return NextResponse.json({ ...resumen, certificados });
}
