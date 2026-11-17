// Secuencias fiscales AUTORIZADAS por la DGII (rangos de e-NCF por tipo).
//
// En producción el e-NCF no puede salir de un contador cualquiera: la DGII
// autoriza a cada empresa un rango por tipo (p. ej. E31 del 1 al 1000) con una
// fecha de vencimiento. El número se asigna AQUÍ, en el servidor y dentro de
// una transacción, nunca desde el navegador. Antes el cliente pedía el número a
// un contador de pruebas que empezaba en 1 y decidía también la fecha de
// vencimiento de la secuencia.
import "server-only";
import { adminDb } from "@/lib/firebase-admin";
import type { TipoECF } from "@/types";
import { MAX_CANTIDAD, calcularRango } from "./secuencias-calculo";

export interface RangoSecuencia {
  desde: number;
  hasta: number;
  vencimiento: string; // YYYY-MM-DD
  ultimo: number;      // último número ya usado (desde - 1 si no se ha usado ninguno)
}

export type SecuenciasFiscales = Partial<Record<TipoECF, RangoSecuencia>>;

export const TIPOS_CON_SECUENCIA: TipoECF[] = ["E31", "E32", "E33", "E34", "E41", "E43", "E44", "E45", "E46", "E47"];
const MAX_NUMERO = 9_999_999_999;

const ref = (tenantId: string) =>
  adminDb.collection("tenants").doc(tenantId).collection("config").doc("secuencias_fiscales");

export function formatoENCF(tipo: TipoECF, numero: number): string {
  return `${tipo}${String(numero).padStart(10, "0")}`;
}

export function hoyRD(): string {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santo_Domingo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  return p; // en-CA da YYYY-MM-DD
}

export async function leerSecuencias(tenantId: string): Promise<SecuenciasFiscales> {
  const snap = await ref(tenantId).get();
  return (snap.exists ? snap.data() : {}) as SecuenciasFiscales;
}

export class ErrorSecuencia extends Error {}

// Define o amplía el rango autorizado de un tipo.
//  - Mismo "desde": solo se puede ampliar el "hasta"/vencimiento (la DGII
//    extiende el rango); nunca bajar por debajo de lo ya usado.
//  - "desde" distinto: es un rango nuevo y tiene que empezar después del último usado.
export async function guardarRango(tenantId: string, tipo: TipoECF, nuevo: { desde: number; hasta: number; vencimiento: string }) {
  if (!TIPOS_CON_SECUENCIA.includes(tipo)) throw new ErrorSecuencia("Tipo de comprobante no válido.");
  const { desde, hasta, vencimiento } = nuevo;
  if (!Number.isInteger(desde) || !Number.isInteger(hasta) || desde < 1 || hasta > MAX_NUMERO) {
    throw new ErrorSecuencia("El rango debe ser de números enteros entre 1 y 9,999,999,999.");
  }
  if (hasta < desde) throw new ErrorSecuencia("El número final no puede ser menor que el inicial.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(vencimiento) || vencimiento < hoyRD()) {
    throw new ErrorSecuencia("La fecha de vencimiento debe ser una fecha futura.");
  }

  await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(ref(tenantId));
    const actual = ((snap.exists ? snap.data() : {}) as SecuenciasFiscales)[tipo];
    let ultimo = desde - 1;
    if (actual) {
      if (desde === actual.desde) {
        if (hasta < actual.ultimo) throw new ErrorSecuencia(`Ya usaste hasta el ${actual.ultimo}; el rango no puede terminar antes.`);
        ultimo = actual.ultimo;
      } else if (desde <= actual.ultimo) {
        throw new ErrorSecuencia(`Un rango nuevo debe empezar después del último número usado (${actual.ultimo}).`);
      }
    }
    tx.set(ref(tenantId), { [tipo]: { desde, hasta, vencimiento, ultimo } }, { merge: true });
  });
}

// Registra lo que el usuario pidió en la OFV indicando solo CUÁNTOS comprobantes. El rango y el vencimiento
// se calculan (ver secuencias-calculo.ts). El caso raro de una numeración distinta se registra con guardarRango.
export async function registrarCantidad(tenantId: string, tipo: TipoECF, cantidad: number) {
  if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > MAX_CANTIDAD) {
    throw new ErrorSecuencia(`La cantidad debe ser un número entero entre 1 y ${MAX_CANTIDAD.toLocaleString("es-DO")}.`);
  }
  const actual = (await leerSecuencias(tenantId))[tipo];
  const r = calcularRango(actual, cantidad, hoyRD());
  await guardarRango(tenantId, tipo, { desde: r.desde, hasta: r.hasta, vencimiento: r.vencimiento });
}

// Reserva el siguiente e-NCF del tipo. Atómico: dos emisiones simultáneas
// nunca reciben el mismo número.
export async function reservarENCF(tenantId: string, tipo: TipoECF): Promise<{ eCF: string; numero: number; vencimiento: string }> {
  return adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(ref(tenantId));
    const rango = ((snap.exists ? snap.data() : {}) as SecuenciasFiscales)[tipo];
    if (!rango) {
      throw new ErrorSecuencia(`Todavía no has registrado tu secuencia autorizada para ${tipo}. Hazlo en "Secuencias fiscales" con el rango que te dio la DGII.`);
    }
    if (rango.vencimiento < hoyRD()) {
      throw new ErrorSecuencia(`La secuencia de ${tipo} venció el ${rango.vencimiento}. Solicita una nueva a la DGII y regístrala en "Secuencias fiscales".`);
    }
    const numero = rango.ultimo + 1;
    if (numero > rango.hasta) {
      throw new ErrorSecuencia(`Se agotó tu secuencia de ${tipo} (hasta el ${rango.hasta}). Solicita un nuevo rango a la DGII y regístralo en "Secuencias fiscales".`);
    }
    tx.set(ref(tenantId), { [tipo]: { ...rango, ultimo: numero } }, { merge: true });
    return { eCF: formatoENCF(tipo, numero), numero, vencimiento: rango.vencimiento };
  });
}
