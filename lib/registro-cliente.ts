// Versión para el navegador de lib/registro.ts: solo la variable NEXT_PUBLIC_ está
// disponible en el cliente. Se usa para el texto del enlace en /login; el bloqueo
// real del alta sigue en el servidor (/api/auth/session).
export function registroAbierto(): boolean {
  return process.env.NEXT_PUBLIC_REGISTRO_ABIERTO === "1";
}
