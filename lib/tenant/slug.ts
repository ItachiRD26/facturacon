import "server-only";
import { customAlphabet } from "nanoid";
import { adminDb } from "@/lib/firebase-admin";

// Slug opaco (no usa RNC ni nombre del negocio) para el subdominio del
// tenant — alfabeto sin caracteres ambiguos (0/O, 1/l/I) porque el cliente
// lo va a leer/escribir como parte de su URL.
const generar = customAlphabet("23456789abcdefghjkmnpqrstuvwxyz", 8);

export async function generarSlugUnico(): Promise<string> {
  for (let intento = 0; intento < 5; intento++) {
    const candidato = generar();
    const existe = await adminDb.collection("tenants").where("slug", "==", candidato).limit(1).get();
    if (existe.empty) return candidato;
  }
  throw new Error("No se pudo generar un slug único, intenta de nuevo.");
}
