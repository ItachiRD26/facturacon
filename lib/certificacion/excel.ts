// Parseo del Excel de "set de pruebas" / "aprobaciones comerciales" que la
// DGII le entrega a cada contribuyente al certificarse. Los nombres de
// columna son los mismos nombres de los tags del XSD del e-CF (ej.
// "RNCComprador", "NombreItem1", "PrecioUnitarioItem1"...), normalizados
// aquí a minúsculas sin acentos/espacios para no depender de la capitalización
// exacta con la que Excel/DGII los entregue.
//
// XLSX (SheetJS) solo está disponible en la build de npm hasta la versión
// 0.18.5, que tiene CVEs conocidos (prototype pollution / ReDoS) sin parche
// publicado en el registro de npm. Mitigación: este parser solo se invoca
// desde rutas autenticadas con membership de tenant (nunca público), y
// `validarTamano()` limita el archivo a 5MB antes de tocar XLSX.
import "server-only";
import * as XLSX from "xlsx";
import type { TipoECF } from "@/types";
import type { EstadoAC, FilaSetPrueba, ItemAC, ItemFilaPrueba } from "./tipos";

const TAMANO_MAXIMO_BYTES = 5 * 1024 * 1024;

export function validarTamano(buffer: Buffer): void {
  if (buffer.length > TAMANO_MAXIMO_BYTES) {
    throw new Error("El archivo Excel supera el tamaño máximo permitido (5MB).");
  }
}

function normalizeKey(key: string): string {
  return key
    .toLowerCase()
    .normalize("NFD")
    .replace(/[^a-z0-9]/g, ""); // descarta acentos (tras NFD), espacios y símbolos de una sola pasada
}

function leerFilas(buffer: Buffer): Record<string, unknown>[] {
  validarTamano(buffer);
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheet    = workbook.Sheets[workbook.SheetNames[0]];
  // raw:false → preserva el string exacto del Excel ("15" vs "15.00")
  const rawRows  = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "", raw: false });
  return rawRows.map((row) => {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(row)) out[normalizeKey(k)] = v;
    return out;
  });
}

const VACIO_DGII = new Set(["#e", "#n/a", "n/a"]);

function raw(row: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = row[k];
    if (v !== undefined && v !== null) {
      const s = String(v).trim();
      if (s !== "" && !VACIO_DGII.has(s.toLowerCase())) return s;
    }
  }
  return "";
}

function fmtFechaISO(v: string): string {
  if (!v) return "";
  // Serial de fecha de Excel (días desde 1899-12-30)
  if (/^\d{5}$/.test(v)) {
    const d = new Date((Number(v) - 25569) * 86400000);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
  }
  // dd-MM-yyyy o dd/MM/yyyy
  const conGuionOSlash = v.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);
  if (conGuionOSlash) {
    const [, d, m, y] = conGuionOSlash;
    return `${y}-${m}-${d}`;
  }
  // yyyy-MM-dd ya viene listo
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  return v;
}

function tipoECFDesdeENCF(encf: string, rawTipo: string): TipoECF {
  const digitos = rawTipo || encf.match(/^E?(\d{2})/)?.[1] || "31";
  return `E${digitos.replace(/^E/i, "")}` as TipoECF;
}

function numero(v: string, porDefecto = 0): number {
  const n = parseFloat(v);
  return Number.isNaN(n) ? porDefecto : n;
}

// Indicador de facturación del XSD → tasa de ITBIS de Facturacon
function itbisDesdeIndicador(indicador: string): number {
  if (indicador === "1") return 0.18;
  if (indicador === "2") return 0.16;
  return 0; // 3 (exportación 0%) o 4 (exento)
}

function leerItems(row: Record<string, unknown>): ItemFilaPrueba[] {
  const items: ItemFilaPrueba[] = [];
  for (let i = 1; i <= 62; i++) {
    const nombre = raw(row, `nombreitem${i}`);
    if (!nombre) break;
    const cantidad = numero(raw(row, `cantidaditem${i}`), 1);
    const precio   = numero(raw(row, `preciounitarioitem${i}`));
    const monto    = numero(raw(row, `montoitem${i}`), cantidad * precio);
    const indFact  = raw(row, `indicadorfacturacion${i}`) || "1";
    const descuento = numero(raw(row, `descuentomonto${i}`, `montodescuento${i}`));
    items.push({
      descripcion:    raw(row, `descripcionitem${i}`) || nombre,
      cantidad,
      precioUnitario: precio || (cantidad > 0 ? monto / cantidad : 0),
      itbis:          itbisDesdeIndicador(indFact),
      ...(descuento > 0 ? { descuentoMonto: descuento } : {}),
    });
  }
  return items;
}

export function parseSetPaso2(buffer: Buffer): FilaSetPrueba[] {
  const filas = leerFilas(buffer);
  const resultado: FilaSetPrueba[] = [];

  for (const row of filas) {
    const encf = raw(row, "encf", "enf").toUpperCase();
    if (!encf) continue;

    const tipoECF   = tipoECFDesdeENCF(encf, raw(row, "tipoecf"));
    const montoTotal = numero(raw(row, "montototal"));
    const items      = leerItems(row);

    resultado.push({
      encf,
      tipoECF,
      fechaEmision:    fmtFechaISO(raw(row, "fechaemision")) || new Date().toISOString().slice(0, 10),
      vencimientoECF:  fmtFechaISO(raw(row, "fechavencimientosecuencia")) || "2099-12-31",
      terminoPago:     raw(row, "tipopago") === "2" ? "Crédito" : "Contado",
      rncComprador:    raw(row, "rnccomprador").replace(/\D/g, "") || undefined,
      razonSocialComprador: raw(row, "razonsocialcomprador") || undefined,
      montoTotal:      montoTotal || items.reduce((s, it) => s + it.cantidad * it.precioUnitario, 0),
      items,
      eCFRef:             raw(row, "ncfmodificado") || undefined,
      motivoNota:         raw(row, "razonmodificacion") || undefined,
      codigoModificacion: raw(row, "codigomodificacion") || undefined,
      estadoEnvio: "pendiente",
    });
  }

  return resultado;
}

export function parseACSet(buffer: Buffer): ItemAC[] {
  const filas = leerFilas(buffer);
  const resultado: ItemAC[] = [];

  for (const row of filas) {
    const encf = raw(row, "encf").toUpperCase();
    if (!encf) continue;

    const rncComprador = raw(row, "rnccomprador").replace(/\D/g, "");
    const fechaEmision  = raw(row, "fechaemision");
    if (!rncComprador || !fechaEmision) continue;

    const estadoRaw = raw(row, "estado");
    const estado: EstadoAC = estadoRaw === "2" ? 2 : 1;

    resultado.push({
      encf,
      tipoECF: tipoECFDesdeENCF(encf, ""),
      rncEmisor:     raw(row, "rncemisor").replace(/\D/g, "") || "",
      rncComprador,
      fechaEmision:  /^\d{2}-\d{2}-\d{4}$/.test(fechaEmision) ? fechaEmision : fmtFechaISO(fechaEmision),
      montoTotal:    numero(raw(row, "montototal")),
      estado,
      motivoRechazo: estado === 2 ? raw(row, "detallemotivorechazo") || undefined : undefined,
      fechaHoraAC:   raw(row, "fechahoraaprobacioncomercial") || "",
    });
  }

  return resultado;
}
