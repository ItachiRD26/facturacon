import type { TipoNegocio } from "@/types/tenant";

export const TIPOS_NEGOCIO: { codigo: TipoNegocio; label: string; disponible: boolean }[] = [
  { codigo: "ferreteria",             label: "Ferretería",                   disponible: true  },
  { codigo: "farmacia",               label: "Farmacia",                     disponible: true  },
  { codigo: "colmado_supermercado",   label: "Colmado / Supermercado",       disponible: true  },
  { codigo: "retail",                 label: "Tienda / Retail",              disponible: true  },
  { codigo: "tienda_ropa",            label: "Tienda de ropa y calzado",     disponible: true  },
  { codigo: "restaurante",            label: "Restaurante",                  disponible: true  },
  { codigo: "bar_colmadon",           label: "Bar / Colmadón",               disponible: true  },
  { codigo: "panaderia_reposteria",   label: "Panadería / Repostería",       disponible: true  },
  { codigo: "salon_spa",              label: "Salón de belleza / Spa",       disponible: true  },
  { codigo: "taller_mecanico",        label: "Taller mecánico / Auto",       disponible: true  },
  { codigo: "clinica_consultorio",    label: "Clínica / Consultorio médico", disponible: true  },
  { codigo: "gimnasio",               label: "Gimnasio",                     disponible: true  },
  { codigo: "distribuidora_mayorista",label: "Distribuidora / Mayorista",    disponible: true  },
  { codigo: "agencia_consultoria",    label: "Agencia / Consultoría",        disponible: true  },
  { codigo: "servicios",              label: "Servicios profesionales",      disponible: true  },
  { codigo: "hotel",                  label: "Hotel",                        disponible: false },
  { codigo: "otro",                   label: "Otro",                         disponible: true  },
];
