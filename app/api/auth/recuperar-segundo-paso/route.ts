import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";
import { limitar } from "@/lib/seguridad/limite-tasa";
import { gastarCodigo, borrarCodigos } from "@/lib/auth/codigos-recuperacion";
import { olvidarEstadoMfa } from "@/lib/auth/mfa";
import { avisarRestablecido } from "@/lib/auth/avisos-seguridad";
import { registrarAuditoria } from "@/lib/auditoria/registrar";

// «No tengo mi teléfono»: quien perdió su aplicación autenticadora entra con su contraseña + UN código de
// recuperación (de un solo uso) y se le quita el segundo paso para que active uno nuevo en su teléfono nuevo.
//
// Público a propósito (la persona todavía no tiene sesión), por eso:
//  - la contraseña se comprueba contra Firebase (una cuenta con segundo paso responde pidiendo el código: eso
//    confirma que la contraseña es correcta sin entregar ninguna sesión),
//  - tope estricto por IP y por correo (compartido entre instancias),
//  - todos los fallos devuelven el mismo mensaje: no se revela si el correo existe, si la contraseña falló o si
//    el código era el equivocado,
//  - se avisa por correo a la persona y queda en la bitácora.
const FALLO = () => NextResponse.json({ error: "No pudimos verificar esos datos. Revisa tu contraseña y el código, o escríbenos a soporte." }, { status: 400 });

export async function POST(req: NextRequest) {
  const limIp = await limitar(req, { nombre: "recuperar-2fa", max: 8, ventanaSeg: 900, compartido: true });
  if (limIp) return limIp;
  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const codigo = typeof body?.codigo === "string" ? body.codigo : "";
  if (!email || !password || !codigo || email.length > 254 || password.length > 200) return FALLO();
  const limCorreo = await limitar(req, { nombre: "recuperar-2fa-correo", id: email, max: 5, ventanaSeg: 900, compartido: true });
  if (limCorreo) return limCorreo;

  // 1) La contraseña debe ser la correcta, y la cuenta debe tener el segundo paso activo.
  const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${process.env.NEXT_PUBLIC_FIREBASE_API_KEY}`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  }).catch(() => null);
  const datos = r ? await r.json().catch(() => null) : null;
  if (!r?.ok || !datos?.mfaPendingCredential) return FALLO();

  // 2) El código de recuperación debe ser válido (se gasta: no sirve otra vez).
  const u = await adminAuth.getUserByEmail(email).catch(() => null);
  if (!u) return FALLO();
  const restantes = await gastarCodigo(u.uid, codigo);
  if (restantes === null) return FALLO();

  // 3) Se quita el segundo paso, se cierran todas las sesiones abiertas y se invalidan los códigos que quedaban.
  await adminAuth.updateUser(u.uid, { multiFactor: { enrolledFactors: null } });
  await adminAuth.revokeRefreshTokens(u.uid).catch(() => {});
  await borrarCodigos(u.uid);
  olvidarEstadoMfa(u.uid);
  await registrarAuditoria({ uid: u.uid, accion: "cuenta.mfa_recuperada", detalle: { codigosRestantes: restantes }, req });
  await avisarRestablecido(u.email, u.displayName ?? undefined, restantes);
  return NextResponse.json({ ok: true });
}
