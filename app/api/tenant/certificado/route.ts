import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requireRolEnTenant } from "@/lib/tenant/auth";
import { registrarAuditoria } from "@/lib/auditoria/registrar";
import { limitar } from "@/lib/seguridad/limite-tasa";
import { guardarCertificado, obtenerCertificado, type CertificadoGuardado } from "@/lib/kms/p12-vault";
import { estadoPorFecha, leerInfoCertificado } from "@/lib/dgii/certificado-info";

// Estado y renovación del certificado digital (.p12) de la empresa. Solo dueño/administrador.
// Solo se devuelven datos PÚBLICOS del certificado (titular, emisor, fechas): el .p12 y su
// contraseña nunca salen del servidor (están cifrados con KMS).
const MAX_P12_BYTES = 2 * 1024 * 1024;

const refCert = (tenantId: string) => adminDb.collection("tenants").doc(tenantId).collection("config").doc("certificado");

function vista(d: CertificadoGuardado) {
  const { estado, dias } = d.venceEn ? estadoPorFecha(d.venceEn) : { estado: "vigente" as const, dias: null };
  return {
    existe: true, titular: d.titular ?? null, emisor: d.emisor ?? null, validoDesde: d.validoDesde ?? null, venceEn: d.venceEn ?? null,
    fingerprint: d.fingerprint, subidoEn: d.subidoEn, estado, dias, anterior: d.anterior ?? null,
  };
}

export async function GET(req: NextRequest) {
  const tenantId = req.nextUrl.searchParams.get("t") ?? "";
  const v = await requireRolEnTenant(tenantId, ["owner", "admin"]);
  if (!v.ok) return v.response;
  const lim = await limitar(req, { nombre: "certificado-estado", id: v.uid, max: 60, ventanaSeg: 600 });
  if (lim) return lim;

  const snap = await refCert(tenantId).get();
  if (!snap.exists) return NextResponse.json({ existe: false });
  let d = snap.data() as CertificadoGuardado;

  // Certificados guardados antes de que se registraran las fechas: se leen una sola vez y se completan.
  if (!d.venceEn) {
    try {
      const { p12Buffer, password } = await obtenerCertificado(tenantId);
      const info = leerInfoCertificado(p12Buffer, password);
      const extra = { titular: info.titular, emisor: info.emisor, validoDesde: info.validoDesde, venceEn: info.venceEn };
      await refCert(tenantId).set(extra, { merge: true });
      d = { ...d, ...extra };
    } catch (e) {
      console.error("[certificado] no se pudieron leer las fechas del certificado guardado", e instanceof Error ? e.message : e);
    }
  }
  return NextResponse.json(vista(d));
}

// Renovación: sube el certificado nuevo, se verifica y reemplaza al anterior.
export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Formulario inválido" }, { status: 400 });
  const tenantId = form.get("tenantId")?.toString() ?? "";
  const v = await requireRolEnTenant(tenantId, ["owner", "admin"]);
  if (!v.ok) return v.response;
  // Abrir un .p12 es trabajo de CPU y probar contraseñas es un ataque conocido: tope por usuario.
  const lim = await limitar(req, { nombre: "certificado-renovar", id: v.uid, max: 10, ventanaSeg: 600 });
  if (lim) return lim;

  const password = form.get("password")?.toString().trim() ?? "";
  const archivo = form.get("p12");
  if (!password || !(archivo instanceof Blob)) {
    return NextResponse.json({ error: "Faltan datos: el certificado nuevo y su contraseña." }, { status: 400 });
  }
  if (archivo.size > MAX_P12_BYTES) return NextResponse.json({ error: "El archivo es demasiado grande para ser un certificado." }, { status: 400 });

  const p12Buffer = Buffer.from(await archivo.arrayBuffer());
  let info;
  try {
    info = leerInfoCertificado(p12Buffer, password);
  } catch {
    return NextResponse.json({ error: "La contraseña no coincide con este certificado. Revísala letra por letra: una mayúscula distinta, una letra mal o un espacio de más es lo más común." }, { status: 400 });
  }

  if (!info.rnc || info.rnc !== v.tenant.rnc) {
    return NextResponse.json({ error: "Este certificado no corresponde al RNC de tu empresa. Sube el certificado renovado de la misma empresa." }, { status: 400 });
  }
  if (new Date(info.venceEn).getTime() <= Date.now()) {
    return NextResponse.json({ error: `Este certificado ya está vencido (venció el ${info.venceEn.slice(0, 10)}). Sube el renovado.` }, { status: 400 });
  }

  const actualSnap = await refCert(tenantId).get();
  const actual = actualSnap.exists ? (actualSnap.data() as CertificadoGuardado) : null;
  if (actual) {
    if (actual.fingerprint === info.fingerprint) {
      return NextResponse.json({ error: "Este es el mismo certificado que ya tienes cargado. Sube el certificado renovado (el nuevo archivo que te entregó tu proveedor)." }, { status: 400 });
    }
    // Un certificado que vence antes que el actual (y el actual sigue vigente) casi seguro es el archivo viejo.
    if (actual.venceEn && new Date(actual.venceEn).getTime() > Date.now() && new Date(info.venceEn).getTime() <= new Date(actual.venceEn).getTime()) {
      return NextResponse.json({ error: `Este certificado vence antes (o el mismo día) que el actual (${actual.venceEn.slice(0, 10)}). ¿Seguro que es el renovado?` }, { status: 400 });
    }
  }

  await guardarCertificado(tenantId, p12Buffer, password, info.fingerprint, {
    titular: info.titular, emisor: info.emisor, validoDesde: info.validoDesde, venceEn: info.venceEn,
    ...(actual ? { anterior: { fingerprint: actual.fingerprint, venceEn: actual.venceEn, reemplazadoEn: new Date().toISOString() } } : {}),
  });
  // El token de la DGII se obtuvo firmando con el certificado anterior: se descarta para pedir uno nuevo con el renovado.
  await adminDb.collection("tenants").doc(tenantId).collection("config").doc("dgii_token").delete().catch(() => undefined);
  console.log(`[certificado] renovado en ${tenantId} (nuevo ${info.fingerprint}, vence ${info.venceEn.slice(0, 10)})`);

  await registrarAuditoria({
    tenantId, uid: v.uid, accion: "certificado.renovado", req,
    detalle: { vence: info.venceEn.slice(0, 10), reemplazaAnterior: !!actual },
  });
  const nuevo = (await refCert(tenantId).get()).data() as CertificadoGuardado;
  return NextResponse.json({ ok: true, ...vista(nuevo) });
}
