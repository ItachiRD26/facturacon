import type { Cliente, Cotizacion, CuentaPorCobrar, Factura } from "@/types";
import { localDate, resolverECFConfig } from "@/types";
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
  const fechaVencimientoPago = datos.terminos === "Crédito"
    ? (() => { const d = new Date(); d.setDate(d.getDate() + parseInt(datos.plazo ?? "30", 10)); return localDate(d); })()
    : undefined;

  // construirFacturaReal ya guardó el documento en Firestore (server-side,
  // vía Admin SDK) dentro de /api/facturas/emitir — no se vuelve a llamar
  // deps.agregarFactura() aquí, eso crearía un segundo documento duplicado
  // y firestore.rules lo rechazaría de todas formas (campos fiscales en un
  // create de cliente, con el tenant ya activo).
  const factura = await construirFacturaReal({
    tipoECF, idempotencyKey: crypto.randomUUID(),
    terminos: datos.terminos, metodoPago: datos.metodoPago, clienteId: cotizacion.clienteId,
    items: cotizacion.items, modalidadPago: datos.terminos === "Contado" ? "unico" : "plazo",
    fechaVencimientoPago, idTransaccion: datos.referencia,
    tenantId: deps.tenantId,
  });

  await deps.actualizarCotizacion(cotizacion.id, { estado: "convertida", facturaRef: factura.eCF });
  await crearCxCSiCredito({ ...deps, rncEmisor: "", nombreEmisor: "", rootDomain: "" }, factura);
}
