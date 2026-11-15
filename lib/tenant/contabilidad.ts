import "server-only";
import { adminDb } from "@/lib/firebase-admin";
import { calcTotales } from "@/types";
import type { Factura, TipoECF } from "@/types";

// Resumen contable de un mes para el panel del dueño/contador. Todo se
// calcula en el servidor a partir de tenants/{id}/facturas — nunca viaja la
// lista completa al navegador. Las facturas anuladas no suman a ninguna cifra
// (solo se cuentan aparte), igual que en el cierre fiscal real.

export interface FilaContable {
  id: string;
  fecha: string;
  eCF: string;
  tipoECF: TipoECF;
  clienteId: string;
  clienteLibre: string; // nombre cuando es consumidor final u ocasional
  estado: Factura["estado"];
  estadoDGII?: Factura["estadoDGII"];
  terminos: string;
  metodoPago?: string;
  cajeroUid: string;
  cajeroNombre: string;
  subtotal: number;
  itbis: number;
  total: number;
}

export interface ResumenContable {
  mes: string;                 // YYYY-MM
  etiquetaMes: string;         // "noviembre de 2026"
  esPrueba: boolean;           // datos del entorno de prueba (tenant aún no activo)
  comprobantes: number;        // sin anulados
  anulados: number;
  subtotal: number;
  itbis: number;
  total: number;
  cobrado: number;             // facturas pagadas
  porCobrar: number;           // facturas a crédito pendientes
  ticketPromedio: number;
  totalMesAnterior: number;
  comprobantesMesAnterior: number;
  porTipo: { tipo: TipoECF; cantidad: number; total: number; itbis: number }[];
  porCajero: { uid: string; nombre: string; cantidad: number; total: number }[];
  porDia: { dia: number; total: number }[];
  ultimas: FilaContable[];
  filas: FilaContable[];       // todas (para exportar); no se envía al cliente
}

export function mesValido(mes: string | undefined): string {
  if (mes && /^\d{4}-(0[1-9]|1[0-2])$/.test(mes)) return mes;
  const h = new Date();
  return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, "0")}`;
}

function limitesDeMes(mes: string): { inicio: string; fin: string; dias: number } {
  const [a, m] = mes.split("-").map(Number);
  const sig = new Date(a, m, 1);
  return {
    inicio: `${mes}-01`,
    fin: `${sig.getFullYear()}-${String(sig.getMonth() + 1).padStart(2, "0")}-01`,
    dias: new Date(a, m, 0).getDate(),
  };
}

export function mesAnteriorDe(mes: string): string {
  const [a, m] = mes.split("-").map(Number);
  const d = new Date(a, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function mesSiguienteDe(mes: string): string {
  const [a, m] = mes.split("-").map(Number);
  const d = new Date(a, m, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function etiquetaDeMes(mes: string): string {
  const [a, m] = mes.split("-").map(Number);
  return new Date(a, m - 1, 1).toLocaleDateString("es-DO", { month: "long", year: "numeric" });
}

async function leerFilas(tenantId: string, mes: string, incluirMuestras: boolean): Promise<FilaContable[]> {
  const { inicio, fin } = limitesDeMes(mes);
  const snap = await adminDb.collection("tenants").doc(tenantId).collection("facturas")
    .where("fecha", ">=", inicio).where("fecha", "<", fin).get();

  const filas: FilaContable[] = [];
  for (const d of snap.docs) {
    const f = d.data() as Factura;
    if (!incluirMuestras && f.esMuestra) continue;
    const t = calcTotales(f.items ?? []);
    filas.push({
      id: d.id, fecha: f.fecha, eCF: f.eCF, tipoECF: f.tipoECF, clienteId: f.clienteId ?? "",
      clienteLibre: f.nombreConsumidor ?? "", estado: f.estado, estadoDGII: f.estadoDGII,
      terminos: f.terminos, metodoPago: f.metodoPago,
      cajeroUid: f.creadoPor ?? "", cajeroNombre: f.creadoPorNombre ?? "",
      subtotal: t.sub, itbis: t.itbis, total: t.total,
    });
  }
  return filas.sort((a, b) => (a.fecha === b.fecha ? b.eCF.localeCompare(a.eCF) : b.fecha.localeCompare(a.fecha)));
}

export async function resumenContable(tenantId: string, mes: string, esPrueba: boolean): Promise<ResumenContable> {
  const { dias } = limitesDeMes(mes);
  // Mientras el tenant no esté activo todo lo que hay es de prueba y se
  // muestra tal cual (así el dueño ve cómo quedará); ya activo, lo sellado
  // como muestra al certificarse se excluye para no mezclar datos de prueba.
  const incluirMuestras = esPrueba;
  const [filas, anteriores] = await Promise.all([
    leerFilas(tenantId, mes, incluirMuestras),
    leerFilas(tenantId, mesAnteriorDe(mes), incluirMuestras),
  ]);

  const validas = filas.filter((f) => f.estado !== "anulada");
  const suma = (arr: FilaContable[], k: "subtotal" | "itbis" | "total") => arr.reduce((a, f) => a + f[k], 0);

  const tipos = new Map<TipoECF, { tipo: TipoECF; cantidad: number; total: number; itbis: number }>();
  const cajeros = new Map<string, { uid: string; nombre: string; cantidad: number; total: number }>();
  const porDia = Array.from({ length: dias }, (_, i) => ({ dia: i + 1, total: 0 }));

  for (const f of validas) {
    const t = tipos.get(f.tipoECF) ?? { tipo: f.tipoECF, cantidad: 0, total: 0, itbis: 0 };
    t.cantidad += 1; t.total += f.total; t.itbis += f.itbis;
    tipos.set(f.tipoECF, t);

    const clave = f.cajeroUid || "sin-asignar";
    const c = cajeros.get(clave) ?? { uid: clave, nombre: f.cajeroNombre || "Sin asignar", cantidad: 0, total: 0 };
    c.cantidad += 1; c.total += f.total;
    cajeros.set(clave, c);

    const dia = Number(f.fecha.slice(8, 10));
    if (dia >= 1 && dia <= dias) porDia[dia - 1].total += f.total;
  }

  const total = suma(validas, "total");
  const anterioresValidas = anteriores.filter((f) => f.estado !== "anulada");

  return {
    mes, etiquetaMes: etiquetaDeMes(mes), esPrueba,
    comprobantes: validas.length, anulados: filas.length - validas.length,
    subtotal: suma(validas, "subtotal"), itbis: suma(validas, "itbis"), total,
    cobrado: suma(validas.filter((f) => f.estado === "pagada"), "total"),
    porCobrar: suma(validas.filter((f) => f.estado === "pendiente"), "total"),
    ticketPromedio: validas.length ? total / validas.length : 0,
    totalMesAnterior: suma(anterioresValidas, "total"),
    comprobantesMesAnterior: anterioresValidas.length,
    porTipo: [...tipos.values()].sort((a, b) => b.total - a.total),
    porCajero: [...cajeros.values()].sort((a, b) => b.total - a.total),
    porDia,
    ultimas: filas.slice(0, 8),
    filas,
  };
}

// CSV con BOM y ";" no hace falta: Excel en español lee bien "," con comillas
// siempre que el archivo sea UTF-8 con BOM.
export function aCSV(filas: FilaContable[], nombreCliente: (f: FilaContable) => string): string {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const cab = ["Fecha", "e-CF", "Tipo", "Cliente", "Estado", "Estado DGII", "Condición", "Método de pago", "Emitido por", "Subtotal", "ITBIS", "Total"];
  const lineas = filas.map((f) => [
    f.fecha, f.eCF, f.tipoECF, nombreCliente(f), f.estado, f.estadoDGII ?? "", f.terminos, f.metodoPago ?? "",
    f.cajeroNombre, f.subtotal.toFixed(2), f.itbis.toFixed(2), f.total.toFixed(2),
  ].map(esc).join(","));
  return "﻿" + [cab.map(esc).join(","), ...lineas].join("\r\n");
}
