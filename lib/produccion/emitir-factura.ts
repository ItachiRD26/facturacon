import type { Factura, LineaServicio, TipoECF } from "@/types";

// Equivalente de lib/sandbox/emitir-factura.ts pero para el sistema real:
// llama a /api/facturas/emitir, que asigna el e-NCF dentro de la secuencia
// autorizada por la DGII, firma con el .p12 real del tenant, envía el e-CF y
// guarda el documento con el Admin SDK. El llamador NO debe volver a guardar
// la factura con el resultado, solo usarlo para mostrar/imprimir.
//
// El navegador ya no decide el e-NCF, la fecha ni el vencimiento de la
// secuencia: solo manda lo que el usuario capturó + una llave de idempotencia
// para que un reintento no gaste otro número de comprobante.

// Error de red (no llegó respuesta): no sabemos si el servidor procesó la
// solicitud, así que el llamador debe REUTILIZAR la misma llave al reintentar.
export class ErrorRedEmision extends Error {}

export interface EntradaEmision {
  tenantId: string; idempotencyKey: string;
  tipoECF: TipoECF; terminos: string; metodoPago?: string; clienteId: string; items: LineaServicio[];
  esConsumidorFinal?: boolean; nombreConsumidor?: string; telefonoConsumidor?: string;
  rncCompradorOcasional?: string; esExtranjeroComprador?: boolean;
  modalidadPago: "unico" | "plazo"; fechaVencimientoPago?: string; notas?: string;
  idTransaccion?: string;
  eCFRef?: string; motivoNota?: string; codigoModificacion?: string;
}

export async function construirFacturaReal(input: EntradaEmision): Promise<Factura & { advertencia?: string; adicional?: { costoRD: number } }> {
  let res: Response;
  try {
    res = await fetch("/api/facturas/emitir", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  } catch {
    throw new ErrorRedEmision("No hubo conexión con el servidor. Revisa tu internet e intenta de nuevo: no se duplicará el comprobante.");
  }
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.factura) throw new Error(data?.error ?? "No se pudo emitir el comprobante.");
  return { ...data.factura, id: data.id, ...(data.advertencia ? { advertencia: data.advertencia } : {}), ...(data.adicional ? { adicional: data.adicional } : {}) } as Factura & { advertencia?: string; adicional?: { costoRD: number } };
}
