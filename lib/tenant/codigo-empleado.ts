import "server-only";
import { randomBytes, createHash } from "crypto";

// Alfabeto sin caracteres ambiguos (0/O, 1/I/L) — el código se lee/dicta en
// voz alta al entregárselo a un empleado, así que evitamos confusiones.
const ALFABETO = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

function grupo(n: number): string {
  const bytes = randomBytes(n);
  let s = "";
  for (let i = 0; i < n; i++) s += ALFABETO[bytes[i] % ALFABETO.length];
  return s;
}

// Código tipo licencia: 12 caracteres significativos en 3 grupos de 4
// (32^12 ≈ 1.2×10^18 combinaciones). El endpoint de login por código es
// público (el empleado no tiene sesión previa), así que la seguridad
// descansa en la entropía del código en sí, no en un rate-limit — igual que
// una clave de producto, no como una contraseña corta pensada para
// recordarse.
export function generarCodigoEmpleado(): string {
  return `${grupo(4)}-${grupo(4)}-${grupo(4)}`;
}

export function hashCodigo(codigo: string): string {
  return createHash("sha256").update(codigo.trim().toUpperCase()).digest("hex");
}

// Token opaco de la URL de login de empleados (/empleado/{token}) — capa
// extra sobre el código en sí: sin esto, la ruta sería adivinable en
// cualquier subdominio (todas usarían literalmente "/empleado"), lo que
// facilita escaneo automatizado probando códigos contra cada empresa. Con el
// token, hay que conocer la URL exacta de ESA empresa primero. No reemplaza
// la entropía del código (que sigue siendo la defensa real contra fuerza
// bruta) — es una capa adicional, no la única.
export function generarTokenLinkEmpleado(): string {
  return grupo(10).toLowerCase();
}
