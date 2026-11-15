import { NextRequest, NextResponse } from "next/server";
import { getSessionUid } from "@/lib/auth/session";
import { adminDb } from "@/lib/firebase-admin";
import { getMembership } from "@/lib/tenant/get-memberships";
import { limitar } from "@/lib/seguridad/limite-tasa";
import { sembrarDatosEjemplo } from "@/lib/sandbox/datos-ejemplo";
import type { TipoNegocio } from "@/types/tenant";

// Botón "Cargar datos de ejemplo" del entorno de prueba (para empresas que nacieron
// vacías). Solo carga si NO hay productos ni clientes, y nunca en una empresa activa.
export async function POST(req: NextRequest) {
  const uid = await getSessionUid();
  if (!uid) return NextResponse.json({ error: "Sesión requerida" }, { status: 401 });
  const lim = await limitar(req, { nombre: "datos-ejemplo", id: uid, max: 10, ventanaSeg: 600 });
  if (lim) return lim;

  const body = await req.json().catch(() => null) as { tenantId?: string } | null;
  if (!body?.tenantId) return NextResponse.json({ error: "Faltan datos" }, { status: 400 });

  const membership = await getMembership(uid, body.tenantId);
  if (!membership) return NextResponse.json({ error: "Sin acceso a esta empresa" }, { status: 403 });

  const snap = await adminDb.collection("tenants").doc(body.tenantId).get();
  const t = snap.data();
  if (!snap.exists || !t) return NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 });
  if (t.estado === "activo") return NextResponse.json({ error: "Esta empresa ya está activa." }, { status: 400 });

  const sembrado = await sembrarDatosEjemplo(body.tenantId, t.tipoNegocio as TipoNegocio);
  return NextResponse.json({ ok: true, sembrado });
}
