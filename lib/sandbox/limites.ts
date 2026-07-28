// Topes del entorno de prueba — el objetivo no es limitar el uso normal de
// alguien probando el sistema (nadie necesita 200 clientes de prueba para
// evaluar cómo se ve Facturacon), sino evitar que un script automatizado
// infle la base de datos de un tenant en estado "demo" sin límite.
// Una vez el tenant queda "activo" (certificado de verdad), estos topes ya
// no aplican.
export const LIMITES_SANDBOX = {
  clientes: 40,
  productos: 60,
  facturas_recibidas: 30,
  secuencias: 100, // comparte el tope entre todos los tipos de e-NCF + cotizaciones
} as const;

export type ColeccionLimitada = keyof Omit<typeof LIMITES_SANDBOX, "secuencias">;

export function mensajeLimite(coleccion: string, tope: number): string {
  return `Llegaste al máximo de ${tope} registros de prueba para "${coleccion}". Esto es para evitar abuso del entorno de prueba — si necesitas más espacio para evaluar el sistema, escríbenos a contacto@facturacon.com.do.`;
}
