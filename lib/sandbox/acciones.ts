import type { Abono, Cliente, Cotizacion, CuentaPorCobrar, Factura } from "@/types";
import { calcTotales, genECF, localDate, resolverECFConfig, today } from "@/types";
import { nextSecuencia } from "@/hooks/use-secuencias";
import { construirFacturaSimulada } from "@/lib/sandbox/emitir-factura";
import type { DatosConversion } from "@/components/modals/modal-convertir-cotizacion";

interface Deps {
  tenantId: string;
  rncEmisor: string;
  nombreEmisor: string;
  rootDomain: string;
  agregarFactura: (data: Omit<Factura, "id">) => Promise<string | void>;
  actualizarCotizacion: (id: string, data: Partial<Cotizacion>) => Promise<void>;
  agregarCuenta: (data: Omit<CuentaPorCobrar, "id">) => Promise<string | void>;
}

export async function crearCxCSiCredito(deps: Deps, factura: Omit<Factura, "id">) {
  if (factura.terminos !== "Crédito" || !factura.fechaVencimientoPago) return;
  const totales = calcTotales(factura.items);
  const cuenta: Omit<CuentaPorCobrar, "id"> = {
    clienteId: factura.clienteId, numeroFactura: factura.eCF, fecha: factura.fecha,
    fechaVencimiento: factura.fechaVencimientoPago, monto: totales.total, pagado: 0,
    devuelto: 0, creditos: 0, estado: "vigente", abonos: [],
  };
  await deps.agregarCuenta(cuenta);
}

// `data` ya viene con `id` cuando se emitió en modo producción: en ese caso
// /api/facturas/emitir ya guardó el documento en Firestore con el Admin SDK,
// así que NO se vuelve a llamar agregarFactura() — eso crearía un duplicado
// y, con el tenant activo, firestore.rules lo rechazaría de todas formas
// (un create de cliente no puede traer campos fiscales como estadoDGII).
export async function guardarFactura(deps: Deps, data: Factura | Omit<Factura, "id">) {
  const yaPersistida = "id" in data && !!data.id;
  if (!yaPersistida) await deps.agregarFactura(data);
  await crearCxCSiCredito(deps, data);
}

export async function convertirCotizacionEnFactura(
  deps: Deps, cotizacion: Cotizacion, cliente: Cliente | undefined, datos: DatosConversion
) {
  const ecfConfig = resolverECFConfig(cliente, false, false);
  const tipoECF = ecfConfig.tipoDefault;
  const seq = await nextSecuencia(deps.tenantId, tipoECF);
  const eCF = genECF(tipoECF, seq);
  const vencimientoECF = (() => { const d = new Date(); d.setFullYear(d.getFullYear() + 1); return localDate(d); })();
  const fechaVencimientoPago = datos.terminos === "Crédito"
    ? (() => { const d = new Date(); d.setDate(d.getDate() + parseInt(datos.plazo ?? "30", 10)); return localDate(d); })()
    : undefined;

  const factura = await construirFacturaSimulada({
    tipoECF, noFactura: String(seq), eCF, fecha: today(), vencimientoECF,
    terminos: datos.terminos, metodoPago: datos.metodoPago, clienteId: cotizacion.clienteId,
    items: cotizacion.items, modalidadPago: datos.terminos === "Contado" ? "unico" : "plazo",
    fechaVencimientoPago, idTransaccion: datos.referencia,
    rncEmisor: deps.rncEmisor, nombreEmisor: deps.nombreEmisor, rootDomain: deps.rootDomain,
  });

  await deps.agregarFactura(factura);
  await deps.actualizarCotizacion(cotizacion.id, { estado: "convertida", facturaRef: eCF });
  await crearCxCSiCredito(deps, factura);
}

export async function registrarAbonoCxC(
  registrar: (cuenta: CuentaPorCobrar, abono: Omit<Abono, "id" | "registradoEn">) => Promise<void>,
  cuenta: CuentaPorCobrar, abono: Omit<Abono, "id" | "registradoEn">,
) {
  await registrar(cuenta, abono);
}
