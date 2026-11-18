import "server-only";
import { URL_SITIO } from "@/lib/email/plantilla";

// Firebase genera los enlaces de «restablecer contraseña» y «verificar correo» apuntando a su propia pantalla
// (sass-facturacion.firebaseapp.com, en inglés). Aquí se toma solo el código del enlace y se arma uno que abre
// NUESTRA pantalla en /accion, en español y con la marca de Facturacon.
export type ModoAccion = "resetPassword" | "verifyEmail";

export function enlaceNuestro(enlaceFirebase: string, modo: ModoAccion, origen: string): string | null {
  try {
    const codigo = new URL(enlaceFirebase).searchParams.get("oobCode");
    if (!codigo) return null;
    return `${origen}/accion?modo=${modo}&codigo=${encodeURIComponent(codigo)}`;
  } catch {
    return null;
  }
}

// Origen público para los enlaces del correo: el sitio real en producción; en local, el host desde el que se pidió
// (así se puede probar todo sin salir a producción). Solo se confía en un host local si NO es producción.
export function origenPublico(req: Request): string {
  if (process.env.NODE_ENV !== "production") {
    const host = (req.headers.get("host") ?? "").trim();
    if (/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host)) return `http://${host}`;
  }
  return URL_SITIO;
}

export const fechaLarga = (d = new Date()) =>
  d.toLocaleString("es-DO", { timeZone: "America/Santo_Domingo", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true });
