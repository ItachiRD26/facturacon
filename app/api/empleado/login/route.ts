import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebase-admin";
import { getTenantSlugFromHost } from "@/lib/tenant/get-subdomain";
import { hashCodigo } from "@/lib/tenant/codigo-empleado";

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "localhost:3000";

// Público a propósito — el empleado todavía no tiene sesión. Dos cosas deben
// coincidir con el tenant resuelto del host real de la petición (no de
// campos del body que el cliente pudiera manipular): el `token` de la URL
// (/empleado/{token} — evita que la ruta sea adivinable igual en cualquier
// subdominio) y el `codigo` en sí (la defensa real contra fuerza bruta, por
// su entropía). Ambos fallan con el mismo mensaje genérico, para no dar
// pistas de cuál de los dos estuvo mal. Devuelve un custom token de
// Firebase; el cliente lo usa para iniciar sesión y luego pasa por el mismo
// /api/auth/session que usa el login normal — de ahí en adelante es una
// sesión real, con los mismos roles y reglas de Firestore de siempre.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const codigo = body?.codigo?.trim();
  const token  = body?.token?.trim();
  if (!codigo || !token) return NextResponse.json({ error: "Código inválido" }, { status: 400 });

  const host = req.headers.get("host") ?? "";
  const slug = getTenantSlugFromHost(host, ROOT_DOMAIN);
  if (!slug) {
    return NextResponse.json({ error: "Entra desde el subdominio de tu empresa" }, { status: 400 });
  }

  const tenantSnap = await adminDb.collection("tenants").where("slug", "==", slug).limit(1).get();
  if (tenantSnap.empty) return NextResponse.json({ error: "Código inválido" }, { status: 401 });
  const tenantDoc = tenantSnap.docs[0];
  const tenantId = tenantDoc.id;

  if (!tenantDoc.data().linkEmpleadoToken || tenantDoc.data().linkEmpleadoToken !== token) {
    return NextResponse.json({ error: "Código inválido" }, { status: 401 });
  }

  const codigoHash = hashCodigo(codigo);
  const empleadoSnap = await adminDb.collection("tenants").doc(tenantId).collection("empleados")
    .where("codigoHash", "==", codigoHash).limit(1).get();
  if (empleadoSnap.empty) return NextResponse.json({ error: "Código inválido" }, { status: 401 });

  const empleado = empleadoSnap.docs[0].data();
  if (!empleado.activo) return NextResponse.json({ error: "Este código ya no está activo" }, { status: 401 });

  const uid = empleado.uid as string;
  const userRecord = await adminAuth.getUser(uid).catch(() => null);
  if (!userRecord || userRecord.disabled) {
    return NextResponse.json({ error: "Código inválido" }, { status: 401 });
  }

  const customToken = await adminAuth.createCustomToken(uid);
  empleadoSnap.docs[0].ref.update({ ultimoAcceso: new Date().toISOString() }).catch(() => {});

  return NextResponse.json({ customToken });
}
