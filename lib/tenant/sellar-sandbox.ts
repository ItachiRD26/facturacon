import "server-only";
import { adminDb } from "@/lib/firebase-admin";

const COLECCIONES_SANDBOX = [
  "clientes", "productos", "facturas", "cotizaciones", "cuentas_por_cobrar", "facturas_recibidas",
] as const;

// Al momento de activar el tenant (fin de la certificación), todo lo que
// haya en sus colecciones es de la etapa de prueba — no existe ningún otro
// punto en el flujo donde se distinga "demo" de "real". Esto sella ese
// corte: todo documento previo a este momento queda marcado esMuestra:true,
// y lo que se cree después (ya en producción) nace sin esa marca.
export async function sellarDatosSandbox(tenantId: string): Promise<void> {
  const tenantRef = adminDb.collection("tenants").doc(tenantId);

  for (const coleccion of COLECCIONES_SANDBOX) {
    const snap = await tenantRef.collection(coleccion).get();
    if (snap.empty) continue;

    const docs = snap.docs;
    for (let i = 0; i < docs.length; i += 450) {
      const batch = adminDb.batch();
      for (const doc of docs.slice(i, i + 450)) {
        batch.set(doc.ref, { esMuestra: true }, { merge: true });
      }
      await batch.commit();
    }
  }
}
