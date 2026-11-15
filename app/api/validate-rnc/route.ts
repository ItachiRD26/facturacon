import { NextResponse } from "next/server";
import { consultarRncODGII, type ResultadoConsultaDGII } from "@/lib/dgii/validar-rnc-cedula";
import { getSessionUid } from "@/lib/auth/session";
import { limitar } from "@/lib/seguridad/limite-tasa";

// Cada consulta sale dos veces hacia el portal de la DGII, así que esta ruta es
// un amplificador: sin control, cualquiera podía usarnos para martillar a la
// DGII (y que bloqueen nuestra IP, rompiendo el onboarding de todos). Ahora
// exige sesión, limita por usuario y recuerda el resultado unos minutos.
const CACHE_MS = 10 * 60 * 1000;
// El portal de la DGII puede tardar: dos consultas, cada una con un reintento,
// de hasta 15 s por intento.
export const maxDuration = 60;
const cache = new Map<string, { hasta: number; datos: ResultadoConsultaDGII }>();

export async function GET(req: Request) {
  const uid = await getSessionUid();
  if (!uid) return NextResponse.json({ valid: false, error: "Sesión requerida" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const number = (searchParams.get("number") ?? "").replace(/\D/g, "");
  if (!number) return NextResponse.json({ valid: false, error: "RNC no proporcionado" });
  // RNC = 9 dígitos, cédula = 11. Cualquier otra cosa ni se consulta.
  if (number.length !== 9 && number.length !== 11) {
    return NextResponse.json({ valid: false, error: "Un RNC tiene 9 dígitos y una cédula 11." });
  }

  const enCache = cache.get(number);
  if (enCache && enCache.hasta > Date.now()) return NextResponse.json(enCache.datos);

  const lim = await limitar(req, { nombre: "validate-rnc", id: uid, max: 20, ventanaSeg: 60, compartido: true });
  if (lim) return lim;

  const resultado = await consultarRncODGII(number);
  // Los fallos de red no se guardan: el reintento debe poder funcionar.
  if (!resultado.error) {
    if (cache.size > 500) cache.clear();
    cache.set(number, { hasta: Date.now() + CACHE_MS, datos: resultado });
  }
  return NextResponse.json(resultado);
}
