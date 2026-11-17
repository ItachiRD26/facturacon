// Ayudas puras para el formulario de la tarjeta: detectar la marca, dar formato mientras se escribe, validar
// (algoritmo de Luhn y vencimiento) y arreglar el teléfono para Pagadito. Sin dependencias; se prueba aparte.

export type MarcaTarjeta = "visa" | "mastercard" | "amex" | "discover" | "desconocida";

export const soloDigitos = (s: string) => s.replace(/\D/g, "");

export function detectarMarca(numero: string): MarcaTarjeta {
  const n = soloDigitos(numero);
  if (/^4/.test(n)) return "visa";
  if (/^(5[1-5]|222[1-9]|22[3-9]\d|2[3-6]\d\d|27[01]\d|2720)/.test(n)) return "mastercard";
  if (/^3[47]/.test(n)) return "amex";
  if (/^(6011|65|64[4-9])/.test(n)) return "discover";
  return "desconocida";
}

export const NOMBRE_MARCA: Record<MarcaTarjeta, string> = { visa: "Visa", mastercard: "Mastercard", amex: "American Express", discover: "Discover", desconocida: "" };

/** Pagadito solo procesa Visa y Mastercard (crédito o débito). */
export const MARCAS_ACEPTADAS: MarcaTarjeta[] = ["visa", "mastercard"];
export const TEXTO_MARCAS_ACEPTADAS = "Pagadito solo acepta tarjetas Visa y Mastercard";
export const marcaAceptada = (numero: string) => MARCAS_ACEPTADAS.includes(detectarMarca(numero));
/** Ya se escribieron los dígitos suficientes para saber que NO es Visa ni Mastercard. */
export function marcaRechazada(numero: string): boolean {
  const n = soloDigitos(numero);
  return n.length >= 4 && !marcaAceptada(n);
}

/** Dígitos que tiene el número completo de esa marca. */
export const longitudNumero = (marca: MarcaTarjeta) => (marca === "amex" ? 15 : 16);
/** Dígitos del código de seguridad (American Express usa 4). */
export const longitudCvv = (marca: MarcaTarjeta) => (marca === "amex" ? 4 : 3);

/** "4111111111111111" → "4111 1111 1111 1111" (American Express: 4-6-5). */
export function formatearNumero(numero: string): string {
  const n = soloDigitos(numero);
  const marca = detectarMarca(n);
  const d = n.slice(0, longitudNumero(marca));
  if (marca === "amex") return [d.slice(0, 4), d.slice(4, 10), d.slice(10, 15)].filter(Boolean).join(" ");
  return (d.match(/.{1,4}/g) ?? []).join(" ");
}

/** Algoritmo de Luhn: descarta números mal escritos antes de molestar a la pasarela. */
export function luhnValido(numero: string): boolean {
  const n = soloDigitos(numero);
  if (n.length < 13) return false;
  let suma = 0;
  for (let i = 0; i < n.length; i++) {
    let d = Number(n[n.length - 1 - i]);
    if (i % 2 === 1) { d *= 2; if (d > 9) d -= 9; }
    suma += d;
  }
  return suma % 10 === 0;
}

/** El número es de una marca aceptada, está completo y pasa Luhn. */
export function numeroValido(numero: string): boolean {
  const n = soloDigitos(numero);
  return marcaAceptada(n) && n.length === longitudNumero(detectarMarca(n)) && luhnValido(n);
}

/** Mientras se escribe: "1" → "1", "3" → "03/", "1226" → "12/26". El mes se completa solo si no puede ser de dos dígitos. */
export function formatearVencimiento(texto: string, borrando = false): string {
  let d = soloDigitos(texto).slice(0, 4);
  if (d.length === 1 && Number(d) > 1) d = "0" + d;                       // 3 → 03
  if (d.length >= 2 && Number(d.slice(0, 2)) > 12) d = "0" + d[0] + d[1];   // 19 → 01/9…
  if (d.length > 4) d = d.slice(0, 4);
  if (d.length >= 2) return borrando && d.length === 2 ? d : `${d.slice(0, 2)}/${d.slice(2)}`;
  return d;
}

/** "12/26" → { mes: "12", anio: "2026" }; null si no es una fecha válida y vigente. */
export function parseVencimiento(texto: string, ahora = new Date()): { mes: string; anio: string } | null {
  const d = soloDigitos(texto);
  if (d.length !== 4) return null;
  const mes = Number(d.slice(0, 2)), anio = 2000 + Number(d.slice(2));
  if (mes < 1 || mes > 12) return null;
  const finDeMes = new Date(anio, mes, 0, 23, 59, 59);   // la tarjeta vale hasta el último día de ese mes
  if (finDeMes < ahora) return null;
  if (anio > ahora.getFullYear() + 20) return null;
  return { mes: String(mes).padStart(2, "0"), anio: String(anio) };
}

/** Teléfono dominicano mientras se escribe: "8095555555" → "809 555 5555". Acepta que peguen +1 o 1 al inicio. */
export function formatearTelefono(texto: string): string {
  let d = soloDigitos(texto);
  if (d.length > 10 && d.startsWith("1")) d = d.slice(1);
  d = d.slice(0, 10);
  return [d.slice(0, 3), d.slice(3, 6), d.slice(6, 10)].filter(Boolean).join(" ");
}
export const telefonoValido = (texto: string) => soloDigitos(texto).length === 10;
/** Como lo espera Pagadito: "+1 809 555 5555". */
export const telefonoParaPagadito = (texto: string) => `+1 ${formatearTelefono(texto)}`;

/** "juan carlos pérez" → { nombre: "juan", apellido: "carlos pérez" }. Solo para precargar; se puede corregir. */
export function separarNombre(completo: string): { nombre: string; apellido: string } {
  const partes = completo.trim().split(/\s+/).filter(Boolean);
  const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  if (partes.length === 0) return { nombre: "", apellido: "" };
  return { nombre: capital(partes[0]), apellido: partes.slice(1).map(capital).join(" ") };
}

export const PROVINCIAS_RD = [
  "Distrito Nacional", "Santo Domingo", "Santiago", "La Altagracia", "La Romana", "San Pedro de Macorís", "San Cristóbal", "Puerto Plata",
  "La Vega", "Duarte", "Espaillat", "Peravia", "Azua", "Bahoruco", "Barahona", "Dajabón", "El Seibo", "Elías Piña", "Hato Mayor",
  "Hermanas Mirabal", "Independencia", "Monseñor Nouel", "Monte Cristi", "Monte Plata", "Pedernales", "Samaná", "San José de Ocoa",
  "San Juan", "Sánchez Ramírez", "Santiago Rodríguez", "Valverde", "María Trinidad Sánchez",
];
