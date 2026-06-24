import type { TipoECF } from "@/types";

// Una fila del Excel de "set de pruebas" que la DGII le asigna a cada
// contribuyente al iniciar el proceso de certificación (Paso 2). Los nombres
// de columna del Excel son los mismos nombres de los tags del XSD del e-CF
// (normalizados a minúsculas sin acentos) — no son inventados por Facturacon.
export interface ItemFilaPrueba {
  descripcion:     string;
  cantidad:        number;
  precioUnitario:  number;
  itbis:           number;       // 0 | 0.16 | 0.18
  descuentoMonto?: number;
}

export type EstadoEnvioPrueba = "pendiente" | "enviando" | "enviado" | "aceptado" | "rechazado" | "error";

export interface FilaSetPrueba {
  encf:               string;
  tipoECF:            TipoECF;
  fechaEmision:       string;   // YYYY-MM-DD
  vencimientoECF:     string;   // YYYY-MM-DD
  terminoPago:        "Contado" | "Crédito";
  rncComprador?:      string;
  razonSocialComprador?: string;
  montoTotal:         number;
  items:              ItemFilaPrueba[];
  // Solo para E33/E34 — la nota modifica un eNCF previo del mismo set.
  eCFRef?:            string;
  motivoNota?:        string;
  codigoModificacion?: string;
  // Estado de envío a DGII, actualizado por /api/certificacion/enviar.
  estadoEnvio:        EstadoEnvioPrueba;
  trackId?:           string;
  estadoDGII?:        string;
  error?:             string;
  enviadoEn?:         string;
}

export type EstadoAC = 1 | 2; // 1 = Aceptado, 2 = Rechazado

export interface ItemAC {
  encf:            string;
  tipoECF:         TipoECF;
  rncEmisor:        string;
  rncComprador:     string;
  fechaEmision:     string;  // dd-MM-YYYY (formato DGII para ACECF)
  montoTotal:       number;
  estado:           EstadoAC;
  motivoRechazo?:   string;
  fechaHoraAC:      string;  // dd-MM-YYYY HH:mm:ss
  // Resultado del envío de la AC.
  enviado?:         boolean;
  resultado?:       string;
  error?:           string;
}

// Tipos de e-CF que la DGII NO exige Aprobación Comercial.
export const TIPOS_SIN_AC = new Set<TipoECF>(["E32", "E41", "E43", "E46", "E47"]);

// Comprador genérico de pruebas que usa la DGII para certificación cuando el
// Excel no trae uno propio — "DOCUMENTOS ELECTRONICOS DE PRUEBA DGII".
export const RNC_PRUEBA_DGII = "131880681";
export const NOMBRE_PRUEBA_DGII = "DOCUMENTOS ELECTRONICOS DE PRUEBA DGII";

export interface FacturaPrueba {
  id:             string;
  tipoECF:        TipoECF;
  eCF:            string;
  fecha:          string;
  descripcion:    string;
  montoTotal:     number;
  estadoEnvio:    EstadoEnvioPrueba;
  trackId?:       string;
  estadoDGII?:    string;
  error?:         string;
  creadoEn:       string;
}
