// Jornada del cliente, de la creación de la cuenta a la primera factura real.
// Una sola fuente de verdad para "en qué paso estoy y qué sigue": la usan la
// barra de progreso (components/panel/jornada-progreso.tsx), el resumen de
// cuenta y las pantallas de onboarding, para que nunca se contradigan.
//
// Modelo de cobro acordado: la certificación es GRATIS; la mensualidad se
// paga DESPUÉS de certificarse, para poder emitir comprobantes reales. Por
// eso el plan es la etapa 4 — visible desde el primer día como pendiente.
import type { EstadoTenant } from "@/types/tenant";
import type { EstadoSuscripcion } from "@/types/pagos";

export type EtapaId = "empresa" | "preparacion" | "certificacion" | "plan" | "facturar";

export interface Etapa {
  id: EtapaId;
  titulo: string;
  detalle: string;
}

export const ETAPAS: Etapa[] = [
  { id: "empresa",       titulo: "Tu empresa",        detalle: "Cuenta y datos del negocio" },
  { id: "preparacion",   titulo: "Preparación",       detalle: "Probar el sistema y reunir tus requisitos" },
  { id: "certificacion", titulo: "Certificación",     detalle: "Autorización de la DGII (gratis)" },
  { id: "plan",          titulo: "Tu plan",           detalle: "Elige el plan y agrega tu tarjeta" },
  { id: "facturar",      titulo: "A facturar",        detalle: "Emite comprobantes reales" },
];

export type EstadoEtapa = "hecha" | "actual" | "pendiente";

export interface AccionJornada {
  titulo: string;
  detalle: string;
  cta: string;
  href: string;
  // Acción secundaria opcional (ej. "Seguir probando" junto a "Preparar requisitos").
  secundaria?: { cta: string; href: string };
}

export interface Jornada {
  etapas: (Etapa & { estado: EstadoEtapa })[];
  actual: EtapaId;
  completa: boolean;
  // Hay un problema de cobro que bloquea la emisión (tarjeta rechazada).
  problemaDePago: boolean;
  accion: AccionJornada;
}

export function etapasConActual(actual: EtapaId, completa = false): (Etapa & { estado: EstadoEtapa })[] {
  const idx = ETAPAS.findIndex((e) => e.id === actual);
  return ETAPAS.map((e, i) => ({
    ...e,
    estado: completa || i < idx ? "hecha" : i === idx ? "actual" : "pendiente",
  }));
}

export function etapaActualPara(estado: EstadoTenant, suscripcion: EstadoSuscripcion | null): EtapaId {
  if (estado === "demo") return "preparacion";
  if (estado === "pendiente_certificacion" || estado === "certificando") return "certificacion";
  // activo o suspendido: certificado. Lo que sigue depende del cobro.
  return suscripcion === "activa" && estado === "activo" ? "facturar" : "plan";
}

export function calcularJornada(params: {
  tenantId: string;
  estado: EstadoTenant;
  suscripcion: EstadoSuscripcion | null;
  // URL del sistema real del cliente (su subdominio) — solo se usa al final.
  urlSistema?: string;
}): Jornada {
  const { tenantId, estado, suscripcion, urlSistema } = params;
  const actual = etapaActualPara(estado, suscripcion);
  const completa = actual === "facturar";
  const problemaDePago = suscripcion === "pago_fallido" || estado === "suspendido";
  const base = `/panel/${tenantId}`;

  let accion: AccionJornada;
  if (estado === "demo") {
    accion = {
      titulo: "Prepara tu firma digital y tu cédula",
      detalle: "Para certificarte ante la DGII necesitas tu certificado de firma digital (.p12) y la cédula del representante. Mientras tanto puedes seguir probando el sistema con datos de ejemplo.",
      cta: "Preparar requisitos",
      href: `/onboarding/requisitos?t=${tenantId}`,
      secundaria: { cta: "Seguir probando", href: `/onboarding/sandbox/dashboard?t=${tenantId}` },
    };
  } else if (estado === "pendiente_certificacion") {
    accion = {
      titulo: "Verificamos tus datos. Ahora, la certificación",
      detalle: "Un asistente te guía paso a paso por el proceso de la DGII. Puedes pausar y volver cuando quieras: tu avance se guarda solo.",
      cta: "Empezar la certificación",
      href: `${base}/certificacion`,
    };
  } else if (estado === "certificando") {
    accion = {
      titulo: "Tu certificación está en marcha",
      detalle: "Retoma el asistente donde lo dejaste.",
      cta: "Continuar certificación",
      href: `${base}/certificacion`,
    };
  } else if (problemaDePago) {
    accion = {
      titulo: "No pudimos cobrar tu plan",
      detalle: "Tu cuenta está pausada para emitir comprobantes hasta que actualices tu tarjeta. Tus datos están a salvo.",
      cta: "Arreglar mi pago",
      href: `${base}/plan?activar=1`,
    };
  } else if (!completa) {
    accion = {
      titulo: "¡Estás certificado! Activa tu plan para empezar a facturar",
      detalle: "La certificación fue gratis. Ahora elige cuántos comprobantes necesitas al mes y agrega tu tarjeta; tardas dos minutos.",
      cta: "Elegir mi plan",
      href: `${base}/plan?activar=1`,
    };
  } else {
    accion = {
      titulo: "Todo listo: ya puedes facturar",
      detalle: "Tu sistema de facturación electrónica está activo.",
      cta: "Abrir mi sistema",
      href: urlSistema ?? base,
    };
  }

  return { etapas: etapasConActual(actual, completa), actual, completa, problemaDePago, accion };
}
