import "server-only";
import { adminDb } from "@/lib/firebase-admin";

// Al crear el primer cajero, el dueño deja de facturar por defecto: la factura la hace la
// caja y el dueño supervisa. Solo pasa si el dueño no había decidido nada con el interruptor
// «Yo también facturo» (duenoFacturaManual) y si todavía no estaba apagado.
export async function apagarFacturacionDuenoPorEquipo(tenantId: string): Promise<void> {
  const ref = adminDb.collection("tenants").doc(tenantId);
  const d = (await ref.get()).data();
  if (!d || d.duenoFacturaManual || d.duenoFactura === false) return;
  await ref.update({ duenoFactura: false });
}
