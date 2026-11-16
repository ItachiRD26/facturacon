// Plan de las pruebas de simulación (Paso 4): los comprobantes que el sistema
// genera solo, con datos de ejemplo válidos, para que el usuario no tenga que
// escribir nada. Son los 25 que pide el portal de la DGII, en el orden oficial:
//   1º  31, 32 (>= RD$250,000), 41, 43, 44, 45, 46, 47
//   2º  33, 34   (notas: modifican facturas ya aceptadas)
//   3º  32 Resumen (RFCE), monto < RD$250,000
//   4º  32 factura íntegra < RD$250,000 → la sube el usuario a mano en el portal
// Se envían por tandas de hasta 4: la siguiente se habilita cuando la DGII
// acepta TODA la anterior (un rechazo reinicia el lote en la DGII, así que no
// conviene seguir enviando encima de un error).
import type { TipoECF } from "@/types";
import type { FilaSetPrueba } from "./tipos";

export interface ItemSimulacion {
  orden: number;                 // identificador estable (va en la descripción guardada); no cambiar
  tanda: number;                 // 1, 2, 3… — la posición en la lista es el orden de envío
  grupo: 1 | 2 | 3;              // grupo oficial de la DGII
  tipoECF: TipoECF;
  titulo: string;                // qué representa, en lenguaje llano
  monto: number;                 // sin ITBIS
  // Cuerpo para POST /api/certificacion/crear-prueba (además de tenantId, tipoECF, descripcion, monto).
  cuerpo: Record<string, string>;
  bloqueo?: string;              // motivo si no se puede armar todavía (p. ej. falta el Paso 2)
}

// El marcador que va al inicio de la descripción: así, al recargar la página,
// cada comprobante guardado se reconoce con su lugar en el plan.
export const marcaSimulacion = (orden: number) => `Simulación #${orden}`;

const RNC_PRUEBA = "131880681";
const NOMBRE_PRUEBA = "DOCUMENTOS ELECTRONICOS DE PRUEBA DGII";
const COMPRADOR = { rncComprador: RNC_PRUEBA, nombreComprador: NOMBRE_PRUEBA };
const NOTA = { itbis: "0.18", motivoNota: "Ajuste de prueba de certificación", ...COMPRADOR };

export function planSimulacion(filasPaso2: FilaSetPrueba[]): ItemSimulacion[] {
  // Las notas deben modificar facturas DISTINTAS del Paso 2 (cada una solo se acredita una vez),
  // y no las que las notas del propio set del Paso 2 ya modificaron.
  const yaModificadas = new Set(filasPaso2.map((f) => f.eCFRef).filter(Boolean));
  const facturas = filasPaso2
    .filter((f) => (f.tipoECF === "E31" || (f.tipoECF === "E32" && f.montoTotal >= 250000))
      && (f.estadoEnvio === "enviado" || f.estadoEnvio === "aceptado")
      && !yaModificadas.has(f.encf))
    .sort((a, b) => a.encf.localeCompare(b.encf));
  const sinPaso2 = "Necesita facturas del Paso 2 (E31) enviadas y sin modificar.";
  const refDebito   = facturas[0]?.encf;
  const refCredito  = facturas[1]?.encf;
  const refCredito2 = facturas[2]?.encf;

  // Los números `orden` 1-9 ya se usaron en envíos reales: no cambiarlos.
  const lista: ItemSimulacion[] = [
    // ── Grupo 1 ──
    { orden: 1,  tanda: 1, grupo: 1, tipoECF: "E43", titulo: "Gasto menor", monto: 1500, cuerpo: { itbis: "0" } },
    { orden: 2,  tanda: 1, grupo: 1, tipoECF: "E44", titulo: "Régimen especial", monto: 2500, cuerpo: { itbis: "0", ...COMPRADOR } },
    { orden: 3,  tanda: 1, grupo: 1, tipoECF: "E41", titulo: "Compra a un proveedor informal", monto: 5000, cuerpo: { itbis: "0.18", rncProveedor: RNC_PRUEBA, nombreProveedor: NOMBRE_PRUEBA } },
    { orden: 4,  tanda: 1, grupo: 1, tipoECF: "E45", titulo: "Venta al gobierno", monto: 8000, cuerpo: { itbis: "0.18", ...COMPRADOR } },
    { orden: 5,  tanda: 2, grupo: 1, tipoECF: "E46", titulo: "Exportación", monto: 12000, cuerpo: { ...COMPRADOR } },
    { orden: 6,  tanda: 2, grupo: 1, tipoECF: "E47", titulo: "Pago al exterior", monto: 9000, cuerpo: { idExtranjero: "350555123", nombreExtranjero: "BENEFICIARIO EXTERIOR DE PRUEBA" } },
    { orden: 7,  tanda: 2, grupo: 1, tipoECF: "E32", titulo: "Consumo de RD$250 mil o más", monto: 300000, cuerpo: { itbis: "0.18", ...COMPRADOR } },
    { orden: 10, tanda: 2, grupo: 1, tipoECF: "E43", titulo: "Gasto menor", monto: 1800, cuerpo: { itbis: "0" } },
    { orden: 11, tanda: 3, grupo: 1, tipoECF: "E44", titulo: "Régimen especial", monto: 2800, cuerpo: { itbis: "0", ...COMPRADOR } },
    { orden: 12, tanda: 3, grupo: 1, tipoECF: "E41", titulo: "Compra a un proveedor informal", monto: 5500, cuerpo: { itbis: "0.18", rncProveedor: RNC_PRUEBA, nombreProveedor: NOMBRE_PRUEBA } },
    { orden: 13, tanda: 3, grupo: 1, tipoECF: "E45", titulo: "Venta al gobierno", monto: 8500, cuerpo: { itbis: "0.18", ...COMPRADOR } },
    { orden: 14, tanda: 3, grupo: 1, tipoECF: "E46", titulo: "Exportación", monto: 12500, cuerpo: { ...COMPRADOR } },
    { orden: 15, tanda: 4, grupo: 1, tipoECF: "E47", titulo: "Pago al exterior", monto: 9500, cuerpo: { idExtranjero: "350555123", nombreExtranjero: "BENEFICIARIO EXTERIOR DE PRUEBA" } },
    { orden: 16, tanda: 4, grupo: 1, tipoECF: "E32", titulo: "Consumo de RD$250 mil o más", monto: 310000, cuerpo: { itbis: "0.18", ...COMPRADOR } },
    { orden: 17, tanda: 4, grupo: 1, tipoECF: "E31", titulo: "Crédito fiscal", monto: 20000, cuerpo: { itbis: "0.18", ...COMPRADOR } },
    { orden: 18, tanda: 4, grupo: 1, tipoECF: "E31", titulo: "Crédito fiscal", monto: 35000, cuerpo: { itbis: "0.18", ...COMPRADOR } },
    { orden: 19, tanda: 5, grupo: 1, tipoECF: "E31", titulo: "Crédito fiscal", monto: 50000, cuerpo: { itbis: "0.18", ...COMPRADOR } },
    { orden: 20, tanda: 5, grupo: 1, tipoECF: "E31", titulo: "Crédito fiscal", monto: 75000, cuerpo: { itbis: "0.18", ...COMPRADOR } },
    // ── Grupo 2: notas (después de que todo el grupo 1 esté aceptado) ──
    {
      orden: 8, tanda: 6, grupo: 2, tipoECF: "E33", titulo: "Nota de débito", monto: 500,
      cuerpo: { ...NOTA, eCFRef: refDebito ?? "", codigoModificacion: "3" }, bloqueo: refDebito ? undefined : sinPaso2,
    },
    {
      orden: 9, tanda: 6, grupo: 2, tipoECF: "E34", titulo: "Nota de crédito", monto: 500,
      cuerpo: { ...NOTA, eCFRef: refCredito ?? "", codigoModificacion: "1" }, bloqueo: refCredito ? undefined : sinPaso2,
    },
    {
      orden: 21, tanda: 6, grupo: 2, tipoECF: "E34", titulo: "Nota de crédito", monto: 500,
      cuerpo: { ...NOTA, eCFRef: refCredito2 ?? "", codigoModificacion: "1" }, bloqueo: refCredito2 ? undefined : sinPaso2,
    },
    // ── Grupo 3: resúmenes de consumo < RD$250 mil (la factura completa la sube el usuario en el portal) ──
    { orden: 22, tanda: 7, grupo: 3, tipoECF: "E32", titulo: "Consumo menor de RD$250 mil (resumen)", monto: 1500, cuerpo: { itbis: "0.18" } },
    { orden: 23, tanda: 7, grupo: 3, tipoECF: "E32", titulo: "Consumo menor de RD$250 mil (resumen)", monto: 2500, cuerpo: { itbis: "0.18" } },
    { orden: 24, tanda: 7, grupo: 3, tipoECF: "E32", titulo: "Consumo menor de RD$250 mil (resumen)", monto: 4000, cuerpo: { itbis: "0.18" } },
    { orden: 25, tanda: 7, grupo: 3, tipoECF: "E32", titulo: "Consumo menor de RD$250 mil (resumen)", monto: 6000, cuerpo: { itbis: "0.18" } },
  ];
  return lista;
}
