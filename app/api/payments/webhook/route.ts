import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verificarWebhookPagadito } from "@/lib/payments/pagadito-webhook";
import type { EventoWebhookPagadito } from "@/lib/payments/pagadito-webhook";
import { tenantIdDesdeErnSuscripcion, marcarPagoRecurrenteExitoso, marcarPagoRecurrenteFallido, obtenerSuscripcion, registrarEventoPagadito } from "@/lib/payments/suscripcion";

// Receptor de webhooks de Pagadito — configurar esta URL en su panel
// (Configuración Técnica -> Webhooks) una vez haya cuenta real. La
// certificación es gratis (no hay pago que confirmar ahí) — el único cobro
// que existe es la suscripción recurrente, así que solo se procesan eventos
// con ern de prefijo "sub-", "cob-" o "can-" (ver tenantIdDesdeErnSuscripcion en
// lib/payments/suscripcion.ts); cualquier otro ern se ignora sin error.
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
    // No es un ciclo de cobro de una suscripción nuestra (ern de otro
    // merchant account, o de una prueba) — se ignora sin error.
    return NextResponse.json({ ok: true });
  }

  // Un aviso de una empresa que no existe (prueba ya borrada, ERN ajeno) se ignora: no debe crear datos huérfanos.
  const existe = await adminDb.collection("tenants").doc(tenantId).get().then((d) => d.exists).catch(() => true);
  if (!existe) return NextResponse.json({ ok: true });

  try {
    // Pagadito puede entregar el mismo evento varias veces y fuera de orden (hasta 20 reintentos en 3 días):
    // todo aquí es idempotente, y un aviso de falla ANTERIOR a un pago ya registrado no suspende la cuenta.
    const estado = evento.resource.status;
    const sus = await obtenerSuscripcion(tenantId);
    if (sus?.cobroPropio) {
      // Cobro propio: el resultado de cada cobro ya se conoce al hacerlo (lib/payments/cobros.ts) y los reintentos
      // los maneja el cron. El aviso solo queda anotado, salvo que Pagadito REVOQUE el último cobro (contracargo):
      // eso sí suspende. Un aviso viejo o repetido (otro ERN) nunca reactiva ni suspende la cuenta.
      await registrarEventoPagadito(tenantId, evento.resource.ern, estado, evento.resource.update_timestamp ?? evento.event_create_timestamp);
      if (estado === "REVOKED" && evento.resource.ern === sus.ultimoErn) await marcarPagoRecurrenteFallido(tenantId);
      return NextResponse.json({ ok: true });
    }
    if (estado === "COMPLETED") {
      await marcarPagoRecurrenteExitoso(tenantId);
    } else if (["REVOKED", "EXPIRED", "FAILED", "UNCOLLECTABLE"].includes(estado)) {
      const delEvento = Date.parse(evento.resource.update_timestamp ?? evento.event_create_timestamp ?? "");
      const ultimoPago = sus?.ultimoPagoEn ? Date.parse(sus.ultimoPagoEn) : NaN;
      if (Number.isFinite(delEvento) && Number.isFinite(ultimoPago) && delEvento < ultimoPago) {
        console.warn(`[pagadito-webhook][${tenantId}] ${estado} anterior al último pago registrado: se ignora.`);
      } else {
        await marcarPagoRecurrenteFallido(tenantId);
      }
    }
    // REGISTERED / VERIFYING / PENDING: estados intermedios, sin acción todavía.
  } catch (e) {
    console.error(`[pagadito-webhook][${tenantId}] Error procesando evento:`, e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Error interno procesando el evento." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
