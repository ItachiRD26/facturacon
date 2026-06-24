// Generador de números de eNCF para los e-CF de prueba creados a mano en el
// Paso 4 (E41, E43, E44, E45, E46, E47, E33, E34, E32-RFCE adicionales).
// Guarda el contador en tenants/{tenantId}/certificacion/secuencias y salta
// los números que el set de pruebas del Paso 2 ya usó para ese tipo (ver
// secuenciasUsadasEnPaso2 en mapeo.ts) — así nunca se repite un eNCF dentro
// del mismo proceso de certificación.
import "server-only";
import { adminDb } from "@/lib/firebase-admin";
import type { TipoECF } from "@/types";

export async function siguienteENCFPrueba(
  tenantId: string,
  tipo: TipoECF,
  reservados: Set<number>,
): Promise<string> {
  const ref = adminDb.collection("tenants").doc(tenantId).collection("certificacion").doc("secuencias");

  const siguiente = await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const actual = (snap.data()?.[tipo] as number | undefined) ?? 0;
    let next = actual + 1;
    while (reservados.has(next)) next++;
    tx.set(ref, { [tipo]: next }, { merge: true });
    return next;
  });

  const digitos = tipo.replace(/^E/, "");
  return `E${digitos}${String(siguiente).padStart(10, "0")}`;
}
