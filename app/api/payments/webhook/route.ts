import { NextRequest, NextResponse } from "next/server";
import { verificarWebhookPagadito } from "@/lib/payments/pagadito-webhook";
import type { EventoWebhookPagadito } from "@/lib/payments/pagadito-webhook";
import { tenantIdDesdeErnSuscripcion, marcarPagoRecurrenteExitoso, marcarPagoRecurrenteFallido } from "@/lib/payments/suscripcion";

// Receptor de webhooks de Pagadito — configurar esta URL en su panel
// (Configuración Técnica -> Webhooks) una vez haya cuenta real. Hoy solo
// procesa eventos de suscripciones recurrentes (ern con prefijo "sub-"); los
// del primer pago de certificación ("cert-...") se ignoran porque ese flujo
// todavía se confirma por consulta activa en /api/payments/retorno.
//
// SIN PROBAR CONTRA UN EVENTO REAL — ver advertencia en pagadito-webhook.ts
// sobre el header PAGADITO-AUTH-ALGO.
export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  const notificationId = req.headers.get("PAGADITO-NOTIFICATION-ID");
  const notificationTimestamp = req.headers.get("PAGADITO-NOTIFICATION-TIMESTAMP");
  const authAlgo = req.headers.get("PAGADITO-AUTH-ALGO");
  const certUrl = req.headers.get("PAGADITO-CERT-URL");
  const signatureBase64 = req.headers.get("PAGADITO-SIGNATURE");

  if (!notificationId || !notificationTimestamp || !authAlgo || !certUrl || !signatureBase64) {
    console.warn("[pagadito-webhook] Petición sin las cabeceras de firma esperadas — rechazada.");
    return NextResponse.json({ error: "Cabeceras de firma faltantes." }, { status: 401 });
  }

  let valido: boolean;
  try {
    valido = await verificarWebhookPagadito(
      { notificationId, notificationTimestamp, authAlgo, certUrl, signatureBase64 }, rawBody,
    );
  } catch (e) {
    console.error("[pagadito-webhook] Error verificando firma:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "No se pudo verificar la firma." }, { status: 401 });
  }
  if (!valido) {
    console.warn("[pagadito-webhook] Firma inválida — petición rechazada (posible falsificación).");
    return NextResponse.json({ error: "Firma inválida." }, { status: 401 });
  }

  let evento: EventoWebhookPagadito;
  try {
    evento = JSON.parse(rawBody) as EventoWebhookPagadito;
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  if (evento.event_type !== "TRANSACTION.STATUS.CHANGE") {
    return NextResponse.json({ ok: true }); // evento reconocido pero sin acción — 200 igual
  }

  const tenantId = tenantIdDesdeErnSuscripcion(evento.resource.ern);
  if (!tenantId) {
    // No es un ciclo de cobro de una suscripción nuestra (ej. "cert-..." del
    // pago único, o de otro merchant account) — se ignora sin error.
    return NextResponse.json({ ok: true });
  }

  try {
    if (evento.resource.status === "COMPLETED") {
      await marcarPagoRecurrenteExitoso(tenantId);
    } else if (evento.resource.status === "REVOKED" || evento.resource.status === "EXPIRED") {
      await marcarPagoRecurrenteFallido(tenantId);
    }
    // REGISTERED / VERIFYING: estados intermedios, sin acción todavía.
  } catch (e) {
    console.error(`[pagadito-webhook][${tenantId}] Error procesando evento:`, e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Error interno procesando el evento." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
