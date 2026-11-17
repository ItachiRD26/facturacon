// Persistencia de la suscripción de un tenant y reacción a los webhooks de Pagadito.
// El cobro en sí (activar, cobrar cada ciclo, cancelar) vive en lib/payments/cobros.ts; el HTTP con
// Pagadito, en pagadito-tokenizacion.ts. Aquí queda solo lo que lee/escribe la suscripción.
import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { cancelarSuscripcion as cancelarEnPagadito } from "./pagadito-tokenizacion";
import type { Suscripcion } from "@/types/pagos";

// Cada cobro lleva un número de comprobante (ERN) único hacia Pagadito: "sub-{tenantId}-…" el primero,
// "cob-{tenantId}-{fecha}-{n}" cada ciclo y "can-{tenantId}-…" el de la cancelación. El webhook recupera el
// tenant desde ahí sin mantener un índice aparte. El tenantId (autogenerado por Firestore) nunca lleva
// guiones, así que el corte es inequívoco.
export function tenantIdDesdeErnSuscripcion(ern: string): string | null {
  const m = /^(?:sub|cob|can)-([A-Za-z0-9]+)(?:-|$)/.exec(ern);
  return m ? m[1] : null;
}

export function refSuscripcion(tenantId: string) {
  return adminDb.collection("tenants").doc(tenantId).collection("facturacion").doc("suscripcion");
}

export async function obtenerSuscripcion(tenantId: string): Promise<Suscripcion | null> {
  const snap = await refSuscripcion(tenantId).get();
  return snap.exists ? (snap.data() as Suscripcion) : null;
}

/** Cancela en Pagadito una suscripción del modelo viejo (Pagadito cobraba un monto fijo por su cuenta). */
export async function cancelarSuscripcionEnPagadito(subscriptionCode: string): Promise<void> {
  await cancelarEnPagadito(subscriptionCode);
}

// Llamado desde el webhook cuando un ciclo de cobro se completa — refresca
// ultimoPagoEn y, si el tenant había quedado "suspendido" por un cobro
// fallido anterior, lo reactiva (recuperación automática al ponerse al día).
// Solo para suscripciones del modelo viejo: con el cobro propio, el resultado se conoce al cobrar.
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

// Pagadito avisa que un cobro fue rechazado, revocado o expiró: se suspende el acceso
// del tenant hasta que se resuelva (estado "suspendido" de types/tenant.ts).
export async function marcarPagoRecurrenteFallido(tenantId: string): Promise<void> {
  const tenantRef = adminDb.collection("tenants").doc(tenantId);
  await Promise.all([
    refSuscripcion(tenantId).set(
      { estado: "pago_fallido", proximoIntentoEn: FieldValue.delete(), actualizadoEn: new Date().toISOString() }, { merge: true },
    ),
    tenantRef.set({ estado: "suspendido" }, { merge: true }),
  ]);
}

/** Deja constancia del último aviso de Pagadito sobre un cobro (para revisar a mano; no cambia el estado). */
export async function registrarEventoPagadito(tenantId: string, ern: string, estado: string, cuando?: string): Promise<void> {
  await refSuscripcion(tenantId).set({ ultimoEventoPagadito: { ern, estado, cuando: cuando ?? new Date().toISOString() } }, { merge: true });
}
