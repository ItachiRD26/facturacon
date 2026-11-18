import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";
import { limitar } from "@/lib/seguridad/limite-tasa";
import { enviarPlantilla } from "@/lib/email/enviar";
import { enlaceNuestro, origenPublico } from "@/lib/auth/enlaces";

// «Olvidé mi contraseña»: genera el enlace con Firebase y lo manda desde nuestro correo, en español y con nuestra
// marca, apuntando a nuestra pantalla /accion. La respuesta es SIEMPRE la misma, exista o no la cuenta (no se revela
// qué correos están registrados). Sin lectura de Firestore: solo una llamada a Firebase Auth para generar el enlace.
const OK = () => NextResponse.json({ ok: true });
const correoValido = (e: string) => e.length <= 254 && /^[^\s@<>",;:]+@[^\s@<>",;:]+\.[^\s@<>",;:]+$/.test(e);

export async function POST(req: NextRequest) {
  const limIp = await limitar(req, { nombre: "recuperar-clave", max: 6, ventanaSeg: 600 });
  if (limIp) return limIp;
  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!correoValido(email)) return NextResponse.json({ error: "Escribe un correo válido." }, { status: 400 });
  // Tope por correo, compartido entre instancias: evita que alguien llene la bandeja de otra persona.
  const limCorreo = await limitar(req, { nombre: "recuperar-clave-correo", id: email, max: 3, ventanaSeg: 900, compartido: true });
  if (limCorreo) return limCorreo;

  try {
    const enlace = await adminAuth.generatePasswordResetLink(email);
    const url = enlaceNuestro(enlace, "resetPassword", origenPublico(req));
    if (url) await enviarPlantilla("recuperar_clave", { url, minutos: 60 }, { para: email });
  } catch {
    // Cuenta inexistente o sin permiso: misma respuesta que si hubiera salido bien.
  }
  return OK();
}
