import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebase-admin";
import { requireOwnerOAdmin } from "@/lib/tenant/auth";
import { createMembership } from "@/lib/tenant/get-memberships";
import { generarCodigoEmpleado, generarTokenLinkEmpleado, hashCodigo } from "@/lib/tenant/codigo-empleado";
import { ROLES_INVITABLES } from "@/lib/tenant/roles";
import { apagarFacturacionDuenoPorEquipo } from "@/lib/tenant/permisos-facturacion";
import { cupoUsuarios, mensajeUsuarioAdicional, MENSAJE_SOLO_UN_USUARIO } from "@/lib/tenant/limite-usuarios";
import type { Empleado } from "@/types/tenant";

// Lista de empleados del tenant — nunca incluye codigoHash. También devuelve
// el link de login de empleados (slug + token), generando el token la
// primera vez si el tenant todavía no tiene uno.
export async function GET(req: NextRequest) {
  const tenantId = req.nextUrl.searchParams.get("t") ?? "";
  const verif = await requireOwnerOAdmin(tenantId);
  if (!verif.ok) return verif.response;

  let linkToken = verif.tenant.linkEmpleadoToken;
  if (!linkToken) {
    linkToken = generarTokenLinkEmpleado();
    await adminDb.collection("tenants").doc(tenantId).update({ linkEmpleadoToken: linkToken });
  }

  const snap = await adminDb.collection("tenants").doc(tenantId).collection("empleados")
    .orderBy("creadoEn", "desc").get();
  const empleados: Empleado[] = snap.docs.map((d) => {
    const { codigoHash: _h, ...resto } = d.data();
    void _h;
    return resto as Empleado;
  });
  const cupo = await cupoUsuarios(tenantId);
  return NextResponse.json({ empleados, slug: verif.tenant.slug ?? null, linkToken, cupo });
}

// Crea una cuenta de empleado (sin correo/contraseña) + su código de acceso.
// El código solo se devuelve UNA vez en esta respuesta — nunca se guarda en
// texto plano ni se puede recuperar después, solo regenerar.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const tenantId = body?.tenantId ?? "";
  const verif = await requireOwnerOAdmin(tenantId);
  if (!verif.ok) return verif.response;

  const nombre  = body?.nombre?.trim();
  const rol     = body?.rol;
  const horario = body?.horario?.trim();
  const notas   = body?.notas?.trim();

  if (!nombre) return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 });
  if (!ROLES_INVITABLES.includes(rol)) {
    return NextResponse.json({ error: "Rol inválido" }, { status: 400 });
  }

  if (rol === "admin" && verif.rol !== "owner") {
    return NextResponse.json({ error: "Solo el dueño de la cuenta puede nombrar administradores." }, { status: 403 });
  }

  const cupo = await cupoUsuarios(tenantId);
  if (cupo.soloUnUsuario && cupo.lleno) return NextResponse.json({ error: MENSAJE_SOLO_UN_USUARIO }, { status: 403 });
  if (cupo.lleno && !(body as { confirmoExtra?: boolean }).confirmoExtra) {
    // No se bloquea: se pide confirmar el costo del usuario adicional.
    return NextResponse.json({ requiereConfirmacion: true, costoRD: cupo.costoExtraRD, error: mensajeUsuarioAdicional(cupo) }, { status: 409 });
  }

  const userRecord = await adminAuth.createUser({ displayName: nombre });
  const uid = userRecord.uid;

  const codigo     = generarCodigoEmpleado();
  const codigoHash = hashCodigo(codigo);

  await adminDb.collection("users").doc(uid).set({
    uid, email: "", nombre, tipoCuenta: "individual", creadoEn: new Date().toISOString(),
  });
  await createMembership(uid, tenantId, rol);
  if (rol === "vendedor") await apagarFacturacionDuenoPorEquipo(tenantId);

  const empleado: Record<string, unknown> = {
    uid, nombre, rol, codigoHash, codigoUltimos4: codigo.slice(-4),
    activo: true, creadoEn: new Date().toISOString(), creadoPorUid: verif.uid,
  };
  if (horario) empleado.horario = horario;
  if (notas) empleado.notas = notas;
  await adminDb.collection("tenants").doc(tenantId).collection("empleados").doc(uid).set(empleado);

  return NextResponse.json({ ok: true, uid, codigo });
}
