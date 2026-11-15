import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { requireRolEnTenant } from "@/lib/tenant/auth";
import { limitar } from "@/lib/seguridad/limite-tasa";

// Movimientos manuales del inventario, con su rastro en `movimientos_inventario`:
//  - entrada: llegó mercancía (suma);
//  - merma:   se dañó, venció o se perdió (resta, con motivo);
//  - ajuste:  conteo físico — se fija el stock contado y se anota la diferencia (con motivo).
// Lo hacen el dueño, el administrador y el encargado de almacén. El stock ya no se cambia a
// mano sobre el producto: así siempre se sabe quién movió qué y por qué.
class ErrorEntrada extends Error {}
const txt = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const redondear = (n: number) => Math.round(n * 10000) / 10000;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as {
    tenantId?: string; productoId?: string; tipo?: string; cantidad?: number; conteo?: number; motivo?: string; costo?: number;
  } | null;
  const v = await requireRolEnTenant(body?.tenantId ?? "", ["owner", "admin", "almacen"]);
  if (!v.ok) return v.response;
  const lim = await limitar(req, { nombre: "inventario-mov", id: v.uid, max: 120, ventanaSeg: 60 });
  if (lim) return lim;

  try {
    const tipo = body?.tipo;
    if (tipo !== "entrada" && tipo !== "merma" && tipo !== "ajuste") throw new ErrorEntrada("Tipo de movimiento no válido.");
    if (!body?.productoId) throw new ErrorEntrada("Falta el producto.");
    const motivo = txt(body.motivo, 200);
    if ((tipo === "merma" || tipo === "ajuste") && !motivo) throw new ErrorEntrada("Escribe el motivo: queda en el historial.");
    const cantidad = Number(body.cantidad);
    const conteo = Number(body.conteo);
    if (tipo !== "ajuste" && !(cantidad > 0 && cantidad <= 1_000_000)) throw new ErrorEntrada("La cantidad debe ser mayor que cero.");
    if (tipo === "ajuste" && !(conteo >= 0 && conteo <= 1_000_000)) throw new ErrorEntrada("El conteo no puede ser negativo.");
    const costo = body.costo === undefined || body.costo === null || body.costo === ("" as unknown) ? undefined : Number(body.costo);
    if (costo !== undefined && !(costo >= 0 && costo <= 1_000_000_000)) throw new ErrorEntrada("El costo no es válido.");

    const base = adminDb.collection("tenants").doc(v.tenant.id);
    const resultado = await adminDb.runTransaction(async (tx) => {
      const ref = base.collection("productos").doc(body.productoId!);
      const snap = await tx.get(ref);
      const d = snap.data();
      if (!snap.exists || !d) throw new ErrorEntrada("Producto no encontrado.");
      if (!d.controlaStock) throw new ErrorEntrada("Este producto no controla stock.");
      const antes = Number(d.stock ?? 0);
      const delta = tipo === "entrada" ? cantidad : tipo === "merma" ? -cantidad : conteo - antes;
      const despues = redondear(antes + delta);
      tx.update(ref, { stock: despues, actualizadoEn: FieldValue.serverTimestamp() });
      tx.set(base.collection("movimientos_inventario").doc(), {
        productoId: snap.id, codigo: d.codigo ?? "", nombre: d.nombre ?? "",
        tipo, cantidad: redondear(delta), stockAntes: antes, stockResultante: despues,
        ...(motivo ? { motivo } : {}), ...(costo !== undefined ? { costo } : {}),
        uid: v.uid, fecha: new Date().toISOString(),
      });
      return { antes, despues, delta: redondear(delta) };
    });
    return NextResponse.json({ ok: true, ...resultado });
  } catch (e) {
    if (e instanceof ErrorEntrada) return NextResponse.json({ error: e.message }, { status: 400 });
    console.error("[inventario/movimiento]", e);
    return NextResponse.json({ error: "No se pudo registrar el movimiento." }, { status: 500 });
  }
}
