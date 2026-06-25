import type { Cliente, Cotizacion, CuentaPorCobrar, Factura } from "@/types";
import { calcTotales, genECF, localDate, resolverECFConfig, today } from "@/types";
import { nextSecuencia } from "@/hooks/use-secuencias";
import { construirFacturaReal } from "@/lib/produccion/emitir-factura";
import { crearCxCSiCredito } from "@/lib/sandbox/acciones";
import type { DatosConversion } from "@/components/modals/modal-convertir-cotizacion";

interface Deps {
  tenantId: string;
  agregarFactura: (data: Omit<Factura, "id">) => Promise<string | void>;
  actualizarCotizacion: (id: string, data: Partial<Cotizacion>) => Promise<void>;
  agregarCuenta: (data: Omit<CuentaPorCobrar, "id">) => Promise<string | void>;
}

// Equivalente de convertirCotizacionEnFactura (lib/sandbox/acciones.ts) para
// el sistema real: la única diferencia es que arma la factura con
// construirFacturaReal (firma y envía a la DGII) en vez del simulador.
export async function convertirCotizacionEnFacturaReal(
  deps: Deps, cotizacion: Cotizacion, cliente: Cliente | undefined, datos: DatosConversion,
) {
  const ecfConfig = resolverECFConfig(cliente, false, false);
  const tipoECF = ecfConfig.tipoDefault;
  const seq = await nextSecuencia(deps.tenantId, tipoECF);
  const eCF = genECF(tipoECF, seq);
  const vencimientoECF = (() => { const d = new Date(); d.setFullYear(d.getFullYear() + 1); return localDate(d); })();
  const fechaVencimientoPago = datos.terminos === "Crédito"
    ? (() => { const d = new Date(); d.setDate(d.getDate() + parseInt(datos.plazo ?? "30", 10)); return localDate(d); })()
    : undefined;

  const factura = await construirFacturaReal({
    tipoECF, noFactura: String(seq), eCF, fecha: today(), vencimientoECF,
    terminos: datos.terminos, metodoPago: datos.metodoPago, clienteId: cotizacion.clienteId,
    items: cotizacion.items, modalidadPago: datos.terminos === "Contado" ? "unico" : "plazo",
    fechaVencimientoPago, idTransaccion: datos.referencia,
    tenantId: deps.tenantId,
  });

  await deps.agregarFactura(factura);
  await deps.actualizarCotizacion(cotizacion.id, { estado: "convertida", facturaRef: eCF });
  await crearCxCSiCredito({ ...deps, rncEmisor: "", nombreEmisor: "", rootDomain: "" }, factura);
}
