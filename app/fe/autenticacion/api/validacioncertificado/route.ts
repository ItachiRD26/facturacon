// POST /fe/autenticacion/api/validacioncertificado
// La DGII firma con su certificado la semilla que le dimos y nos la devuelve.
// Si la semilla es nuestra, vigente y sin usar, respondemos con un token de
// sesión (Bearer) que luego manda al entregarnos e-CF o aprobaciones.
//
// Nota de seguridad: aquí NO se valida criptográficamente la firma de la DGII
// (el validador de DGII canonicaliza distinto a xml-crypto estándar y
// rechazaría firmas legítimas). Lo que protege el token es que la semilla es
// aleatoria, de un solo uso y expira en 10 minutos.
import { NextResponse } from "next/server";
import { consumirSemilla, crearToken, ipDe, leerXml, tag, tenantDeLaPeticion } from "@/lib/fe/receptor";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const tenant = await tenantDeLaPeticion(req);
    if (!tenant) return NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 });

    const xml = await leerXml(req);
    if (xml === null) return NextResponse.json({ error: "Documento demasiado grande" }, { status: 413 });
    if (!xml.trim()) return NextResponse.json({ error: "XML requerido" }, { status: 400 });

    const semilla = tag(xml, "semilla");
    if (!semilla || !/<(\w+:)?Signature[\s>]/.test(xml)) {
      return NextResponse.json({ error: "XML sin semilla o sin firma" }, { status: 400 });
    }

    const res = await consumirSemilla(tenant.id, semilla);
    if (res !== "ok") {
      console.warn(`[fe/validacioncertificado][${tenant.id}] semilla ${res} — IP ${ipDe(req)}`);
      return NextResponse.json({ error: `Semilla ${res}` }, { status: 401 });
    }

    const { token, expira } = await crearToken(tenant.id);
    console.log(`[fe/validacioncertificado][${tenant.id}] token emitido — IP ${ipDe(req)}`);
    return NextResponse.json({ token, expira });
  } catch (err) {
    console.error("[fe/validacioncertificado]", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
