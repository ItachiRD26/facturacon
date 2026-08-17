import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { getSessionUid } from "@/lib/auth/session";
import { getMembership } from "@/lib/tenant/get-memberships";
import { adminDb, adminStorage } from "@/lib/firebase-admin";

const TIPOS_PERMITIDOS = ["image/png", "image/jpeg", "image/webp"];
const TAMANO_MAXIMO = 5 * 1024 * 1024; // 5MB
// 2050-01-01 como Date real (no un string "01-01-2050" ambiguo que Node
// puede interpretar mal) — "para siempre" en la práctica, ya que una URL
// firmada no puede no tener expiración.
//
// IMPORTANTE: las URLs firmadas V4 (la versión por defecto de
// @google-cloud/storage) tienen un máximo de 7 días de vigencia — pedir una
// fecha tan lejana con V4 falla. Se usa V2 explícitamente, que al firmarse
// con la llave privada del service account (no vía la API de IAM) no tiene
// ese límite.
const EXPIRA = new Date("2050-01-01");

// Sube el logo del negocio y genera dos versiones automáticamente — el
// usuario no recorta nada a mano (decisión consciente: más simple de
// construir y de usar, aunque el resultado no sea perfecto en casos raros):
//   - A4: a color, tamaño moderado, conserva transparencia.
//   - Térmica: las impresoras térmicas no manejan bien color/escala de
//     grises, así que se convierte a blanco y negro puro (umbral) y se
//     achica al ancho útil de un recibo de 80mm.
// Se usan URLs firmadas (no makePublic()) porque muchos buckets nuevos de
// GCS tienen "uniform bucket-level access" activado, donde makePublic()
// falla silenciosamente — una URL firmada funciona sin depender de eso.
export async function POST(req: NextRequest) {
  const uid = await getSessionUid();
  if (!uid) return NextResponse.json({ error: "Sesión requerida" }, { status: 401 });

  const form = await req.formData().catch(() => null);
  const tenantId = form?.get("tenantId");
  const archivo = form?.get("logo");
  if (typeof tenantId !== "string" || !tenantId || !(archivo instanceof File)) {
    return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
  }

  const membership = await getMembership(uid, tenantId);
  if (!membership || (membership.rol !== "owner" && membership.rol !== "admin")) {
    return NextResponse.json({ error: "No tienes permiso para esta acción" }, { status: 403 });
  }

  if (!TIPOS_PERMITIDOS.includes(archivo.type)) {
    return NextResponse.json({ error: "Formato no soportado. Usa PNG, JPG o WEBP." }, { status: 400 });
  }
  if (archivo.size > TAMANO_MAXIMO) {
    return NextResponse.json({ error: "La imagen no puede pesar más de 5MB." }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await archivo.arrayBuffer());

    const logoA4 = await sharp(buffer)
      .resize(360, 160, { fit: "inside", withoutEnlargement: true })
      .png()
      .toBuffer();

    const logoTermico = await sharp(buffer)
      .resize(240, 100, { fit: "inside", withoutEnlargement: true })
      .flatten({ background: "#ffffff" })
      .grayscale()
      .threshold(150)
      .png()
      .toBuffer();

    const bucket = adminStorage.bucket();
    const base = `tenants/${tenantId}/personalizacion`;
    const sello = Date.now();
    const rutaA4 = `${base}/logo-a4-${sello}.png`;
    const rutaTermico = `${base}/logo-termico-${sello}.png`;

    const fileA4 = bucket.file(rutaA4);
    const fileTermico = bucket.file(rutaTermico);
    await Promise.all([
      fileA4.save(logoA4, { contentType: "image/png" }),
      fileTermico.save(logoTermico, { contentType: "image/png" }),
    ]);

    const [[logoA4Url], [logoTermicoUrl]] = await Promise.all([
      fileA4.getSignedUrl({ version: "v2", action: "read", expires: EXPIRA }),
      fileTermico.getSignedUrl({ version: "v2", action: "read", expires: EXPIRA }),
    ]);

    await adminDb.collection("tenants").doc(tenantId).collection("config").doc("personalizacion").set({
      logoA4Url, logoTermicoUrl, actualizadoEn: new Date().toISOString(),
    });

    console.log(`[personalizacion][${tenantId}] Logo actualizado: ${rutaA4}, ${rutaTermico}`);
    return NextResponse.json({ ok: true, logoA4Url, logoTermicoUrl });
  } catch (e) {
    const mensaje = e instanceof Error ? e.message : String(e);
    console.error(`[personalizacion][${tenantId}] Falló la subida del logo:`, e);
    return NextResponse.json({ error: `No se pudo procesar la imagen: ${mensaje}` }, { status: 500 });
  }
}
