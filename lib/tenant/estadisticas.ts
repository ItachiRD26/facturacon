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

const MES_LABEL = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

export async function obtenerComprobantesPorMes(
  tenantId: string, meses = 6
): Promise<{ label: string; value: number }[]> {
  const hoy = new Date();
  const inicioRango = new Date(hoy.getFullYear(), hoy.getMonth() - (meses - 1), 1).toISOString().slice(0, 10);

  const buckets = new Map<string, number>();
  for (let i = 0; i < meses; i++) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - (meses - 1 - i), 1);
    buckets.set(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, 0);
  }

  const snap = await adminDb
    .collection("tenants").doc(tenantId).collection("facturas")
    .where("fecha", ">=", inicioRango)
    .select("fecha")
    .get();

  for (const doc of snap.docs) {
    const fecha = doc.get("fecha") as string | undefined;
    const key = fecha?.slice(0, 7);
    if (key && buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }

  return Array.from(buckets.entries()).map(([key, value]) => {
    const mes = parseInt(key.split("-")[1], 10) - 1;
    return { label: MES_LABEL[mes], value };
  });
}

export async function contarMetodosPago(tenantId: string): Promise<number> {
  const snap = await adminDb
    .collection("tenants").doc(tenantId).collection("metodos_pago")
    .count().get();
  return snap.data().count;
}

export interface ActividadSandbox { clientes: number; productos: number; facturas: number; cotizaciones: number }

// A diferencia de contarComprobantesEsteMes (que solo cuenta una vez el
// tenant está "activo" porque ahí sí es facturación real ante la DGII),
// esto cuenta TODO lo que el usuario ya creó en el entorno de prueba — sirve
// para que el resumen de cuenta no se vea vacío mientras el tenant todavía
// está en "demo"/certificándose, sin mezclar esos números con actividad real.
export async function contarActividadSandbox(tenantId: string): Promise<ActividadSandbox> {
  const ref = adminDb.collection("tenants").doc(tenantId);
  const [clientes, productos, facturas, cotizaciones] = await Promise.all([
    ref.collection("clientes").count().get(),
    ref.collection("productos").count().get(),
    ref.collection("facturas").count().get(),
    ref.collection("cotizaciones").count().get(),
  ]);
  return {
    clientes: clientes.data().count,
    productos: productos.data().count,
    facturas: facturas.data().count,
    cotizaciones: cotizaciones.data().count,
  };
}

export interface DesgloseEstado { estado: string; cantidad: number }

export async function obtenerDesglosePorEstado(tenantId: string): Promise<DesgloseEstado[]> {
  const snap = await adminDb
    .collection("tenants").doc(tenantId).collection("facturas")
    .select("estado")
    .get();

  const counts: Record<string, number> = { pagada: 0, pendiente: 0, anulada: 0 };
  for (const doc of snap.docs) {
    const estado = doc.get("estado") as string | undefined;
    if (estado && estado in counts) counts[estado] += 1;
  }
  return Object.entries(counts).map(([estado, cantidad]) => ({ estado, cantidad }));
}
