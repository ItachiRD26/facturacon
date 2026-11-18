import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";
import { getSessionUid } from "@/lib/auth/session";
import { limitar } from "@/lib/seguridad/limite-tasa";

// El inicio de sesión de Firebase del navegador se guarda POR DIRECCIÓN: quien entró por www.facturacon.com.do no
// queda conectado en su-empresa.facturacon.com.do, aunque la cookie de sesión del servidor sí vale en ambas. Sin esa
// conexión, las lecturas y escrituras directas a Firestore desde el subdominio (productos, clientes, cotizaciones…)
// llegan sin usuario y las reglas las rechazan («Missing or insufficient permissions»).
//
// Este endpoint entrega, a quien YA tiene una sesión válida del servidor (la cookie, que se obtuvo con contraseña y
// segundo paso si lo tiene), un pase de un solo uso para conectar el navegador de ese subdominio con ese MISMO usuario.
// No da más acceso del que la persona ya tiene: las reglas de Firestore siguen decidiendo qué puede leer y escribir.
export async function POST(req: NextRequest) {
  const uid = await getSessionUid();
  if (!uid) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const lim = await limitar(req, { nombre: "firebase-token", id: uid, max: 20, ventanaSeg: 600 });
  if (lim) return lim;
  const token = await adminAuth.createCustomToken(uid);
  return NextResponse.json({ token });
}
