import { NextResponse } from "next/server";
import { consultarRncODGII } from "@/lib/dgii/validar-rnc-cedula";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const number = searchParams.get("number")?.trim() ?? "";
  if (!number) return NextResponse.json({ valid: false, error: "RNC no proporcionado" });

  const resultado = await consultarRncODGII(number);
  return NextResponse.json(resultado);
}
