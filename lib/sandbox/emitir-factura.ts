import type { Factura, LineaServicio, TipoECF } from "@/types";
import { calcTotales } from "@/types";
import { simularEmisionECF } from "@/lib/dgii/dgii-simulador";

// Orquesta la "emisión" de una factura dentro del entorno de prueba: calcula
// totales, corre la simulación de envío/respuesta DGII (sin red, ver
// lib/dgii/dgii-simulador.ts) y devuelve el documento Factura ya completo
// para persistir. No firma con un certificado real — el tenant en este punto
// del flujo todavía no tiene uno.
export async function construirFacturaSimulada(input: {
  tipoECF: TipoECF; noFactura: string; eCF: string; fecha: string; vencimientoECF: string;
  terminos: string; metodoPago?: string; clienteId: string; items: LineaServicio[];
  esConsumidorFinal?: boolean; nombreConsumidor?: string;
  rncCompradorOcasional?: string; esExtranjeroComprador?: boolean;
  modalidadPago: "unico" | "plazo"; fechaVencimientoPago?: string; notas?: string;
  idTransaccion?: string;
  rncEmisor: string; nombreEmisor: string; rootDomain: string;
}): Promise<Omit<Factura, "id">> {
  const totales = calcTotales(input.items);

  const resultado = await simularEmisionECF({
    rncEmisor: input.rncEmisor, nombreEmisor: input.nombreEmisor,
    eNCF: input.eCF, tipoECF: input.tipoECF, montoTotal: totales.total,
    fechaEmision: input.fecha, rootDomain: input.rootDomain,
  });

  return {
    noFactura: input.noFactura, eCF: input.eCF, tipoECF: input.tipoECF,
    fecha: input.fecha, vencimientoECF: input.vencimientoECF,
    terminos: input.terminos, metodoPago: input.metodoPago,
    clienteId: input.clienteId, idTransaccion: input.idTransaccion,
    esConsumidorFinal: input.esConsumidorFinal, nombreConsumidor: input.nombreConsumidor,
    rncCompradorOcasional: input.rncCompradorOcasional, esExtranjeroComprador: input.esExtranjeroComprador,
    estado: input.terminos === "Contado" ? "pagada" : "pendiente",
    items: input.items, notas: input.notas,
    modalidadPago: input.modalidadPago, fechaVencimientoPago: input.fechaVencimientoPago,
    estadoDGII: resultado.estadoDGII, trackIdDGII: resultado.trackIdDGII,
    urlQR: resultado.urlQR, codigoSeguridad: resultado.codigoSeguridad,
    fechaEnvioDGII: resultado.fechaEnvioDGII,
  };
}
