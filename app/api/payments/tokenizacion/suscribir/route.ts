import { NextRequest, NextResponse } from "next/server";
import { requireTenantActivo } from "@/lib/tenant/auth";
import { activarCobroRecurrente } from "@/lib/payments/suscripcion";
import type { TarjetaPagadito } from "@/lib/payments/pagadito-tokenizacion";

interface Body {
  tenantId: string;
  planId: string;
  card: TarjetaPagadito;
  deviceFingerprintID: string;
}

// Activa el cobro recurrente mensual del plan de un tenant ya certificado:
// tokeniza la tarjeta y crea la suscripción en el mismo request. Solo
// owner/admin (no vendedor) pueden tocar la facturación del negocio.
//
// El número de tarjeta/CVV llegan en el body de este POST y se reenvían tal
// cual a Pagadito — NUNCA se loggean ni se persisten aquí (ver comentario de
// alcance PCI en pagadito-tokenizacion.ts).
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as Body | null;
  if (!body?.tenantId || !body.planId || !body.card || !body.deviceFingerprintID) {
    return NextResponse.json({ error: "Faltan datos requeridos." }, { status: 400 });
  }

  const verif = await requireTenantActivo(body.tenantId, ["owner", "admin"]);
  if (!verif.ok) return verif.response;

  const customerIp =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "0.0.0.0";

  try {
    const suscripcion = await activarCobroRecurrente({
      tenantId: body.tenantId,
      planId: body.planId,
      card: body.card,
      browserInfo: { deviceFingerprintID: body.deviceFingerprintID, customerIp },
    });
    // Nunca devolver payment_token/subscription_code al cliente — solo lo
    // que necesita para mostrar confirmación.
    return NextResponse.json({
      ok: true,
      estado: suscripcion.estado, ultimos4: suscripcion.ultimos4, facturasMes: suscripcion.facturasMes,
    });
  } catch (e) {
    const mensaje = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: `No se pudo activar el cobro recurrente: ${mensaje}` }, { status: 502 });
  }
}
