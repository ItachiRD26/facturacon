import "server-only";
import { adminAuth } from "@/lib/firebase-admin";

// Estado de la verificación en dos pasos (app autenticadora, TOTP) de una persona. Se lee del servidor: el
// navegador no es fuente de verdad. La verificación en sí la hace Firebase (Identity Platform) al iniciar sesión.

// El aviso «activa tu verificación» del resumen se evalúa en cada visita: se recuerda unos minutos por instancia
// para no consultar a Firebase Auth cada vez. Al activar o desactivar se olvida de inmediato.
const TTL_MS = 10 * 60 * 1000;
const cache = new Map<string, { activa: boolean; hasta: number }>();
export const olvidarEstadoMfa = (uid: string) => { cache.delete(uid); };

export async function tieneVerificacionDosPasos(uid: string): Promise<boolean> {
  const c = cache.get(uid);
  if (c && c.hasta > Date.now()) return c.activa;
  try {
    const u = await adminAuth.getUser(uid);
    const activa = (u.multiFactor?.enrolledFactors?.length ?? 0) > 0;
    if (cache.size > 2000) cache.clear();
    cache.set(uid, { activa, hasta: Date.now() + TTL_MS });
    return activa;
  } catch {
    return false;
  }
}

export async function estadoVerificacion(uid: string): Promise<{ activa: boolean; correo: string; correoVerificado: boolean; nombre?: string }> {
  const u = await adminAuth.getUser(uid);
  const activa = (u.multiFactor?.enrolledFactors?.length ?? 0) > 0;
  cache.set(uid, { activa, hasta: Date.now() + TTL_MS });
  return { activa, correo: u.email ?? "", correoVerificado: u.emailVerified, nombre: u.displayName ?? undefined };
}
