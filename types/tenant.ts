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
  // Nombre para MOSTRAR en el sistema: el nombre comercial que la DGII tiene
  // registrado y, si no tiene, la razón social. Lo fija el servidor.
  nombreNegocio: string;
  // Datos fiscales tal como los devuelve el padrón de la DGII al crear la empresa
  // (nunca los escribe el usuario). `razonSocial` es la que va en el XML y en la
  // factura impresa; `nombreComercial` solo existe si la DGII lo tiene registrado.
  razonSocial?:     string;
  nombreComercial?: string;
  facturadorElectronicoDGII?: boolean | null;
  // Quién puede EMITIR facturas además de los cajeros (ver puedeEmitir en lib/tenant/roles.ts).
  // El dueño y el administrador, por defecto, no facturan cuando hay un equipo: lo activan en
  // Equipo > Permisos con «Yo también facturo». `duenoFactura` queda en false solo al crear el
  // primer cajero (si el dueño no lo había decidido antes); `duenoFacturaManual` marca que lo decidió él.
  duenoFactura?: boolean;
  duenoFacturaManual?: boolean;
  adminFactura?: boolean;
  rnc:           string;
  tipoNegocio:   TipoNegocio;
  estado:        EstadoTenant;
  creadoEn:      string;
  creadoPorUid:  string;
  // Token opaco para la URL de login de empleados (/empleado/{token}) — ver
  // lib/tenant/codigo-empleado.ts. Se genera perezosamente la primera vez
  // que el dueño abre la sección de Empleados.
  linkEmpleadoToken?: string;
}

// Configuración del emisor para el motor e-CF (Fase 2) — separada del doc
// tenants/{tenantId} porque nunca se expone al cliente vía Firestore rules.
export interface EmpresaConfig {
  // Razón social como consta en el RNC (RazonSocialEmisor en el XML).
  nombre:            string;
  // Nombre comercial registrado en la DGII (NombreComercial en el XML), si lo hay.
  nombreComercial?:  string;
  rnc:               string;
  direccion:         string;
  telefono:          string;
  actividadEconomica: string;
  ambiente:          "ecf" | "certecf" | "testecf";
}

// Personalización de la factura impresa (logo del negocio) — vive en
// tenants/{tenantId}/config/personalizacion, solo la escribe el backend
// (después de procesar la imagen subida), el cliente solo lee.
export interface Personalizacion {
  logoA4Url?:      string;
  logoTermicoUrl?: string;
  actualizadoEn?:  string;
}

export type RolMembership = "owner" | "admin" | "vendedor" | "almacen" | "contador" | "viewer";

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
  telefono?:  string;
  tipoCuenta: TipoCuenta;
  creadoEn:   string;
}

// tenants/{tenantId}/empleados/{uid} — cuentas creadas por el dueño/admin
// para su equipo, con login por código en vez de correo/contraseña (ver
// lib/tenant/codigo-empleado.ts). `codigoHash` nunca sale del servidor —
// deliberadamente no está en este tipo compartido.
export interface Empleado {
  uid:            string;
  nombre:         string;
  rol:            RolMembership;
  horario?:       string;
  notas?:         string;
  codigoUltimos4: string;
  activo:         boolean;
  creadoEn:       string;
  creadoPorUid:   string;
  ultimoAcceso?:  string;
}
