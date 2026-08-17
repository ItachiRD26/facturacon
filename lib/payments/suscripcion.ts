// Orquestación del cobro recurrente mensual (Fase 8): activar/cancelar la
// suscripción de un tenant ya certificado, y reaccionar a los webhooks de
// Pagadito sobre cada ciclo de cobro. Vive separado de pagadito-tokenizacion.ts
// (que solo habla HTTP con Pagadito) para mantener la lógica de negocio y la
// persistencia en Firestore en un solo lugar.
import "server-only";
import { adminDb } from "@/lib/firebase-admin";
import { crearSuscripcion, cancelarSuscripcion as cancelarEnPagadito } from "./pagadito-tokenizacion";
import type { TarjetaPagadito, BrowserInfoPagadito } from "./pagadito-tokenizacion";
import { buscarPlan } from "./planes";
import type { Suscripcion } from "@/types/pagos";

// El API de Pagadito exige un número fijo de ciclos por suscripción (no hay
// "indefinido" nativo) — se pide un bloque grande (10 años) como sustituto
// práctico de "recurrente para siempre".
// PENDIENTE DE CONFIRMAR: preguntarle a soporte de Pagadito si existe alguna
// forma de renovación automática al agotarse los ciclos, o si hay que
// re-suscribir manualmente antes de que termine este bloque.
const CICLOS_SUSCRIPCION = 120;

// El merchantTransactionId que identifica cada suscripción ante Pagadito se
// arma como "sub-{tenantId}" — así el webhook puede recuperar a qué tenant
// pertenece un evento sin mantener un índice aparte. tenantId (autogenerado
// por Firestore) nunca contiene guiones, así que el prefijo "sub-" es
// inequívoco de separar.
function ernSuscripcion(tenantId: string): string {
  return `sub-${tenantId}`;
}
export function tenantIdDesdeErnSuscripcion(ern: string): string | null {
  return ern.startsWith("sub-") ? ern.slice(4) : null;
}

function refSuscripcion(tenantId: string) {
  return adminDb.collection("tenants").doc(tenantId).collection("facturacion").doc("suscripcion");
}

export async function obtenerSuscripcion(tenantId: string): Promise<Suscripcion | null> {
  const snap = await refSuscripcion(tenantId).get();
  return snap.exists ? (snap.data() as Suscripcion) : null;
}

// Tokeniza la tarjeta del cliente y crea la suscripción recurrente de su plan
// en el mismo paso. Solo debe llamarse para un tenant ya "activo" (con
// certificación completa y gratuita) — este es el ÚNICO cobro que existe en
// todo el producto: sin esta suscripción activa, /api/facturas/emitir
// rechaza cualquier intento de emitir un comprobante real.
export async function activarCobroRecurrente(params: {
  tenantId: string; planId: string;
  card: TarjetaPagadito; browserInfo: BrowserInfoPagadito;
}): Promise<Suscripcion> {
  const plan = buscarPlan(params.planId);
  if (!plan) throw new Error("Plan inválido.");

  const actual = await obtenerSuscripcion(params.tenantId);
  if (actual?.estado === "activa") {
    throw new Error("Este tenant ya tiene una suscripción activa. Cancélala antes de crear una nueva.");
  }

  const resultado = await crearSuscripcion({
    card: params.card,
    recurring: {
      interval: "month", interval_count: CICLOS_SUSCRIPCION, first_interval_free: false,
      merchantTransactionId: ernSuscripcion(params.tenantId),
      description: `Plan ${plan.facturas} facturas/mes — Facturacon`,
      interval_amount: plan.montoUSD,
    },
    browserInfo: params.browserInfo,
  });

  const suscripcion: Suscripcion = {
    paymentToken: resultado.payment_token,
    subscriptionCode: resultado.recurring.subscription_code,
    planId: plan.id, facturasMes: plan.facturas, montoUSD: plan.montoUSD,
    estado: "activa",
    cardHolderName: params.card.cardHolderName,
    ultimos4: params.card.number.slice(-4),
    creadoEn: new Date().toISOString(),
    ultimoPagoEn: new Date().toISOString(),
  };
  await refSuscripcion(params.tenantId).set(suscripcion);
  return suscripcion;
}

export async function cancelarCobroRecurrente(tenantId: string): Promise<void> {
  const actual = await obtenerSuscripcion(tenantId);
  if (!actual?.subscriptionCode) throw new Error("Este tenant no tiene una suscripción activa.");

  await cancelarEnPagadito(actual.subscriptionCode);
  await refSuscripcion(tenantId).set(
    { estado: "cancelada", actualizadoEn: new Date().toISOString() }, { merge: true },
  );
}

// Llamado desde el webhook cuando un ciclo de cobro se completa — refresca
// ultimoPagoEn y, si el tenant había quedado "suspendido" por un cobro
// fallido anterior, lo reactiva (recuperación automática al ponerse al día).
export async function marcarPagoRecurrenteExitoso(tenantId: string): Promise<void> {
  const tenantRef = adminDb.collection("tenants").doc(tenantId);
  await refSuscripcion(tenantId).set(
    { estado: "activa", actualizadoEn: new Date().toISOString(), ultimoPagoEn: new Date().toISOString() },
    { merge: true },
  );
  await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(tenantRef);
    if (snap.exists && snap.data()?.estado === "suspendido") {
      tx.set(tenantRef, { estado: "activo" }, { merge: true });
    }
  });
}

// Llamado cuando Pagadito notifica que un cobro recurrente fue rechazado,
// revocado o expiró — el negocio decidió que esto suspende el acceso del
// tenant hasta que se resuelva (activa el estado "suspendido" de
// types/tenant.ts, que hasta ahora no lo asignaba nada).
export async function marcarPagoRecurrenteFallido(tenantId: string): Promise<void> {
  const tenantRef = adminDb.collection("tenants").doc(tenantId);
  await Promise.all([
    refSuscripcion(tenantId).set(
      { estado: "pago_fallido", actualizadoEn: new Date().toISOString() }, { merge: true },
    ),
    tenantRef.set({ estado: "suspendido" }, { merge: true }),
  ]);
}
