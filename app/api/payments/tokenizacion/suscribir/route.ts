import { NextRequest, NextResponse } from "next/server";
import { requireAccesoFacturacion } from "@/lib/tenant/auth";
import { activarCobroRecurrente } from "@/lib/payments/cobros";
import { ErrorPagadito, type TarjetaPagadito } from "@/lib/payments/pagadito-tokenizacion";
import { marcaAceptada, TEXTO_MARCAS_ACEPTADAS } from "@/lib/payments/tarjeta";
import { registrarAuditoria } from "@/lib/auditoria/registrar";
import { limitar } from "@/lib/seguridad/limite-tasa";

interface Body {
  tenantId: string;
  planId: string;
  periodo?: "mensual" | "anual";
  card: TarjetaPagadito;
  deviceFingerprintID: string;
}

// Pagadito exige la IP PÚBLICA del navegador del cliente (acepta IPv4 e IPv6; rechaza ::1, 0.0.0.0 y las privadas).
// En producción llega en x-forwarded-for. Solo en Sandbox, si se prueba desde localhost, se usa una IP pública de ejemplo.
function esIpPublica(ip: string): boolean {
  if (!ip) return false;
  if (ip.includes(":")) return !/^(::1?|fe80:|fc|fd)/i.test(ip);                       // IPv6 pública (no loopback, link-local ni ULA)
  const p = ip.split(".").map(Number);
  if (p.length !== 4 || p.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  const [a, b] = p;
  return !(a === 0 || a === 10 || a === 127 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254) || a >= 224);
}
function ipPublicaDelCliente(req: NextRequest): string {
  const cruda = req.headers.get("x-vercel-forwarded-for") ?? req.headers.get("x-forwarded-for")?.split(",")[0] ?? req.headers.get("x-real-ip") ?? "";
  const ip = cruda.trim().replace(/^::ffff:/i, "");
  if (esIpPublica(ip)) return ip;
  return process.env.PAGADITO_ENV === "live" ? ip || "0.0.0.0" : "190.80.1.1";
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

  if (!marcaAceptada(String(body.card.number ?? ""))) {
    return NextResponse.json({ error: `${TEXTO_MARCAS_ACEPTADAS}. Usa otra tarjeta.` }, { status: 400 });
  }

  const verif = await requireAccesoFacturacion(body.tenantId);
  if (!verif.ok) return verif.response;

  // Tope de intentos (evita probar tarjetas robadas): por persona y por IP, compartido entre instancias.
  const lim = await limitar(req, { nombre: "suscribir-tarjeta", id: verif.uid, max: 8, ventanaSeg: 3600, compartido: true });
  if (lim) return lim;

  const customerIp = ipPublicaDelCliente(req);

  try {
    const suscripcion = await activarCobroRecurrente({
      tenantId: body.tenantId,
      planId: body.planId,
      periodo: body.periodo === "anual" ? "anual" : "mensual",
      card: body.card,
      browserInfo: { deviceFingerprintID: body.deviceFingerprintID, customerIp },
    });
    await registrarAuditoria({ tenantId: body.tenantId, uid: verif.uid, accion: "plan.activado", recurso: body.planId, req, detalle: { periodo: body.periodo === "anual" ? "anual" : "mensual", ultimos4: suscripcion.ultimos4 } });
    // Nunca devolver payment_token/subscription_code al cliente — solo lo
    // que necesita para mostrar confirmación.
    return NextResponse.json({
      ok: true,
      estado: suscripcion.estado, ultimos4: suscripcion.ultimos4, facturasMes: suscripcion.facturasMes, proximoCobroEn: suscripcion.proximoCobroEn,
      comprobante: {
        fecha: suscripcion.ultimoPagoEn, montoRD: suscripcion.montoUltimoCobroRD, montoUSD: suscripcion.montoUltimoCobroUSD,
        autorizacion: suscripcion.autorizacion, ern: suscripcion.ern,
      },
    });
  } catch (e) {
    if (e instanceof ErrorPagadito) {
      console.error("[suscribir]", e.message);   // el detalle técnico queda en los logs, no en pantalla
      return NextResponse.json({ error: e.mensajeUsuario, codigo: e.codigo }, { status: e.codigo.startsWith("PG402") ? 402 : 400 });
    }
    const mensaje = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: `No se pudo activar el cobro recurrente: ${mensaje}` }, { status: 502 });
  }
}
