import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requireTenantEnCertificacion } from "@/lib/certificacion/auth";

export async function GET(req: NextRequest) {
  const tenantId = req.nextUrl.searchParams.get("t") ?? "";
  const verif = await requireTenantEnCertificacion(tenantId);
  if (!verif.ok) return verif.response;

  const snap = await adminDb.collection("tenants").doc(tenantId).collection("certificacion").doc("pago").get();
  const data = snap.data();
  return NextResponse.json({ estado: data?.estado ?? "pendiente", orderId: data?.orderId ?? null });
}
