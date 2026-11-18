// Cobro propio del plan: Facturacon decide cada cobro y lo hace con el token de la tarjeta guardada
// (en vez de dejar que Pagadito cobre un monto fijo por su cuenta). Así un solo cobro lleva
// el plan + los adicionales de los meses ya cerrados, el día del aniversario de la suscripción.
//
//  - activarCobroRecurrente: tokeniza la tarjeta y hace el primer cobro (plan + adicionales pendientes, si los hay).
//  - cobrarCiclo: lo llama el cron diario; cobra lo que vence y aplica la política de fallas
//    (reintento a los 2 y 5 días, aviso por correo con fecha límite y, al final, suspensión).
//  - cancelarCobroRecurrente: cobra los adicionales acumulados y deja de cobrar.
// Las reglas de fechas y montos viven en ciclo-cobro.ts (módulo puro, probado aparte).
import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb, adminAuth } from "@/lib/firebase-admin";
import { enviarPlantilla } from "@/lib/email/enviar";
import { URL_SITIO } from "@/lib/email/plantilla";
import { registrarAuditoria } from "@/lib/auditoria/registrar";
import { obtenerSuscripcion, refSuscripcion, cancelarSuscripcionEnPagadito } from "./suscripcion";
import { adicionalesDeMeses } from "./adicionales";
import { tokenizarYCobrar, cobrarConToken } from "./pagadito-tokenizacion";
import type { TarjetaPagadito, BrowserInfoPagadito, DetalleTransaccion } from "./pagadito-tokenizacion";
import { buscarPlan, type Plan, type PeriodoPlan } from "./planes";
import {
  hoyRD, mesDe, mesAnteriorDe, mesesPorCobrar, montoCiclo, fechaCiclo, calendarioIntentos, fechaLimitePago, fechaDMA,
  INTENTOS_POR_CICLO, RD_POR_USD, type MontoCiclo,
} from "./ciclo-cobro";
import type { Suscripcion, CicloCobro } from "@/types/pagos";

const URL_FACTURACION = `${URL_SITIO}/panel`;
const MINUTOS_BLOQUEO = 10;   // evita cobrar dos veces el mismo ciclo si el cron corre solapado

const etiquetaPlan = (p: Plan) => p.nombre ?? `${p.facturas.toLocaleString("es-DO")} comprobantes`;
const motivoCorto = (e: unknown) => (e instanceof Error ? e.message : String(e)).replace(/\s+/g, " ").slice(0, 300);
// Lo que se le dice al cliente: sin códigos internos de la pasarela.
const MOTIVO_CLIENTE = "el banco o la pasarela no aprobó el cobro";

const ciclosDe = (tenantId: string) => adminDb.collection("tenants").doc(tenantId).collection("facturacion").doc("cargos").collection("ciclos");

function lineasCobro(plan: Plan, periodo: PeriodoPlan, monto: MontoCiclo, cuantosMeses: number): DetalleTransaccion[] {
  const l: DetalleTransaccion[] = [{ quantity: "1", description: `Facturacon plan ${etiquetaPlan(plan)}${periodo === "anual" ? " (pago anual)" : ""}`.slice(0, 100), amount: monto.planUSD }];
  if (Number(monto.adicionalesUSD) > 0) l.push({ quantity: "1", description: `Adicionales de ${cuantosMeses} ${cuantosMeses === 1 ? "mes" : "meses"} (comprobantes y usuarios)`.slice(0, 100), amount: monto.adicionalesUSD });
  return l;
}

export async function datosDestinatario(tenantId: string): Promise<{ email: string; nombre: string; negocio: string } | null> {
  try {
    const t = (await adminDb.collection("tenants").doc(tenantId).get()).data() as { creadoPorUid?: string; nombreNegocio?: string } | undefined;
    if (!t?.creadoPorUid) return null;
    const u = await adminAuth.getUser(t.creadoPorUid);
    if (!u.email) return null;
    return { email: u.email, nombre: (u.displayName ?? "").split(" ")[0] ?? "", negocio: t.nombreNegocio ?? "tu negocio" };
  } catch (e) {
    console.error(`[cobros][${tenantId}] no se pudo obtener el correo del dueño:`, motivoCorto(e));
    return null;
  }
}

async function reactivarSiSuspendido(tenantId: string) {
  const ref = adminDb.collection("tenants").doc(tenantId);
  await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists && snap.data()?.estado === "suspendido") tx.set(ref, { estado: "activo" }, { merge: true });
  });
}

// ─────────────────────────────── Activación (primer cobro) ───────────────────────────────

export async function activarCobroRecurrente(params: {
  tenantId: string; planId: string; periodo?: PeriodoPlan;
  card: TarjetaPagadito; browserInfo: BrowserInfoPagadito;
}): Promise<Suscripcion> {
  const periodo: PeriodoPlan = params.periodo === "anual" ? "anual" : "mensual";
  const plan = buscarPlan(params.planId);
  if (!plan) throw new Error("Plan inválido.");

  const actual = await obtenerSuscripcion(params.tenantId);
  if (actual?.estado === "activa") throw new Error("Este tenant ya tiene una suscripción activa. Cancélala antes de crear una nueva.");
  // Una suscripción anterior que Pagadito aún cobra por su cuenta (modelo viejo) hay que cancelarla para no cobrar doble.
  if (actual?.subscriptionCode && !actual.cobroPropio) {
    await cancelarSuscripcionEnPagadito(actual.subscriptionCode).catch((e) => console.warn(`[cobros][${params.tenantId}] no se pudo cancelar la suscripción vieja:`, motivoCorto(e)));
  }

  const hoy = hoyRD();
  const limite = mesAnteriorDe(mesDe(hoy));
  // Adicionales que quedaron sin cobrar de una suscripción anterior (p. ej. se suspendió) se cobran ahora.
  const meses = actual?.adicionalesFacturadosHasta ? mesesPorCobrar(actual.adicionalesFacturadosHasta, limite) : [];
  const adic = await adicionalesDeMeses(params.tenantId, plan, meses);
  const monto = montoCiclo(plan, periodo, adic.totalRD);
  const ern = `sub-${params.tenantId}-${Date.now().toString(36)}`;

  const res = await tokenizarYCobrar({
    card: params.card, browserInfo: params.browserInfo,
    transaction: { merchantTransactionId: ern, currencyId: "USD", transactionDetails: lineasCobro(plan, periodo, monto, meses.length) },
  });

  const ahora = new Date().toISOString();
  const suscripcion: Suscripcion = {
    paymentToken: res.payment_token,
    planId: plan.id, facturasMes: plan.facturas, montoUSD: montoCiclo(plan, periodo, 0).planUSD, periodo,
    estado: "activa",
    cardHolderName: params.card.cardHolderName, ultimos4: params.card.number.slice(-4),
    ern, ultimoErn: ern, autorizacion: res.authorization,
    montoUltimoCobroRD: monto.totalRD, montoUltimoCobroUSD: monto.totalUSD,
    creadoEn: ahora, ultimoPagoEn: ahora,
    browserInfo: params.browserInfo,
    cobroPropio: true, anclaCobro: hoy, cicloActual: 1, proximoCobroEn: fechaCiclo(hoy, periodo, 1),
    intentosFallidos: 0, adicionalesFacturadosHasta: limite,
  };
  await refSuscripcion(params.tenantId).set(suscripcion);
  await ciclosDe(params.tenantId).doc(`${hoy}-1`).set(registroCiclo({ fecha: hoy, intento: 1, estado: "cobrado", monto, meses, ern, autorizacion: res.authorization, motivo: "ciclo" }));
  await reactivarSiSuspendido(params.tenantId);   // pagar de nuevo levanta la suspensión de inmediato
  return suscripcion;
}

function registroCiclo(p: { fecha: string; intento: number; estado: "cobrado" | "fallido"; monto: MontoCiclo; meses: string[]; ern: string; autorizacion?: string; error?: string; motivo: "ciclo" | "cancelacion" }): CicloCobro {
  const r: CicloCobro = { fecha: p.fecha, intento: p.intento, estado: p.estado, planRD: p.monto.planRD, adicionalesRD: p.monto.adicionalesRD, totalRD: p.monto.totalRD, totalUSD: p.monto.totalUSD, meses: p.meses, ern: p.ern, motivo: p.motivo, creadoEn: new Date().toISOString() };
  if (p.autorizacion) r.autorizacion = p.autorizacion;
  if (p.error) r.error = p.error;
  return r;
}

// ─────────────────────────────── Cobro de cada ciclo ───────────────────────────────

export type ResultadoCobro = "no_toca" | "cobrado" | "reintento" | "suspendido";

/** Cobra el ciclo de un tenant si ya venció (o si toca un reintento). `hoy` solo se cambia en pruebas. */
export async function cobrarCiclo(tenantId: string, hoy = hoyRD()): Promise<ResultadoCobro> {
  const ref = refSuscripcion(tenantId);

  // Reserva el ciclo para que dos ejecuciones simultáneas del cron no cobren dos veces.
  const sus = await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const s = snap.data() as (Suscripcion & { cobrandoDesde?: string }) | undefined;
    if (!s || !s.cobroPropio || s.interno || s.estado === "cancelada" || !s.proximoCobroEn || !s.anclaCobro) return null;
    if ((s.intentosFallidos ?? 0) >= INTENTOS_POR_CICLO) return null;   // ya se agotaron los reintentos: espera a que actualice su pago
    if (hoy < (s.proximoIntentoEn ?? s.proximoCobroEn)) return null;
    if (s.cobrandoDesde && Date.now() - Date.parse(s.cobrandoDesde) < MINUTOS_BLOQUEO * 60_000) return null;
    tx.set(ref, { cobrandoDesde: new Date().toISOString() }, { merge: true });
    return s;
  });
  if (!sus) return "no_toca";

  try {
    return await ejecutarCobro(tenantId, sus, hoy);
  } finally {
    await ref.set({ cobrandoDesde: FieldValue.delete() }, { merge: true }).catch(() => {});
  }
}

async function ejecutarCobro(tenantId: string, sus: Suscripcion, hoy: string): Promise<ResultadoCobro> {
  const ref = refSuscripcion(tenantId);
  const plan = buscarPlan(sus.planId);
  const periodo: PeriodoPlan = sus.periodo === "anual" ? "anual" : "mensual";
  const venc = sus.proximoCobroEn!;
  const intento = (sus.intentosFallidos ?? 0) + 1;
  if (!plan) { console.error(`[cobros][${tenantId}] plan desconocido "${sus.planId}"`); return "no_toca"; }

  // Adicionales de los meses ya cerrados antes del vencimiento (siempre el mismo conjunto en los reintentos).
  const limite = mesAnteriorDe(mesDe(venc));
  const meses = mesesPorCobrar(sus.adicionalesFacturadosHasta, limite);
  const adic = await adicionalesDeMeses(tenantId, plan, meses);
  const monto = montoCiclo(plan, periodo, adic.totalRD);
  const ern = `cob-${tenantId}-${venc}-${intento}`;

  try {
    if (!sus.browserInfo) throw new Error("Falta la información del dispositivo de la tarjeta.");
    const res = await cobrarConToken({
      payment_token: sus.paymentToken, browserInfo: sus.browserInfo,
      transaction: { merchantTransactionId: ern, currencyId: "USD", transactionDetails: lineasCobro(plan, periodo, monto, meses.length) },
    });

    // Ciclo k vence en fechaCiclo(ancla, k). Recién cobrado el ciclo `ciclo`, el siguiente es ciclo + 1.
    const ciclo = (sus.cicloActual ?? 1);
    const siguiente = fechaCiclo(sus.anclaCobro!, periodo, ciclo + 1);
    await ciclosDe(tenantId).doc(`${venc}-${intento}`).set(registroCiclo({ fecha: venc, intento, estado: "cobrado", monto, meses, ern, autorizacion: res.authorization, motivo: "ciclo" }));
    await ref.set({
      estado: "activa", ultimoPagoEn: new Date().toISOString(), actualizadoEn: new Date().toISOString(),
      cicloActual: ciclo + 1, proximoCobroEn: siguiente, proximoIntentoEn: FieldValue.delete(), intentosFallidos: 0,
      adicionalesFacturadosHasta: limite, ultimoErn: ern, ultimoError: FieldValue.delete(),
      montoUltimoCobroRD: monto.totalRD, montoUltimoCobroUSD: monto.totalUSD, autorizacion: res.authorization,
    }, { merge: true });
    await reactivarSiSuspendido(tenantId);

    await registrarAuditoria({ tenantId, uid: "sistema", accion: "cobro.ciclo", recurso: ern, detalle: { resultado: "cobrado", totalRD: monto.totalRD, intento } });
    const dest = await datosDestinatario(tenantId);
    if (dest) {
      void enviarPlantilla("pago_recibido", { nombre: dest.nombre, plan: etiquetaPlan(plan), monto: monto.totalRD, fecha: fechaDMA(hoy), referencia: res.authorization, proximoCobro: fechaDMA(siguiente) }, { para: dest.email });
    }
    return "cobrado";
  } catch (e) {
    const detalle = motivoCorto(e);
    // PG3018 = ese ERN ya se usó: un intento anterior llegó a Pagadito pero no alcanzamos a guardarlo.
    // No se cuenta como falla (evita suspender a quien sí pagó); se revisa a mano.
    if (/PG3018/.test(detalle)) { console.error(`[cobros][${tenantId}] ERN repetido (${ern}): revisar en Pagadito si el cobro entró.`); return "no_toca"; }

    await ciclosDe(tenantId).doc(`${venc}-${intento}`).set(registroCiclo({ fecha: venc, intento, estado: "fallido", monto, meses, ern, error: detalle, motivo: "ciclo" }));
    await registrarAuditoria({ tenantId, uid: "sistema", accion: "cobro.ciclo", recurso: ern, resultado: "error", detalle: { resultado: intento >= INTENTOS_POR_CICLO ? "suspendido" : "reintento", totalRD: monto.totalRD, intento } });
    const fechas = calendarioIntentos(venc);
    const limitePago = fechaDMA(fechaLimitePago(venc));
    const dest = await datosDestinatario(tenantId);

    if (intento < INTENTOS_POR_CICLO) {
      const proximo = fechas[intento];   // intento 1 → +2 días; intento 2 → +5 días
      // Gracia: durante los reintentos la cuenta sigue ACTIVA (el cliente no deja de facturar). Solo si falla también el
      // último intento pasa a pago_fallido y se suspende (abajo). El aviso al cliente sale del panel y del correo.
      await ref.set({ intentosFallidos: intento, proximoIntentoEn: proximo, ultimoErn: ern, ultimoError: detalle, actualizadoEn: new Date().toISOString() }, { merge: true });
      if (dest) void enviarPlantilla("pago_fallido", { nombre: dest.nombre, plan: etiquetaPlan(plan), monto: monto.totalRD, motivo: MOTIVO_CLIENTE, fechaLimite: limitePago, proximoIntento: fechaDMA(proximo), urlFacturacion: URL_FACTURACION }, { para: dest.email });
      if (intento === 1) void enviarPlantilla("interno_pago_fallido", { negocio: dest?.negocio ?? tenantId, plan: etiquetaPlan(plan), monto: monto.totalRD, motivo: detalle });
      return "reintento";
    }

    // Falló también el último intento: se suspende hasta que actualice su pago.
    await Promise.all([
      ref.set({ estado: "pago_fallido", intentosFallidos: intento, proximoIntentoEn: FieldValue.delete(), ultimoErn: ern, ultimoError: detalle, actualizadoEn: new Date().toISOString() }, { merge: true }),
      adminDb.collection("tenants").doc(tenantId).set({ estado: "suspendido" }, { merge: true }),
    ]);
    if (dest) void enviarPlantilla("cuenta_suspendida", { nombre: dest.nombre, negocio: dest.negocio, motivo: `no se pudo cobrar tu plan (${etiquetaPlan(plan)}) tras varios intentos`, urlFacturacion: URL_FACTURACION }, { para: dest.email });
    return "suspendido";
  }
}

// ─────────────────────────────── Cancelación ───────────────────────────────

/** Cancela el cobro. Los adicionales acumulados hasta hoy se cobran con la tarjeta guardada (si llegan a US$ 1, el mínimo de Pagadito). */
export async function cancelarCobroRecurrente(tenantId: string): Promise<{ adicionalesCobradosRD: number; adicionalesPendientesRD: number }> {
  const sus = await obtenerSuscripcion(tenantId);
  if (!sus || sus.estado === "cancelada") throw new Error("Este tenant no tiene una suscripción activa.");
  const plan = buscarPlan(sus.planId);
  const hoy = hoyRD();
  const mesHoy = mesDe(hoy);

  let cobradosRD = 0, pendientesRD = 0;
  let facturadoHasta = sus.adicionalesFacturadosHasta;

  if (sus.cobroPropio && plan && sus.browserInfo && sus.adicionalesFacturadosHasta) {
    const meses = mesesPorCobrar(sus.adicionalesFacturadosHasta, mesHoy);
    const adic = await adicionalesDeMeses(tenantId, plan, meses);
    const usd = adic.totalRD / RD_POR_USD;
    if (adic.totalRD > 0 && usd >= 1) {
      const monto = montoCiclo({ ...plan, montoRD: 0, montoUSD: "0.00" }, "mensual", adic.totalRD);
      const ern = `can-${tenantId}-${Date.now().toString(36)}`;
      try {
        const res = await cobrarConToken({
          payment_token: sus.paymentToken, browserInfo: sus.browserInfo,
          transaction: { merchantTransactionId: ern, currencyId: "USD", transactionDetails: [{ quantity: "1", description: `Adicionales hasta la cancelación (${meses.length} ${meses.length === 1 ? "mes" : "meses"})`.slice(0, 100), amount: monto.adicionalesUSD }] },
        });
        await ciclosDe(tenantId).doc(`${hoy}-cancelacion`).set(registroCiclo({ fecha: hoy, intento: 1, estado: "cobrado", monto, meses, ern, autorizacion: res.authorization, motivo: "cancelacion" }));
        cobradosRD = adic.totalRD; facturadoHasta = mesHoy;
      } catch (e) {
        pendientesRD = adic.totalRD;
        await ciclosDe(tenantId).doc(`${hoy}-cancelacion`).set(registroCiclo({ fecha: hoy, intento: 1, estado: "fallido", monto, meses, ern, error: motivoCorto(e), motivo: "cancelacion" }));
        const dest = await datosDestinatario(tenantId);
        void enviarPlantilla("interno_pago_fallido", { negocio: dest?.negocio ?? tenantId, plan: `Adicionales al cancelar (${etiquetaPlan(plan)})`, monto: adic.totalRD, motivo: motivoCorto(e) });
      }
    } else {
      pendientesRD = adic.totalRD;   // menos de US$ 1: no se puede cobrar suelto, se absorbe
    }
  }

  if (sus.subscriptionCode && !sus.cobroPropio) await cancelarSuscripcionEnPagadito(sus.subscriptionCode);
  await refSuscripcion(tenantId).set({
    estado: "cancelada", actualizadoEn: new Date().toISOString(),
    proximoCobroEn: FieldValue.delete(), proximoIntentoEn: FieldValue.delete(), intentosFallidos: 0,
    ...(facturadoHasta ? { adicionalesFacturadosHasta: facturadoHasta } : {}),
  }, { merge: true });
  return { adicionalesCobradosRD: cobradosRD, adicionalesPendientesRD: pendientesRD };
}
