import "server-only";
import { adminAuth } from "@/lib/firebase-admin";

// Estado de la verificación en dos pasos (app autenticadora, TOTP) de una persona. Se lee del servidor: el
// navegador no es fuente de verdad. La verificación en sí la hace Firebase (Identity Platform) al iniciar sesión.
export async function tieneVerificacionDosPasos(uid: string): Promise<boolean> {
  try {
    const u = await adminAuth.getUser(uid);
    return (u.multiFactor?.enrolledFactors?.length ?? 0) > 0;
  } catch {
    return false;
  }
}

export async function estadoVerificacion(uid: string): Promise<{ activa: boolean; correo: string; correoVerificado: boolean; factorUid?: string }> {
  const u = await adminAuth.getUser(uid);
  const f = u.multiFactor?.enrolledFactors?.[0];
  return { activa: !!f, correo: u.email ?? "", correoVerificado: u.emailVerified, factorUid: f?.uid };
}
