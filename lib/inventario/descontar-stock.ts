import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";

// Descuenta del inventario lo que se vendió. Antes la venta no movía el stock en ningún
// lado. Solo toca productos con control de stock; el stock puede quedar en negativo (se
// vende antes de registrar una compra: lo normal en un mostrador) y eso se ve como alerta.
// Cada movimiento queda anotado en `movimientos_inventario` (historial por producto).
// Va con el Admin SDK: el cajero no puede escribir productos desde el navegador.
export interface LineaVendida { servicioId?: string; cant: number; codigo?: string; descripcion?: string }

export async function descontarStock(
  tenantId: string, items: LineaVendida[], ref: { eCF: string; uid: string },
): Promise<number> {
  const base = adminDb.collection("tenants").doc(tenantId);
  // Una misma línea puede repetirse: se suman las cantidades por producto.
  const porProducto = new Map<string, { cant: number; codigo?: string; descripcion?: string }>();
  for (const it of items) {
    if (!it.servicioId || !(it.cant > 0)) continue;
    const previo = porProducto.get(it.servicioId);
    porProducto.set(it.servicioId, { cant: (previo?.cant ?? 0) + it.cant, codigo: it.codigo, descripcion: it.descripcion });
  }
  if (porProducto.size === 0) return 0;

  const docs = await Promise.all([...porProducto.keys()].map((id) => base.collection("productos").doc(id).get()));
  const lote = adminDb.batch();
  let movidos = 0;
  for (const snap of docs) {
    const d = snap.data();
    if (!snap.exists || !d?.controlaStock) continue;
    const v = porProducto.get(snap.id)!;
    lote.update(snap.ref, { stock: FieldValue.increment(-v.cant) });
    lote.set(base.collection("movimientos_inventario").doc(), {
      productoId: snap.id, codigo: d.codigo ?? v.codigo ?? "", nombre: d.nombre ?? v.descripcion ?? "",
      tipo: "venta", cantidad: -v.cant, referencia: ref.eCF, uid: ref.uid, fecha: new Date().toISOString(),
    });
    movidos++;
  }
  if (movidos > 0) await lote.commit();
  return movidos;
}
