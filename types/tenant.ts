export type EstadoTenant =
  | "demo"
  | "pendiente_certificacion"
  | "certificando"
  | "activo"
  | "suspendido";

export type TipoNegocio =
  | "ferreteria"
  | "farmacia"
  | "servicios"
  | "retail"
  | "restaurante"
  | "colmado_supermercado"
  | "salon_spa"
  | "taller_mecanico"
  | "clinica_consultorio"
  | "gimnasio"
  | "distribuidora_mayorista"
  | "tienda_ropa"
  | "panaderia_reposteria"
  | "agencia_consultoria"
  | "bar_colmadon"
  | "hotel"
  | "otro";

export interface Tenant {
  id:            string;
  // Asignado en la Fase 6 al completar la certificación — antes de eso el
  // tenant no tiene subdominio propio (vive en el flujo de onboarding del
  // dominio raíz).
  slug?:         string;
  nombreNegocio: string;
  rnc:           string;
  tipoNegocio:   TipoNegocio;
  estado:        EstadoTenant;
  creadoEn:      string;
  creadoPorUid:  string;
}

// Configuración del emisor para el motor e-CF (Fase 2) — separada del doc
// tenants/{tenantId} porque nunca se expone al cliente vía Firestore rules.
export interface EmpresaConfig {
  nombre:            string;
  rnc:               string;
  direccion:         string;
  telefono:          string;
  actividadEconomica: string;
  ambiente:          "ecf" | "certecf" | "testecf";
}

export type RolMembership = "owner" | "admin" | "vendedor" | "contador" | "viewer";

export interface Membership {
  uid:       string;
  tenantId:  string;
  rol:       RolMembership;
  creadoEn:  string;
}

// users/{uid} — perfil global, no tenant-scoped.
export type TipoCuenta = "individual" | "gestor";

export interface UserPerfil {
  uid:        string;
  email:      string;
  nombre:     string;
  tipoCuenta: TipoCuenta;
  creadoEn:   string;
}
