import type { Factura, LineaServicio, TipoECF } from "@/types";

// Equivalente de lib/sandbox/emitir-factura.ts pero para el sistema real
// (Fase 7): en vez de simular la respuesta de la DGII localmente, llama a
// /api/facturas/emitir, que firma con el .p12 real del tenant, envía el
// e-CF al ambiente de producción de la DGII, y guarda el documento en
// Firestore con el Admin SDK (no aquí en el cliente) — así el doc id ya
// viene resuelto y nunca hay un addDoc() client-side que firestore.rules
// tendría que confiar a ciegas para campos fiscales (ver noToca() en
// firestore.rules). El llamador NO debe volver a hacer agregarFactura()
// con el resultado, solo usarlo para mostrar/imprimir.
export async function construirFacturaReal(input: {
  tipoECF: TipoECF; noFactura: string; eCF: string; fecha: string; vencimientoECF: string;
  terminos: string; metodoPago?: string; clienteId: string; items: LineaServicio[];
  esConsumidorFinal?: boolean; nombreConsumidor?: string;
  rncCompradorOcasional?: string; esExtranjeroComprador?: boolean;
  modalidadPago: "unico" | "plazo"; fechaVencimientoPago?: string; notas?: string;
  idTransaccion?: string;
  tenantId: string;
}): Promise<Factura> {
  const res = await fetch("/api/facturas/emitir", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.factura) throw new Error(data?.error ?? "No se pudo emitir el comprobante.");
  return { ...data.factura, id: data.id } as Factura;
}
