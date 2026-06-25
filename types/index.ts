// ── Cliente ───────────────────────────────────────────────────────
export type TipoPersona     = "fisica" | "juridica" | "consumidor";
export type SubtipoJuridica = "regular" | "gobierno" | "zona_franca" | "exportacion";

export interface Cliente {
  id:        string;
  rnc:       string;
  nombre:    string;
  direccion: string;
  ciudad:    string;
  contacto:  string;
  telefono:  string;
  tipo:      TipoPersona;
  subtipo?:  SubtipoJuridica;
  email?:    string;
  creadoEn?: string;
  // Marcado al activar el tenant sobre todo lo creado en el entorno de
  // prueba (Fase 6) — los hooks de producción lo usan para no mezclar
  // datos de prueba con datos reales en el mismo subdominio.
  esMuestra?: boolean;
}

// ── e-CF ──────────────────────────────────────────────────────────
export type TipoECF =
  | "E31" | "E32" | "E33" | "E34"
  | "E41" | "E43" | "E44" | "E45"
  | "E46" | "E47";

export const TIPOS_ECF: { codigo: TipoECF; label: string; soloB2B?: boolean }[] = [
  { codigo: "E31", label: "E31 — Crédito Fiscal Electrónica",       soloB2B: true  },
  { codigo: "E32", label: "E32 — Consumo Electrónica",              soloB2B: false },
  { codigo: "E33", label: "E33 — Nota de Débito Electrónica",       soloB2B: true  },
  { codigo: "E34", label: "E34 — Nota de Crédito Electrónica",      soloB2B: true  },
  { codigo: "E41", label: "E41 — Compras Electrónica",              soloB2B: true  },
  { codigo: "E43", label: "E43 — Gastos Menores Electrónica",       soloB2B: true  },
  { codigo: "E44", label: "E44 — Regímenes Especiales Electrónica", soloB2B: true  },
  { codigo: "E45", label: "E45 — Gubernamental Electrónica",        soloB2B: true  },
  { codigo: "E46", label: "E46 — Exportaciones Electrónica",        soloB2B: true  },
  { codigo: "E47", label: "E47 — Pagos al Exterior Electrónica",    soloB2B: true  },
];

export const ITBIS_RATES = [
  { val: 0,    label: "Exento (E)" },
  { val: 0.16, label: "16%"        },
  { val: 0.18, label: "18%"        },
] as const;

export const TERMINOS_PAGO  = ["Contado", "Crédito"] as const;
export const PLAZOS_CREDITO = ["15 Días", "30 Días", "45 Días", "60 Días", "90 Días"] as const;

// ── Producto / Servicio (catálogo genérico) ───────────────────────
// Modelo único para inventario y servicios — un "servicio" es simplemente
// un producto con controlaStock=false. Cubre ferretería, farmacia, retail,
// restaurante, salón, taller, clínica, etc. (no aplica al modelo "tour" de
// pax/grupo, que se mantiene aparte solo por compatibilidad de tipos).
export interface Producto {
  id:            string;
  codigo:        string;
  nombre:        string;
  descripcion?:  string;
  precio:        number;
  itbis:         number;
  controlaStock: boolean;
  stock?:        number;
  activo:        boolean;
  creadoEn?:     string;
  actualizadoEn?: string;
  esMuestra?:    boolean;
}

// ── Línea de Servicio ─────────────────────────────────────────────
// "unidad": modelo genérico cantidad × precio unitario (ferretería, farmacia,
// retail, restaurante, servicios, etc.) — usa el campo `cant`.
// "por_persona"/"por_grupo": modelo heredado del negocio de origen (tours),
// usa el campo `pax` — se mantiene por compatibilidad de tipos del motor
// e-CF, pero el catálogo de negocios genéricos de Facturacon solo emite
// líneas en modo "unidad".
export type ModoLinea = "unidad" | "por_persona" | "por_grupo";

export interface LineaServicio {
  servicioId?:    string;
  fromCatalog?:   boolean;
  tramoLabel?:    string;
  codigo:         string;
  descripcion:    string;
  modo:           ModoLinea;
  cant:           number;
  pax:            number;
  adultos?:       number;
  ninos5a7?:      number;
  ninos0a4?:      number;
  precio:         number;
  descuentoMonto: number;
  itbis:          number;
  fechaTour?:     string;
}

// ── Totales ───────────────────────────────────────────────────────
export interface Totales {
  bruto: number;
  desc:  number;
  sub:   number;
  itbis: number;
  total: number;
}

// ── Factura ───────────────────────────────────────────────────────
export type EstadoFactura = "pendiente" | "pagada" | "anulada";

export interface Factura {
  id:                    string;
  idTransaccion?:        string;
  noFactura:             string;
  eCF:                   string;
  tipoECF:               TipoECF;
  fecha:                 string;
  hora?:                 string;
  vencimientoECF:        string;
  abonoInicialMonto?:    number;
  abonoInicialMetodo?:   string;
  abonoInicialRef?:      string;
  terminos:              string;
  metodoPago?:           string;
  clienteId:             string;
  cotizacionRef?:        string;
  eCFRef?:               string;
  motivoNota?:           string;
  codigoModificacion?:   string;
  esConsumidorFinal?:    boolean;
  nombreConsumidor?:     string;
  telefonoConsumidor?:   string;
  estado:                EstadoFactura;
  items:                 LineaServicio[];
  notas?:                string;
  creadoEn?:             string;
  creadoPor?:            string;
  modalidadPago?:        "unico" | "plazo";
  fechaVencimientoPago?: string;
  rncCompradorOcasional?:  string;
  esExtranjeroComprador?:  boolean;
  estadoDGII?:           "pendiente" | "Enviado" | "Aceptado" | "AceptadoCondicional" | "Rechazado" | "Anulada";
  trackIdDGII?:          string;
  urlQR?:                string;
  xmlFirmado?:           string;
  signatureValue?:       string;
  codigoSeguridad?:      string;
  fechaEnvioDGII?:       string;
  fechaConsultaDGII?:    string;
  mensajesDGII?:         string[];
  fechaAnulacion?:       string;
  esMuestra?:            boolean;
}

// ── Factura Recibida (receptor DGII) ─────────────────────────────
export type EstadoARECF  = "pendiente" | "Enviado" | "Error";
export type EstadoACECF  = "pendiente" | "Aceptado" | "Rechazado" | "NoAplica";

export interface FacturaRecibida {
  id:                    string;
  encf:                  string;
  tipoECF:               string;
  rncEmisor:             string;
  razonSocialEmisor?:    string;
  rncComprador:          string;
  fechaEmision:          string;
  montoTotal:            number;
  estadoARECF:           EstadoARECF;
  fechaARECF?:           string;
  xmlARECF?:             string;
  estadoACECF:           EstadoACECF;
  motivoRechazoACECF?:   string;
  fechaACECF?:           string;
  xmlACECF?:             string;
  xmlRecibido?:          string;
  recibidoEn?:           string;
  esMuestra?:            boolean;
}

// ── Cotización ────────────────────────────────────────────────────
export type EstadoCotizacion = "vigente" | "vencida" | "convertida" | "anulada";

export interface Cotizacion {
  id:           string;
  noCotizacion: string;
  fecha:        string;
  vencimiento:  string;
  validez?:     string;
  clienteId:    string;
  estado:       EstadoCotizacion;
  items:        LineaServicio[];
  notas?:       string;
  facturaRef?:  string;
  creadoEn?:    string;
  esMuestra?:   boolean;
}

// ── Abono ─────────────────────────────────────────────────────────
export interface Abono {
  id:            string;
  fecha:         string;
  monto:         number;
  metodoPago:    string;
  nota?:         string;
  registradoEn?: string;
}

// ── Cuenta por Cobrar ─────────────────────────────────────────────
export type EstadoCuenta = "vigente" | "vencida" | "pagada" | "anulada";

export interface CuentaPorCobrar {
  id:               string;
  clienteId:        string;
  numeroFactura:    string;
  fecha:            string;
  fechaVencimiento: string;
  monto:            number;
  pagado:           number;
  devuelto:         number;
  creditos:         number;
  estado:           EstadoCuenta;
  notas?:           string;
  abonos:           Abono[];
  creadoEn?:        string;
  actualizadoEn?:   string;
  esMuestra?:       boolean;
}

// ── calcLinea ─────────────────────────────────────────────────────
// Por grupo: precio es PLANO (total del grupo, no × cant)
// Por persona: precio × cant
export function calcLinea(item: LineaServicio) {
  const cantidad = item.modo === "unidad" ? (item.cant || 1) : (item.pax || 1);
  const bruto    = item.modo === "por_grupo" ? item.precio : item.precio * cantidad;
  const descAmt  = Math.min(item.descuentoMonto || 0, bruto);
  const sub      = Math.max(0, bruto - descAmt);
  const itbisAmt = sub * (item.itbis || 0);
  return { bruto, descAmt, sub, itbisAmt, total: sub + itbisAmt };
}

export function calcTotales(items: LineaServicio[]): Totales {
  return items.reduce(
    (acc, item) => {
      const c = calcLinea(item);
      return {
        bruto: acc.bruto + c.bruto,
        desc:  acc.desc  + c.descAmt,
        sub:   acc.sub   + c.sub,
        itbis: acc.itbis + c.itbisAmt,
        total: acc.total + c.total,
      };
    },
    { bruto: 0, desc: 0, sub: 0, itbis: 0, total: 0 }
  );
}

// ── Helpers de formato ────────────────────────────────────────────
export const fmt = (n: number) =>
  new Intl.NumberFormat("es-DO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n || 0);

export const fmtDate = (d: string) =>
  new Date(d + "T12:00:00").toLocaleDateString("es-DO", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });

export const localDate = (d: Date = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const today = () => localDate();

export const genECF = (tipo: TipoECF, seq: number) =>
  `${tipo}${String(seq).padStart(10, "0")}`;

export const genCOT = (seq: number) =>
  `COT-${new Date().getFullYear()}-${String(seq).padStart(4, "0")}`;

// ── Helpers CxC ──────────────────────────────────────────────────
export function calcPendiente(c: CuentaPorCobrar): number {
  return Math.max(0, c.monto - c.pagado - c.devuelto - c.creditos);
}

export function agingBucket(fechaVencStr: string): string {
  const dias = Math.floor(
    (Date.now() - new Date(fechaVencStr + "T12:00:00").getTime()) / 86400000
  );
  if (dias <= 0)   return "0-30";
  if (dias <= 30)  return "0-30";
  if (dias <= 60)  return "31-60";
  if (dias <= 90)  return "61-90";
  if (dias <= 120) return "91-120";
  return "+120";
}

// ── Resolver tipo e-CF ────────────────────────────────────────────
export interface ECFConfig {
  tipoDefault:      TipoECF;
  tiposDisponibles: TipoECF[];
  locked:           boolean;
  motivo:           string;
}

export function resolverECFConfig(
  cliente: Pick<Cliente, "tipo" | "subtipo" | "rnc"> | undefined,
  esWalkIn: boolean,
  esCompra = false,
): ECFConfig {
  if (esCompra) {
    if (esWalkIn || !cliente) {
      return {
        tipoDefault:      "E43",
        tiposDisponibles: ["E43", "E47"],
        locked:           false,
        motivo:           "Sin proveedor — E43 gasto menor / E47 pago al exterior",
      };
    }
    return {
      tipoDefault:      "E41",
      tiposDisponibles: ["E41"],
      locked:           true,
      motivo:           "Compra a proveedor local — E41",
    };
  }

  if (esWalkIn || !cliente) {
    return { tipoDefault: "E32", tiposDisponibles: ["E32"], locked: true, motivo: "Consumidor final — E32" };
  }
  if (cliente.tipo === "consumidor" || (cliente.tipo === "fisica" && !cliente.rnc?.trim())) {
    return { tipoDefault: "E32", tiposDisponibles: ["E32"], locked: true, motivo: "Consumidor — solo E32" };
  }
  if (cliente.tipo === "fisica") {
    return { tipoDefault: "E31", tiposDisponibles: ["E31", "E32"], locked: false, motivo: "Persona física con RNC — E31 o E32" };
  }
  const subtipo = cliente.subtipo ?? "regular";
  if (subtipo === "gobierno")    return { tipoDefault: "E45", tiposDisponibles: ["E45", "E31"], locked: false, motivo: "Entidad gubernamental — E45" };
  if (subtipo === "zona_franca") return { tipoDefault: "E44", tiposDisponibles: ["E44", "E31"], locked: false, motivo: "Régimen especial — E44" };
  if (subtipo === "exportacion") return { tipoDefault: "E46", tiposDisponibles: ["E46", "E31"], locked: false, motivo: "Exportación — E46" };
  return { tipoDefault: "E31", tiposDisponibles: ["E31"], locked: true, motivo: "Empresa — E31" };
}

export function labelModo(modo: ModoLinea): string {
  if (modo === "unidad")      return "Por Unidad";
  if (modo === "por_persona") return "Por Persona";
  return "Por Grupo";
}

export function nuevaLineaUnidad(): LineaServicio {
  return {
    codigo: "", descripcion: "", modo: "unidad",
    cant: 1, pax: 1, precio: 0, descuentoMonto: 0, itbis: 0.18,
  };
}
