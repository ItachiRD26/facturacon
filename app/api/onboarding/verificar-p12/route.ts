import { NextRequest, NextResponse } from "next/server";
import { getSessionUid } from "@/lib/auth/session";
import { getMembership } from "@/lib/tenant/get-memberships";
import { getTenantById } from "@/lib/tenant/resolve-tenant";
import { loadCertAndKey, extraerRncDelCertificado } from "@/lib/dgii/xml-signer";

// Chequeo previo, de solo lectura: intenta abrir el .p12 con la contraseña
// dada. No guarda nada ni cambia el estado del tenant — existe para que el
// usuario sepa si se equivocó de contraseña ANTES de llegar al paso final
// (que sí guarda), en vez de descubrirlo después de esperar todo el proceso.
export async function POST(req: NextRequest) {
  const uid = await getSessionUid();
  if (!uid) return NextResponse.json({ error: "Sesión requerida" }, { status: 401 });

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Formulario inválido" }, { status: 400 });

  const tenantId = form.get("tenantId")?.toString() ?? "";
  const password = form.get("password")?.toString().trim() ?? "";
  const p12File  = form.get("p12");

  if (!tenantId || !password || !(p12File instanceof Blob)) {
    return NextResponse.json({ error: "Faltan datos: certificado o contraseña" }, { status: 400 });
  }

  const membership = await getMembership(uid, tenantId);
  if (!membership || (membership.rol !== "owner" && membership.rol !== "admin")) {
    return NextResponse.json({ error: "No tienes acceso a esta empresa" }, { status: 403 });
  }

  const tenant = await getTenantById(tenantId);
  if (!tenant) return NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 });

  const p12Buffer = Buffer.from(await p12File.arrayBuffer());

  let rncCertificado: string | null;
  try {
    loadCertAndKey(p12Buffer, password);
    rncCertificado = extraerRncDelCertificado(p12Buffer, password);
  } catch {
    return NextResponse.json({ valid: false, error: "La contraseña no es correcta para este certificado. Verifica que no tenga espacios ni mayúsculas distintas e intenta de nuevo." }, { status: 400 });
  }

  if (!rncCertificado || rncCertificado !== tenant.rnc) {
    return NextResponse.json({ valid: false, error: "La contraseña es correcta, pero este certificado no corresponde al RNC de tu empresa." }, { status: 400 });
  }

  return NextResponse.json({ valid: true });
}
