// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// CÁLCULO FISCAL — UNA SOLA FUENTE DE VERDAD
//
// Lo usan, sin copias, el servidor (XML que se firma y se envía a la DGII) y la pantalla (vista previa, impresión,
// dashboard, contabilidad). Así lo que se ve, lo que se imprime y lo que se declara nunca difieren.
//
// REGLA DE PRECIOS (Peter, 2026-11-19): el precio de un producto o servicio es el PRECIO FINAL que paga el cliente.
// Si el producto lleva ITBIS (16 % o 18 %), ese precio YA lo incluye; si no lo lleva, es «Exento». El ITBIS no se suma
// encima: se separa hacia atrás. Es la misma fórmula de Soraya y Leonardo Tours y de Hotel Gil, que ya operan en
// producción ante la DGII (y de OG DENTAL):
//
//     neto  = cantidad × precio − descuento          (lo que paga el cliente por la línea)
//     base  = neto ÷ (1 + tasa)                      (MontoItem, sin ITBIS)
//     ITBIS = neto − base
//     total = neto                                    (el comprobante suma exactamente los precios)
//
// En el XML el precio unitario va SIN ITBIS (precio ÷ (1 + tasa), hasta 4 decimales, como permite la DGII) y
// IndicadorMontoGravado=0, para que CantidadItem × PrecioUnitarioItem − DescuentoMonto = MontoItem.
//
// Reglas oficiales de la DGII que se respetan (Informe Técnico e-CF v1.0 y Formato e-CF v1.0):
//  - redondeo a 2 decimales con el tercero ≥ 5 hacia arriba;
//  - tolerancia de ±1 por línea en cantidad × precio y global igual al número de líneas (si no, «Aceptado Condicional»);
//  - MontoTotal = MontoGravadoTotal + MontoExento + TotalITBIS.
//
// Cuando el precio NO incluye ITBIS (`incluyeITBIS` ausente o falso: el flujo de certificación, los comprobantes de
// compra E41 y los tipos exentos) el comportamiento es exactamente el de siempre: el precio es la base.
// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
import type { LineaServicio } from "@/types";

export const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const r4 = (n: number) => Math.round((n + Number.EPSILON) * 10000) / 10000;

/** Tipos de comprobante donde el precio del producto ya incluye el ITBIS. El resto (E41 compras con retención,
 *  E43/E44/E47 exentos y E46 exportación) conserva su tratamiento. */
export const TIPOS_PRECIO_CON_ITBIS: readonly string[] = ["E31", "E32", "E33", "E34", "E45"];

/** Marca las líneas gravadas como «precio con ITBIS incluido» según el tipo de comprobante (decide el servidor). */
export function conItbisIncluido(items: LineaServicio[], tipoECF: string): LineaServicio[] {
  const aplica = TIPOS_PRECIO_CON_ITBIS.includes(tipoECF);
  return items.map((it) => ({ ...it, incluyeITBIS: aplica && (it.itbis || 0) > 0 }));
}

export interface LineaFiscal {
  cant: number;
  /** PrecioUnitarioItem tal como va al XML: sin ITBIS (si el precio lo incluía, ya está dividido entre 1 + tasa). */
  precioU: number;
  /** DescuentoMonto sin ITBIS. */
  desc: number;
  /** MontoItem: la base de la línea, sin ITBIS. */
  monto: number;
  tasa: number;
  /** Lo que paga el cliente por la línea (con ITBIS). */
  neto: number;
  /** true si el precio de la línea traía el ITBIS incluido. */
  incluye: boolean;
}

export function lineaFiscal(item: LineaServicio): LineaFiscal {
  // por_grupo = un solo paquete al precio indicado (cantidad 1): evita dividir el precio entre pax y que la
  // multiplicación no cuadre por redondeo.
  const cant = item.modo === "por_grupo" ? 1 : item.modo === "unidad" ? (item.cant || 1) : (item.pax || 1);
  const bruto = r2(cant * item.precio);
  const desc = Math.min(r2(item.descuentoMonto || 0), bruto);
  const neto = r2(bruto - desc);
  const tasa = item.itbis || 0;

  if (item.incluyeITBIS && tasa > 0) {
    const f = 1 + tasa;
    const descBase = r2(desc / f);
    return { cant, precioU: item.precio / f, desc: descBase, monto: r2(neto / f), tasa, neto, incluye: true };
  }
  return { cant, precioU: item.precio, desc, monto: neto, tasa, neto, incluye: false };
}

/**
 * El precio unitario del XML admite hasta 4 decimales. Con el precio ya dividido entre (1 + tasa), cantidad × precio
 * unitario ya truncado no debe apartarse del MontoItem más de la tolerancia de la DGII (±1 por línea). Con cantidades
 * enormes (decenas de miles de unidades en una sola línea) el truncado puede pasarse; en ese caso la línea NO se puede
 * declarar con precisión y hay que dividirla en varias. Devuelve el índice de la primera línea con ese problema, o -1.
 */
export function lineaConPrecisionInsuficiente(items: LineaServicio[]): number {
  return items.findIndex((it) => {
    const l = lineaFiscal(it);
    if (!l.incluye) return false;
    const declarado = r2(l.cant * r4(l.precioU) - l.desc);
    return Math.abs(declarado - l.monto) > 0.45;
  });
}

/** Tratamiento de los totales según el tipo de comprobante (el mismo que aplica el servidor al emitir). */
export const modoDeTipo = (tipoECF: string): "normal" | "exento" | "tasa3" =>
  tipoECF === "E46" ? "tasa3" : ["E43", "E44", "E47"].includes(tipoECF) ? "exento" : "normal";

export type TratamientoITBIS = "normal" | "exento" | "tasa3";

export interface TotalesFiscales {
  gravadoI1: number; gravadoI2: number; gravadoI3: number; exento: number;
  itbis1: number; itbis2: number; itbis: number; total: number;
}

// Totales exactamente como van en <Totales>. "exento" fuerza todo a exento (E43/E44/E47) y "tasa3" todo a tasa 0 %
// gravada (E46 exportaciones); en esos dos modos el ITBIS no existe, así que el precio es la base.
export function totalesFiscales(items: LineaServicio[], modo: TratamientoITBIS = "normal"): TotalesFiscales {
  const sinItbis = modo !== "normal";
  const lineas = items.map((it) => lineaFiscal(sinItbis ? { ...it, incluyeITBIS: false } : it));

  // Por tasa: suma de bases (MontoItem) y, aparte, lo que ya incluía ITBIS y lo que no.
  const porTasa = (tasa: number) => {
    const ls = lineas.filter((l) => l.tasa === tasa);
    const inc = ls.filter((l) => l.incluye), noInc = ls.filter((l) => !l.incluye);
    const montoInc = r2(inc.reduce((s, l) => s + l.monto, 0));
    const netoInc = r2(inc.reduce((s, l) => s + l.neto, 0));
    const montoNoInc = r2(noInc.reduce((s, l) => s + l.monto, 0));
    return {
      gravado: r2(montoInc + montoNoInc),
      // ITBIS de lo que ya venía incluido = lo que pagó el cliente − su base (así base + ITBIS = precio, al centavo);
      // ITBIS de lo que no venía incluido = base × tasa (como siempre).
      itbis: r2(r2(netoInc - montoInc) + r2(montoNoInc * tasa)),
    };
  };

  let g3 = 0, ex = 0;
  if (modo === "exento") ex = r2(lineas.reduce((s, l) => s + l.monto, 0));
  else if (modo === "tasa3") g3 = r2(lineas.reduce((s, l) => s + l.monto, 0));
  else ex = r2(lineas.filter((l) => l.tasa !== 0.18 && l.tasa !== 0.16).reduce((s, l) => s + l.monto, 0));

  const t18 = sinItbis ? { gravado: 0, itbis: 0 } : porTasa(0.18);
  const t16 = sinItbis ? { gravado: 0, itbis: 0 } : porTasa(0.16);
  return {
    gravadoI1: t18.gravado, gravadoI2: t16.gravado, gravadoI3: g3, exento: ex,
    itbis1: t18.itbis, itbis2: t16.itbis, itbis: r2(t18.itbis + t16.itbis),
    total: r2(t18.gravado + t16.gravado + g3 + ex + t18.itbis + t16.itbis),
  };
}
