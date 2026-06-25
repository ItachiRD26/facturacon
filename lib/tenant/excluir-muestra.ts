// Compartido por los hooks de datos — una vez el tenant queda "activo", sus
// colecciones pueden tener tanto documentos sellados esMuestra:true (todo lo
// creado durante el entorno de prueba, ver lib/tenant/sellar-sandbox.ts) como
// documentos reales nuevos (sin el campo). Filtra los de prueba para que no
// se mezclen con la actividad real del negocio en su subdominio.
export function excluirMuestra<T extends { esMuestra?: boolean }>(items: T[]): T[] {
  return items.filter((item) => !item.esMuestra);
}
