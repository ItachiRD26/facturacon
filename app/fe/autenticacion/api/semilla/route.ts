// GET /fe/autenticacion/api/semilla
// La DGII pide una semilla antes de autenticarse contra NUESTRO servicio
// (flujo inverso al que nosotros usamos para entrar a la DGII). El tenant se
// identifica por el subdominio que la empresa registró en la OFV.
import { crearSemilla, errorXml, ipDe, tenantDeLaPeticion, xmlResponse } from "@/lib/fe/receptor";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const tenant = await tenantDeLaPeticion(req);
    if (!tenant) return errorXml("Empresa no encontrada", 404);

    console.log(`[fe/semilla][${tenant.id}] IP ${ipDe(req)}`);
    const semilla = await crearSemilla(tenant.id);
    return xmlResponse(`<?xml version="1.0" encoding="UTF-8"?>\n<SemillaModel><semilla>${semilla}</semilla></SemillaModel>`);
  } catch (err) {
    console.error("[fe/semilla]", err instanceof Error ? err.message : err);
    return errorXml("Error interno", 500);
  }
}
