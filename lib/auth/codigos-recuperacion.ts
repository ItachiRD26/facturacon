import "server-only";
import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { adminDb } from "@/lib/firebase-admin";

// Códigos de recuperación de la verificación en dos pasos: se muestran UNA vez al activarla y sirven para entrar
// si se pierde el teléfono. Cada código se usa una sola vez.
//
//  - Se guardan solo como hash lento (scrypt con sal propia de la persona): ni nosotros podemos leerlos.
//  - Viven en `seguridad_usuarios/{uid}`, colección sin regla en firestore.rules = cerrada para el navegador.
//  - Un documento por persona (los 10 hashes juntos): verificar o contar cuesta UNA lectura de Firestore.
const ALFABETO = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";   // sin caracteres ambiguos (0/O, 1/I/L)
export const CANTIDAD_CODIGOS = 10;
const COL = "seguridad_usuarios";

const grupo = (n: number) => { const b = randomBytes(n); let s = ""; for (let i = 0; i < n; i++) s += ALFABETO[b[i] % ALFABETO.length]; return s; };
export const generarCodigo = () => `${grupo(5)}-${grupo(5)}`;                       // 10 caracteres de 32 → 50 bits
const normalizar = (c: string) => c.replace(/[\s-]/g, "").toUpperCase();
const hash = (codigo: string, sal: Buffer) => scryptSync(normalizar(codigo), sal, 32, { N: 16384, r: 8, p: 1 });

/** Genera códigos nuevos, deja guardados solo sus hashes (reemplazan a los anteriores) y devuelve los códigos en claro. */
export async function crearCodigos(uid: string): Promise<string[]> {
  const codigos = Array.from({ length: CANTIDAD_CODIGOS }, generarCodigo);
  const sal = randomBytes(16);
  await adminDb.collection(COL).doc(uid).set({
    sal: sal.toString("hex"), hashes: codigos.map((c) => hash(c, sal).toString("hex")), generadoEn: new Date().toISOString(),
  });
  return codigos;
}

export async function contarCodigos(uid: string): Promise<number> {
  const s = await adminDb.collection(COL).doc(uid).get();
  return ((s.data()?.hashes as string[] | undefined) ?? []).length;
}

/** Si el código es válido lo gasta (no vuelve a servir) y devuelve cuántos quedaban. Si no, devuelve null. */
export async function gastarCodigo(uid: string, codigo: string): Promise<number | null> {
  if (normalizar(codigo).length !== 10) return null;
  const ref = adminDb.collection(COL).doc(uid);
  return adminDb.runTransaction(async (tx) => {
    const s = await tx.get(ref);
    const d = s.data() as { sal?: string; hashes?: string[] } | undefined;
    if (!d?.sal || !d.hashes?.length) return null;
    const h = hash(codigo, Buffer.from(d.sal, "hex"));
    const i = d.hashes.findIndex((x) => { const b = Buffer.from(x, "hex"); return b.length === h.length && timingSafeEqual(b, h); });
    if (i < 0) return null;
    const restantes = d.hashes.filter((_, j) => j !== i);
    tx.update(ref, { hashes: restantes });
    return restantes.length;
  });
}

export async function borrarCodigos(uid: string): Promise<void> {
  await adminDb.collection(COL).doc(uid).delete().catch(() => {});
}
