// Convierte una fila del Excel de certificación (FilaSetPrueba) en los
// mismos objetos `Factura` + `Cliente` que usa el motor e-CF de producción
// (lib/dgii/xml-builder.ts) — así la certificación firma/envía con el MISMO
// código que luego se usa para facturar de verdad, sin una segunda
// implementación de XML paralela.
import "server-only";
import type { Cliente, Factura, LineaServicio, TipoECF } from "@/types";
import { LIMITE_RFCE } from "@/lib/dgii/xml-builder";
import type { FilaSetPrueba, ItemFilaPrueba } from "./tipos";
import { NOMBRE_PRUEBA_DGII, RNC_PRUEBA_DGII } from "./tipos";

// Tipos cuyo XSD exige un Comprador con RNC (B2B) — si el Excel no trae uno,
// usamos el comprador de pruebas oficial de la DGII.
const REQUIERE_COMPRADOR_RNC = new Set<TipoECF>(["E41", "E45"]);

function lineaDesdeItem(it: ItemFilaPrueba): LineaServicio {
  return {
    codigo:         "",
    descripcion:    it.descripcion,
    modo:           "unidad",
    cant:           it.cantidad,
    pax:            0,
    precio:         it.precioUnitario,
    descuentoMonto: it.descuentoMonto ?? 0,
    itbis:          it.itbis,
  };
}

export function esRFCE(fila: FilaSetPrueba): boolean {
  return fila.tipoECF === "E32" && fila.montoTotal < LIMITE_RFCE;
}

export function filaACliente(fila: FilaSetPrueba): Cliente | undefined {
  const necesitaRNC = REQUIERE_COMPRADOR_RNC.has(fila.tipoECF);
  if (!fila.rncComprador && !necesitaRNC) return undefined;

  return {
    id:        `prueba-${fila.encf}`,
    rnc:       fila.rncComprador || RNC_PRUEBA_DGII,
    nombre:    fila.razonSocialComprador || NOMBRE_PRUEBA_DGII,
    direccion: "",
    ciudad:    "",
    contacto:  "",
    telefono:  "",
    tipo:      "juridica",
  };
}

export function filaAFactura(fila: FilaSetPrueba): Factura {
  const cliente = filaACliente(fila);
  return {
    id:             fila.encf,
    noFactura:      fila.encf,
    eCF:            fila.encf,
    tipoECF:        fila.tipoECF,
    fecha:          fila.fechaEmision,
    vencimientoECF: fila.vencimientoECF,
    terminos:       fila.terminoPago,
    clienteId:      cliente?.id ?? "",
    eCFRef:             fila.eCFRef,
    motivoNota:         fila.motivoNota,
    codigoModificacion: fila.codigoModificacion,
    esConsumidorFinal: !cliente,
    nombreConsumidor:  !cliente ? (fila.razonSocialComprador || NOMBRE_PRUEBA_DGII) : undefined,
    rncCompradorOcasional: !cliente ? fila.rncComprador : undefined,
    estado:         "pendiente",
    items:          fila.items.map(lineaDesdeItem),
  };
}

// Secuencias (sufijo numérico del eNCF) que el set de pruebas del Paso 2 ya
// consumió por tipo — el Paso 4 (creación interactiva) debe saltarlas para
// no pedirle a la DGII un eNCF duplicado.
export function secuenciasUsadasEnPaso2(filas: FilaSetPrueba[]): Map<TipoECF, Set<number>> {
  const mapa = new Map<TipoECF, Set<number>>();
  for (const fila of filas) {
    const num = parseInt(fila.encf.replace(/^E\d{2}/, ""), 10);
    if (Number.isNaN(num)) continue;
    if (!mapa.has(fila.tipoECF)) mapa.set(fila.tipoECF, new Set());
    mapa.get(fila.tipoECF)!.add(num);
  }
  return mapa;
}

// Determina, para cada fila que requiere Aprobación Comercial previa de otro
// eNCF (E33/E34 con eCFRef), cuál es el eNCF "compuerta" que debe quedar
// Aceptado antes de poder enviarse — generaliza el "GRUPO2_GATE" hardcodeado
// del set de pruebas de referencia (allí era siempre "E320000000006" para
// ese RNC en particular; aquí se calcula a partir del eCFRef real de cada
// fila, válido para el set de pruebas de cualquier tenant).
export function dependenciasDeEnvio(filas: FilaSetPrueba[]): Map<string, string> {
  const porENCF = new Map(filas.map((f) => [f.encf, f]));
  const dependencias = new Map<string, string>(); // encf dependiente → encf compuerta
  for (const fila of filas) {
    if (fila.eCFRef && porENCF.has(fila.eCFRef)) {
      dependencias.set(fila.encf, fila.eCFRef);
    }
  }
  return dependencias;
}
