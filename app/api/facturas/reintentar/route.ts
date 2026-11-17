import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requireTenantActivo } from "@/lib/tenant/auth";
import { getToken, enviarECF, enviarRFCE } from "@/lib/dgii/dgii-client";
import { obtenerCertificado } from "@/lib/kms/p12-vault";
import { clasificarError } from "@/lib/dgii/reenvio";
import type { EmpresaConfig } from "@/types/tenant";

// Reenvía a la DGII un comprobante que quedó "pendiente" (ya tiene e-NCF y XML
// firmado, pero la DGII o la red fallaron al enviarlo). Usa el MISMO XML
// firmado: no se genera otro número ni se firma de nuevo.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as { tenantId?: string; facturaId?: string } | null;
  if (!body?.tenantId || !body.facturaId) return NextResponse.json({ error: "Faltan datos" }, { status: 400 });

  const verif = await requireTenantActivo(body.tenantId);
  if (!verif.ok) return verif.response;
  const { tenantId } = body;

  const ref = adminDb.collection("tenants").doc(tenantId).collection("facturas").doc(body.facturaId);
  const snap = await ref.get();
  if (!snap.exists) return NextResponse.json({ error: "Comprobante no encontrado" }, { status: 404 });
  const f = snap.data() as {
    estadoDGII?: string; eCF: string; tipoECF: string; xmlFirmado?: string; xmlRFCEFirmado?: string; creadoPor?: string;
  };

  // Un cajero solo puede reintentar lo suyo.
  if (verif.rol === "vendedor" && f.creadoPor !== verif.uid) {
    return NextResponse.json({ error: "No tienes permiso para este comprobante" }, { status: 403 });
  }
  if (f.estadoDGII !== "pendiente") return NextResponse.json({ error: "Este comprobante ya fue enviado a la DGII." }, { status: 409 });
  if (!f.xmlFirmado) return NextResponse.json({ error: "Este comprobante no tiene XML firmado para reenviar." }, { status: 400 });

  const empresaSnap = await adminDb.collection("tenants").doc(tenantId).collection("config").doc("empresa").get();
  const empresa = empresaSnap.data() as EmpresaConfig;
  const tenant = { tenantId, rnc: empresa.rnc, ambiente: empresa.ambiente };

  try {
    const token = await getToken(tenant, async () => obtenerCertificado(tenantId));
    const esRFCE = !!f.xmlRFCEFirmado;
    let trackId = "";
    let estadoDGII = "Enviado";
    if (esRFCE) {
      const r = await enviarRFCE(f.xmlRFCEFirmado!, tenant, token, f.eCF);
      trackId = r.trackId;
      const est = r.estado.toLowerCase();
      estadoDGII = est.includes("rechaz") ? "Rechazado" : est.includes("condicional") ? "AceptadoCondicional" : est.includes("acept") ? "Aceptado" : "Enviado";
    } else {
      trackId = await enviarECF(f.xmlFirmado, tenant, token, f.eCF);
    }
    await ref.update({
      estadoDGII, trackIdDGII: trackId, fechaEnvioDGII: new Date().toISOString(), mensajesDGII: [],
    });
    return NextResponse.json({ ok: true, estadoDGII });
  } catch (e) {
    const mensaje = e instanceof Error ? e.message : String(e);
    if (clasificarError(mensaje) === "rechazo") {
      await ref.update({ estadoDGII: "Rechazado", mensajesDGII: [mensaje.slice(0, 600)], fechaEnvioDGII: new Date().toISOString() }).catch(() => {});
      return NextResponse.json({ error: `La DGII rechazó el comprobante: ${mensaje}` }, { status: 422 });
    }
    await ref.update({ mensajesDGII: [mensaje.slice(0, 300)] }).catch(() => {});
    return NextResponse.json({ error: `La DGII no recibió el comprobante: ${mensaje}` }, { status: 502 });
  }
}
