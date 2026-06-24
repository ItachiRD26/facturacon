import type { TipoNegocio } from "@/types/tenant";

export const TIPOS_NEGOCIO: { codigo: TipoNegocio; label: string; disponible: boolean }[] = [
  { codigo: "ferreteria",  label: "Ferretería",                disponible: true  },
  { codigo: "farmacia",    label: "Farmacia",                  disponible: true  },
  { codigo: "servicios",   label: "Servicios profesionales",   disponible: true  },
  { codigo: "retail",      label: "Tienda / Retail",           disponible: true  },
  { codigo: "restaurante", label: "Restaurante",                disponible: true  },
  { codigo: "hotel",       label: "Hotel",                     disponible: false },
  { codigo: "otro",        label: "Otro",                      disponible: true  },
];
