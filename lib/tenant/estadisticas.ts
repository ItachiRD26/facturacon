import "server-only";
import { adminDb } from "@/lib/firebase-admin";

function inicioYFinDeMes(): { inicio: string; fin: string } {
  const hoy = new Date();
  const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().slice(0, 10);
  const fin = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 1).toISOString().slice(0, 10);
  return { inicio, fin };
}

export async function contarComprobantesEsteMes(tenantId: string): Promise<number> {
  const { inicio, fin } = inicioYFinDeMes();
  const snap = await adminDb
    .collection("tenants").doc(tenantId).collection("facturas")
    .where("fecha", ">=", inicio).where("fecha", "<", fin)
    .count().get();
  return snap.data().count;
}
