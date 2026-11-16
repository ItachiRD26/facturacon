// Plan de las pruebas de simulación (Paso 4): los comprobantes que el sistema
// genera solo, con datos de ejemplo válidos, para que el usuario no tenga que
// escribir nada. Se envían por tandas, en orden: la siguiente tanda se
// habilita cuando la DGII acepta TODA la anterior (un rechazo reinicia el lote
// en la DGII, así que no conviene seguir enviando encima de un error).
import type { TipoECF } from "@/types";
import type { FilaSetPrueba } from "./tipos";

export const TAMANO_TANDA = 4;

export interface ItemSimulacion {
  orden: number;                 // 1, 2, 3… en el orden en que se envían
  tanda: number;                 // 1, 2, 3…
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

export function planSimulacion(filasPaso2: FilaSetPrueba[]): ItemSimulacion[] {
  // Las notas deben modificar facturas DISTINTAS del Paso 2 (cada una solo se acredita una vez).
  // Y no las que las notas del propio set del Paso 2 ya modificaron (cada factura se acredita una sola vez).
  const yaModificadas = new Set(filasPaso2.map((f) => f.eCFRef).filter(Boolean));
  const facturas = filasPaso2
    .filter((f) => (f.tipoECF === "E31" || (f.tipoECF === "E32" && f.montoTotal >= 250000))
      && (f.estadoEnvio === "enviado" || f.estadoEnvio === "aceptado")
      && !yaModificadas.has(f.encf))
    .sort((a, b) => a.encf.localeCompare(b.encf));
  const refDebito  = facturas[0]?.encf;
  const refCredito = facturas[1]?.encf;
  const sinPaso2 = "Necesita facturas del Paso 2 (E31) enviadas y sin modificar.";

  const lista: Omit<ItemSimulacion, "orden" | "tanda">[] = [
    { tipoECF: "E43", titulo: "Gasto menor", monto: 1500, cuerpo: { itbis: "0" } },
    { tipoECF: "E44", titulo: "Régimen especial", monto: 2500, cuerpo: { itbis: "0", rncComprador: RNC_PRUEBA, nombreComprador: NOMBRE_PRUEBA } },
    { tipoECF: "E41", titulo: "Compra a un proveedor informal", monto: 5000, cuerpo: { itbis: "0.18", rncProveedor: RNC_PRUEBA, nombreProveedor: NOMBRE_PRUEBA } },
    { tipoECF: "E45", titulo: "Venta al gobierno", monto: 8000, cuerpo: { itbis: "0.18", rncComprador: RNC_PRUEBA, nombreComprador: NOMBRE_PRUEBA } },
    { tipoECF: "E46", titulo: "Exportación", monto: 12000, cuerpo: { rncComprador: RNC_PRUEBA, nombreComprador: NOMBRE_PRUEBA } },
    { tipoECF: "E47", titulo: "Pago al exterior", monto: 9000, cuerpo: { idExtranjero: "350555123", nombreExtranjero: "BENEFICIARIO EXTERIOR DE PRUEBA" } },
    { tipoECF: "E32", titulo: "Consumo de RD$250 mil o más", monto: 300000, cuerpo: { itbis: "0.18", rncComprador: RNC_PRUEBA, nombreComprador: NOMBRE_PRUEBA } },
    {
      tipoECF: "E33", titulo: "Nota de débito", monto: 500,
      cuerpo: { itbis: "0.18", eCFRef: refDebito ?? "", motivoNota: "Ajuste de prueba de certificación", codigoModificacion: "3", rncComprador: RNC_PRUEBA, nombreComprador: NOMBRE_PRUEBA },
      bloqueo: refDebito ? undefined : sinPaso2,
    },
    {
      tipoECF: "E34", titulo: "Nota de crédito", monto: 500,
      cuerpo: { itbis: "0.18", eCFRef: refCredito ?? "", motivoNota: "Ajuste de prueba de certificación", codigoModificacion: "1", rncComprador: RNC_PRUEBA, nombreComprador: NOMBRE_PRUEBA },
      bloqueo: refCredito ? undefined : sinPaso2,
    },
  ];

  return lista.map((it, i) => ({ ...it, orden: i + 1, tanda: Math.floor(i / TAMANO_TANDA) + 1 }));
}
