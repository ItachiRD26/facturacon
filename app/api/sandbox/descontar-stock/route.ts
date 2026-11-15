import { NextRequest, NextResponse } from "next/server";
import { getSessionUid } from "@/lib/auth/session";
import { adminDb } from "@/lib/firebase-admin";
import { getMembership } from "@/lib/tenant/get-memberships";
import { limitar } from "@/lib/seguridad/limite-tasa";
import { descontarStock, type LineaVendida } from "@/lib/inventario/descontar-stock";

// Entorno de prueba: tras guardar una factura simulada, el navegador pide descontar el
// stock aquí (el cajero no puede escribir productos desde el navegador). En producción no
// se usa: /api/facturas/emitir descuenta el stock él mismo.
export async function POST(req: NextRequest) {
  const uid = await getSessionUid();
  if (!uid) return NextResponse.json({ error: "Sesión requerida" }, { status: 401 });
  const lim = await limitar(req, { nombre: "sandbox-stock", id: uid, max: 120, ventanaSeg: 60 });
  if (lim) return lim;

  const body = await req.json().catch(() => null) as { tenantId?: string; eCF?: string; items?: LineaVendida[] } | null;
  if (!body?.tenantId || !Array.isArray(body.items) || body.items.length > 200) {
    return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
  }
  const membership = await getMembership(uid, body.tenantId);
  if (!membership) return NextResponse.json({ error: "Sin acceso a esta empresa" }, { status: 403 });
  const t = (await adminDb.collection("tenants").doc(body.tenantId).get()).data();
  if (!t) return NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 });
  if (t.estado === "activo") return NextResponse.json({ error: "Esta empresa ya está activa." }, { status: 400 });

  const items = body.items.map((i) => ({
    servicioId: typeof i.servicioId === "string" ? i.servicioId : undefined,
    cant: Number(i.cant) || 0, codigo: String(i.codigo ?? "").slice(0, 40), descripcion: String(i.descripcion ?? "").slice(0, 200),
  }));
  const movidos = await descontarStock(body.tenantId, items, { eCF: String(body.eCF ?? "").slice(0, 40), uid });
  return NextResponse.json({ ok: true, movidos });
}
