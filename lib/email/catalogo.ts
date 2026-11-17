// Catálogo de TODOS los correos que Facturacon puede mandar. Módulo puro (sin servidor).
//
// Cada correo tiene:
//  - meta: qué es, cuándo se manda, a quién y de qué naturaleza.
//      transaccional → el usuario lo necesita sí o sí (factura, recibo, acceso). Siempre se manda.
//      aviso         → importante para su operación (pago fallido, certificado por vencer). Se manda siempre.
//      opcional      → comodidad o novedades (resúmenes, recordatorios, novedades). Lleva aviso de baja
//                      y solo se manda si el usuario no lo apagó.
//  - render(datos): arma el contenido con el diseño común (plantilla.ts).
//
// Remitente: los de destino "usuario" y "cliente_final" salen de noreply@ (con respuesta a contacto@);
// los "interno" salen de noreply@ hacia contacto@.
import { armarCorreo, rd, URL_SITIO, type ContenidoCorreo } from "./plantilla";

export type Categoria = "cuenta" | "certificacion" | "facturacion" | "cobros" | "resumenes" | "seguridad" | "novedades" | "interno";
export type Destino = "usuario" | "cliente_final" | "interno";
export type Naturaleza = "transaccional" | "aviso" | "opcional";

export interface MetaCorreo {
  categoria: Categoria;
  nombre: string;
  cuando: string;          // en qué momento se dispara
  destino: Destino;
  naturaleza: Naturaleza;
  adjuntos?: string;       // si lleva archivos
}

const PANEL = `${URL_SITIO}/panel`;
const fecha = (iso: string) => iso; // las fechas llegan ya formateadas (dd-mm-aaaa)

export interface DatosPorCorreo {
  // ── Cuenta ──
  bienvenida: { nombre: string; urlPanel?: string };
  invitacion_equipo: { nombre?: string; invitador: string; negocio: string; rol: string; urlAcceso: string };
  rol_cambiado: { nombre: string; negocio: string; rolNuevo: string };
  // ── Certificación ──
  cert_iniciada: { nombre: string; negocio: string; urlAsistente: string };
  cert_rechazo_dgii: { nombre: string; negocio: string; paso: string; motivo: string; urlAsistente: string };
  cert_inactiva: { nombre: string; negocio: string; dias: number; pasoActual: string; urlAsistente: string };
  cert_aprobada: { nombre: string; negocio: string; urlPanel?: string };
  certificado_por_vencer: { nombre: string; negocio: string; dias: number; fechaVence: string; urlPanel?: string };
  certificado_vencido: { nombre: string; negocio: string; fechaVencio: string; urlPanel?: string };
  // ── Facturación ──
  ecf_rechazado_dgii: { nombre: string; negocio: string; eNCF: string; motivo: string; urlFactura: string };
  contingencia_pendientes: { nombre: string; negocio: string; cantidad: number; horasMasAntigua: number; urlPanel?: string };
  secuencias_por_agotarse: { nombre: string; negocio: string; tipo: string; restantes: number; urlPanel?: string };
  stock_bajo: { nombre: string; negocio: string; productos: string[]; urlInventario?: string };
  // ── Cobros ──
  pago_recibido: { nombre: string; plan: string; monto: number; fecha: string; referencia: string; eNCF?: string; proximoCobro?: string };
  pago_fallido: { nombre: string; plan: string; monto: number; motivo?: string; urlFacturacion?: string };
  plan_por_vencer: { nombre: string; plan: string; dias: number; fecha: string; urlFacturacion?: string };
  cuenta_suspendida: { nombre: string; negocio: string; motivo: string; urlFacturacion?: string };
  limite_comprobantes: { nombre: string; negocio: string; usados: number; incluidos: number; extraRD: number; urlFacturacion?: string };
  cambio_plan: { nombre: string; planAnterior: string; planNuevo: string; desde: string };
  cuenta_cerrada: { nombre: string; negocio: string };
  // ── Resúmenes ──
  resumen_semanal: { nombre: string; negocio: string; desde: string; hasta: string; comprobantes: number; ventas: number; itbis: number; urlPanel?: string };
  resumen_mensual: { nombre: string; negocio: string; mes: string; comprobantes: number; ventas: number; itbis: number; rechazados: number; urlContabilidad?: string };
  recordatorio_declaraciones: { nombre: string; negocio: string; mes: string; urlContabilidad?: string };
  // ── Seguridad ──
  acceso_nuevo: { nombre: string; dispositivo: string; fecha: string; ubicacion?: string };
  miembro_agregado: { nombre: string; negocio: string; miembro: string; rol: string; quien: string };
  // ── Novedades ──
  novedades: { nombre: string; titulo: string; items: string[]; urlMas?: string };
  encuesta_opinion: { nombre: string; urlEncuesta: string };
  // ── Internos (llegan a contacto@) ──
  interno_contacto_web: { nombre: string; correo: string; telefono?: string; mensaje: string };
  interno_pago_fallido: { negocio: string; plan: string; monto: number; motivo?: string };
  interno_error_dgii: { negocio: string; contexto: string; detalle: string };
  interno_cert_aprobada: { negocio: string; rnc: string; dias?: number };
  interno_cert_rechazo: { negocio: string; paso: string; motivo: string };
}

export type IdCorreo = keyof DatosPorCorreo;

interface Def<K extends IdCorreo> { meta: MetaCorreo; render: (d: DatosPorCorreo[K]) => ContenidoCorreo }
type Catalogo = { [K in IdCorreo]: Def<K> };

const saludo = (n?: string) => (n ? `Hola, ${n}.` : "Hola.");

export const CATALOGO: Catalogo = {
  // ───────────────────────── CUENTA ─────────────────────────
  bienvenida: {
    meta: { categoria: "cuenta", nombre: "Bienvenida", cuando: "Al crear la cuenta", destino: "usuario", naturaleza: "transaccional" },
    render: (d) => ({
      asunto: "Bienvenido a Facturacon", preheader: "Tu certificación como emisor electrónico es gratis. Así empiezas.",
      titulo: `¡Bienvenido a Facturacon, ${d.nombre}!`,
      parrafos: [
        "Qué bueno tenerte aquí. Facturacon te acompaña a certificarte como emisor de facturación electrónica ante la DGII y te da el sistema para facturar.",
        "La certificación es gratis. Solo pagas la mensualidad cuando ya estés certificado y listo para facturar.",
        "Tu primer paso: entra a tu panel y completa los datos de tu negocio. El asistente te guía en cada paso.",
      ],
      boton: { texto: "Ir a mi panel", url: d.urlPanel ?? PANEL },
      notaFinal: "Si tienes dudas, responde este correo: lo lee una persona.",
    }),
  },
  invitacion_equipo: {
    meta: { categoria: "cuenta", nombre: "Invitación al equipo", cuando: "Cuando el dueño agrega a un empleado", destino: "usuario", naturaleza: "transaccional" },
    render: (d) => ({
      asunto: `${d.invitador} te invitó a ${d.negocio} en Facturacon`, preheader: `Tu rol: ${d.rol}.`,
      titulo: `Te invitaron a ${d.negocio}`,
      parrafos: [saludo(d.nombre), `${d.invitador} te agregó al equipo de ${d.negocio} en Facturacon con el rol de ${d.rol}.`, "Entra con el botón de abajo para empezar."],
      datos: [["Negocio", d.negocio], ["Tu rol", d.rol], ["Te invitó", d.invitador]],
      boton: { texto: "Entrar a Facturacon", url: d.urlAcceso },
      notaFinal: "Si no esperabas esta invitación, ignora este correo.",
    }),
  },
  rol_cambiado: {
    meta: { categoria: "cuenta", nombre: "Cambio de rol", cuando: "Cuando cambian el rol de un usuario", destino: "usuario", naturaleza: "transaccional" },
    render: (d) => ({
      asunto: `Tu rol en ${d.negocio} cambió`, titulo: "Cambió tu rol en el equipo",
      parrafos: [saludo(d.nombre), `Ahora tu rol en ${d.negocio} es: ${d.rolNuevo}. Los permisos de tu cuenta se ajustaron a ese rol.`],
      boton: { texto: "Abrir mi panel", url: PANEL },
    }),
  },

  // ───────────────────────── CERTIFICACIÓN ─────────────────────────
  cert_iniciada: {
    meta: { categoria: "certificacion", nombre: "Certificación iniciada", cuando: "Al empezar el asistente de certificación", destino: "usuario", naturaleza: "transaccional" },
    render: (d) => ({
      asunto: `Empezaste la certificación de ${d.negocio}`, preheader: "Tu avance se guarda solo. Puedes continuar cuando quieras.",
      titulo: "Empezaste tu certificación",
      parrafos: [saludo(d.nombre), `Iniciaste el proceso para certificar a ${d.negocio} como emisor electrónico ante la DGII.`, "Tu avance se guarda solo: puedes cerrar el asistente y volver cuando quieras, y retomas donde quedaste."],
      boton: { texto: "Continuar mi certificación", url: d.urlAsistente },
    }),
  },
  cert_rechazo_dgii: {
    meta: { categoria: "certificacion", nombre: "La DGII rechazó un paso", cuando: "Cuando la DGII rechaza algo del proceso", destino: "usuario", naturaleza: "aviso" },
    render: (d) => ({
      asunto: `La DGII pidió corregir: ${d.paso}`, titulo: "La DGII pidió una corrección",
      parrafos: [saludo(d.nombre), `En el paso «${d.paso}» de ${d.negocio}, la DGII indicó lo siguiente:`],
      alerta: { tipo: "error", texto: d.motivo },
      boton: { texto: "Corregirlo ahora", url: d.urlAsistente },
      notaFinal: "Es normal que la DGII pida ajustes. Responde este correo si necesitas ayuda para entender el mensaje.",
    }),
  },
  cert_inactiva: {
    meta: { categoria: "certificacion", nombre: "Certificación sin terminar", cuando: "A los 3 y 7 días sin avance", destino: "usuario", naturaleza: "opcional" },
    render: (d) => ({
      asunto: `Tu certificación de ${d.negocio} te está esperando`, titulo: "Te quedaste a medias",
      parrafos: [saludo(d.nombre), `Hace ${d.dias} días que no avanzas en la certificación de ${d.negocio}. Te quedaste en: ${d.pasoActual}.`, "Retomar toma un par de minutos: el asistente te abre justo donde lo dejaste."],
      boton: { texto: "Retomar donde quedé", url: d.urlAsistente },
    }),
  },
  cert_aprobada: {
    meta: { categoria: "certificacion", nombre: "¡Certificación aprobada!", cuando: "Al quedar el negocio activo como emisor", destino: "usuario", naturaleza: "transaccional" },
    render: (d) => ({
      asunto: `${d.negocio} ya es emisor electrónico`, preheader: "Ya puedes emitir comprobantes fiscales electrónicos.",
      titulo: "¡Felicidades, ya estás certificado!",
      parrafos: [saludo(d.nombre), `${d.negocio} quedó certificado como emisor de facturación electrónica ante la DGII. Ya puedes emitir comprobantes fiscales electrónicos desde Facturacon.`, "Tu primera factura te toma menos de un minuto."],
      alerta: { tipo: "exito", texto: "Certificación completada." },
      boton: { texto: "Emitir mi primera factura", url: d.urlPanel ?? PANEL },
    }),
  },
  certificado_por_vencer: {
    meta: { categoria: "certificacion", nombre: "Firma digital por vencer", cuando: "A los 60, 30, 15 y 7 días del vencimiento", destino: "usuario", naturaleza: "aviso" },
    render: (d) => ({
      asunto: `Tu firma digital vence en ${d.dias} días`, titulo: "Tu firma digital está por vencer",
      parrafos: [saludo(d.nombre), `El certificado de firma digital de ${d.negocio} vence el ${d.fechaVence} (en ${d.dias} días). Si vence, no podrás emitir comprobantes electrónicos hasta renovarlo.`, "Renovarlo toma unos días con tu proveedor (por ejemplo DigiFirma). Conviene empezar ya."],
      alerta: { tipo: "aviso", texto: `Vence el ${d.fechaVence}.` },
      boton: { texto: "Ver mi certificado", url: d.urlPanel ?? PANEL },
    }),
  },
  certificado_vencido: {
    meta: { categoria: "certificacion", nombre: "Firma digital vencida", cuando: "El día que vence", destino: "usuario", naturaleza: "aviso" },
    render: (d) => ({
      asunto: "Tu firma digital venció: no puedes emitir", titulo: "Tu firma digital venció",
      parrafos: [saludo(d.nombre), `El certificado de firma digital de ${d.negocio} venció el ${d.fechaVencio}. Mientras no lo renueves, no se pueden firmar ni enviar comprobantes a la DGII.`],
      alerta: { tipo: "error", texto: "Emisión de comprobantes detenida hasta renovar el certificado." },
      boton: { texto: "Renovar y subir el nuevo", url: d.urlPanel ?? PANEL },
    }),
  },

  // ───────────────────────── FACTURACIÓN ─────────────────────────
  ecf_rechazado_dgii: {
    meta: { categoria: "facturacion", nombre: "Factura rechazada por la DGII", cuando: "Cuando la DGII rechaza un comprobante emitido", destino: "usuario", naturaleza: "aviso" },
    render: (d) => ({
      asunto: `La DGII rechazó el comprobante ${d.eNCF}`, titulo: "Un comprobante fue rechazado",
      parrafos: [saludo(d.nombre), `La DGII rechazó el comprobante ${d.eNCF} de ${d.negocio}.`],
      alerta: { tipo: "error", texto: d.motivo },
      boton: { texto: "Revisar el comprobante", url: d.urlFactura },
    }),
  },
  contingencia_pendientes: {
    meta: { categoria: "facturacion", nombre: "Comprobantes pendientes de enviar a la DGII", cuando: "Cuando hay comprobantes sin enviar (contingencia)", destino: "usuario", naturaleza: "aviso" },
    render: (d) => ({
      asunto: `${d.cantidad} comprobante${d.cantidad === 1 ? "" : "s"} pendiente${d.cantidad === 1 ? "" : "s"} de enviar a la DGII`,
      titulo: "Hay comprobantes sin enviar a la DGII",
      parrafos: [saludo(d.nombre), `En ${d.negocio} hay ${d.cantidad} comprobante${d.cantidad === 1 ? "" : "s"} que todavía no llegaron a la DGII. El más antiguo lleva ${d.horasMasAntigua} horas.`, "La DGII da un plazo límite para enviarlos. Revísalos y reenvíalos cuanto antes."],
      alerta: { tipo: "aviso", texto: "Pendientes por enviar. Reenvíalos desde tu panel." },
      boton: { texto: "Ver pendientes", url: d.urlPanel ?? PANEL },
    }),
  },
  secuencias_por_agotarse: {
    meta: { categoria: "facturacion", nombre: "Secuencias por agotarse", cuando: "Cuando quedan pocos eNCF autorizados de un tipo", destino: "usuario", naturaleza: "aviso" },
    render: (d) => ({
      asunto: `Te quedan ${d.restantes} secuencias de ${d.tipo}`, titulo: "Se están acabando tus secuencias",
      parrafos: [saludo(d.nombre), `A ${d.negocio} le quedan ${d.restantes} números autorizados para comprobantes ${d.tipo}. Cuando se acaben, no podrás emitir ese tipo hasta pedir una nueva autorización en la DGII.`],
      alerta: { tipo: "aviso", texto: `Quedan ${d.restantes} secuencias de ${d.tipo}.` },
      boton: { texto: "Ver mis secuencias", url: d.urlPanel ?? PANEL },
    }),
  },
  stock_bajo: {
    meta: { categoria: "facturacion", nombre: "Inventario bajo", cuando: "Resumen diario de productos bajo su mínimo", destino: "usuario", naturaleza: "opcional" },
    render: (d) => ({
      asunto: `${d.productos.length} producto${d.productos.length === 1 ? "" : "s"} con poco inventario`, titulo: "Productos por reponer",
      parrafos: [saludo(d.nombre), `En ${d.negocio} estos productos están en o por debajo de su mínimo:`, ...d.productos.slice(0, 15).map((p) => `• ${p}`), ...(d.productos.length > 15 ? [`… y ${d.productos.length - 15} más.`] : [])],
      boton: { texto: "Ver inventario", url: d.urlInventario ?? PANEL },
    }),
  },

  // ───────────────────────── COBROS ─────────────────────────
  pago_recibido: {
    meta: { categoria: "cobros", nombre: "Pago recibido", cuando: "Tras cada pago exitoso de la mensualidad", destino: "usuario", naturaleza: "transaccional", adjuntos: "e-CF de Facturacon (PDF y XML), cuando esté activa la emisión propia" },
    render: (d) => ({
      asunto: `Recibimos tu pago de ${rd(d.monto)}`, preheader: `Plan ${d.plan}. Gracias.`,
      titulo: "¡Pago recibido, gracias!",
      parrafos: [saludo(d.nombre), `Recibimos el pago de tu plan ${d.plan}.`],
      datos: [["Plan", d.plan], ["Monto", rd(d.monto)], ["Fecha", fecha(d.fecha)], ["Referencia", d.referencia], ...(d.eNCF ? [["Comprobante", d.eNCF] as [string, string]] : []), ...(d.proximoCobro ? [["Próximo cobro", fecha(d.proximoCobro)] as [string, string]] : [])],
      alerta: { tipo: "exito", texto: "Tu cuenta está al día." },
      notaFinal: d.eNCF ? "Adjuntamos tu comprobante fiscal electrónico." : undefined,
    }),
  },
  pago_fallido: {
    meta: { categoria: "cobros", nombre: "Pago fallido", cuando: "Cuando no se puede cobrar la mensualidad", destino: "usuario", naturaleza: "aviso" },
    render: (d) => ({
      asunto: "No pudimos cobrar tu plan", titulo: "No se pudo procesar tu pago",
      parrafos: [saludo(d.nombre), `Intentamos cobrar ${rd(d.monto)} de tu plan ${d.plan} y no se pudo completar.${d.motivo ? ` Motivo: ${d.motivo}.` : ""}`, "Actualiza tu método de pago para no perder el acceso a la emisión de comprobantes."],
      alerta: { tipo: "aviso", texto: "Si el pago no se completa, la cuenta podría suspenderse." },
      boton: { texto: "Actualizar mi pago", url: d.urlFacturacion ?? PANEL },
    }),
  },
  plan_por_vencer: {
    meta: { categoria: "cobros", nombre: "Plan por vencer", cuando: "5, 3 y 1 día antes del próximo cobro", destino: "usuario", naturaleza: "aviso" },
    render: (d) => ({
      asunto: `Tu plan ${d.plan} se renueva en ${d.dias} día${d.dias === 1 ? "" : "s"}`, titulo: "Tu plan se renueva pronto",
      parrafos: [saludo(d.nombre), `Tu plan ${d.plan} se renueva el ${d.fecha}. Revisa que tu método de pago esté al día.`],
      boton: { texto: "Ver mi facturación", url: d.urlFacturacion ?? PANEL },
    }),
  },
  cuenta_suspendida: {
    meta: { categoria: "cobros", nombre: "Cuenta suspendida", cuando: "Al suspender la cuenta por falta de pago", destino: "usuario", naturaleza: "aviso" },
    render: (d) => ({
      asunto: `La cuenta de ${d.negocio} fue suspendida`, titulo: "Tu cuenta está suspendida",
      parrafos: [saludo(d.nombre), `Suspendimos la cuenta de ${d.negocio}. Motivo: ${d.motivo}.`, "Tus datos están a salvo. Al regularizar el pago, la cuenta vuelve a la normalidad."],
      alerta: { tipo: "error", texto: "No se pueden emitir comprobantes mientras la cuenta esté suspendida." },
      boton: { texto: "Regularizar mi pago", url: d.urlFacturacion ?? PANEL },
    }),
  },
  limite_comprobantes: {
    meta: { categoria: "cobros", nombre: "Límite de comprobantes", cuando: "Al llegar al 80 % y al 100 % de los comprobantes del plan", destino: "usuario", naturaleza: "aviso" },
    render: (d) => {
      const pct = Math.round((d.usados / d.incluidos) * 100);
      return {
        asunto: pct >= 100 ? "Usaste todos los comprobantes de tu plan" : `Llevas el ${pct} % de los comprobantes de tu plan`,
        titulo: pct >= 100 ? "Llegaste al límite de tu plan" : "Te estás acercando al límite",
        parrafos: [saludo(d.nombre), `${d.negocio} ha usado ${d.usados} de ${d.incluidos} comprobantes este mes.`, pct >= 100 ? `Puedes seguir emitiendo: cada comprobante adicional cuesta ${rd(d.extraRD)}.` : `Si te pasas, cada comprobante adicional cuesta ${rd(d.extraRD)}. No se corta nada.`],
        datos: [["Usados", String(d.usados)], ["Incluidos en tu plan", String(d.incluidos)], ["Comprobante adicional", rd(d.extraRD)]],
        alerta: { tipo: pct >= 100 ? "aviso" : "info", texto: `${pct} % del plan usado.` },
        boton: { texto: "Ver mi plan", url: d.urlFacturacion ?? PANEL },
      };
    },
  },
  cambio_plan: {
    meta: { categoria: "cobros", nombre: "Cambio de plan", cuando: "Al cambiar de plan", destino: "usuario", naturaleza: "transaccional" },
    render: (d) => ({
      asunto: `Cambiaste a ${d.planNuevo}`, titulo: "Tu plan cambió",
      parrafos: [saludo(d.nombre), `Tu plan pasó de ${d.planAnterior} a ${d.planNuevo}, vigente desde el ${d.desde}.`],
      boton: { texto: "Ver mi plan", url: PANEL },
    }),
  },
  cuenta_cerrada: {
    meta: { categoria: "cobros", nombre: "Cuenta cerrada", cuando: "Al darse de baja", destino: "usuario", naturaleza: "transaccional" },
    render: (d) => ({
      asunto: `La cuenta de ${d.negocio} se cerró`, titulo: "Cerramos tu cuenta",
      parrafos: [saludo(d.nombre), `La cuenta de ${d.negocio} quedó cerrada. Gracias por haber usado Facturacon.`, "Recuerda que los comprobantes ya emitidos siguen siendo válidos ante la DGII. Si cambias de opinión, escríbenos y lo vemos."],
    }),
  },

  // ───────────────────────── RESÚMENES ─────────────────────────
  resumen_semanal: {
    meta: { categoria: "resumenes", nombre: "Resumen semanal", cuando: "Lunes en la mañana", destino: "usuario", naturaleza: "opcional" },
    render: (d) => ({
      asunto: `Tu semana en ${d.negocio}: ${rd(d.ventas)}`, preheader: `${d.comprobantes} comprobantes del ${d.desde} al ${d.hasta}.`,
      titulo: "Así te fue esta semana",
      parrafos: [saludo(d.nombre), `Resumen de ${d.negocio}, del ${d.desde} al ${d.hasta}.`],
      datos: [["Comprobantes emitidos", String(d.comprobantes)], ["Ventas", rd(d.ventas)], ["ITBIS", rd(d.itbis)]],
      boton: { texto: "Ver el detalle", url: d.urlPanel ?? PANEL },
    }),
  },
  resumen_mensual: {
    meta: { categoria: "resumenes", nombre: "Resumen mensual", cuando: "Primer día hábil del mes", destino: "usuario", naturaleza: "opcional" },
    render: (d) => ({
      asunto: `Cierre de ${d.mes}: ${d.comprobantes} comprobantes`, titulo: `Tu cierre de ${d.mes}`,
      parrafos: [saludo(d.nombre), `Este fue el movimiento de ${d.negocio} en ${d.mes}.`],
      datos: [["Comprobantes emitidos", String(d.comprobantes)], ["Ventas", rd(d.ventas)], ["ITBIS", rd(d.itbis)], ["Rechazados por la DGII", String(d.rechazados)]],
      boton: { texto: "Descargar reportes", url: d.urlContabilidad ?? PANEL },
      notaFinal: "Puedes compartir los reportes con tu contador.",
    }),
  },
  recordatorio_declaraciones: {
    meta: { categoria: "resumenes", nombre: "Recordatorio de declaraciones", cuando: "Una vez al mes, antes de la fecha límite de la DGII", destino: "usuario", naturaleza: "opcional" },
    render: (d) => ({
      asunto: `Recordatorio: reportes de ${d.mes} para la DGII`, titulo: "Se acerca el envío de tus reportes",
      parrafos: [saludo(d.nombre), `Los reportes de ${d.mes} de ${d.negocio} ya están listos para descargar. Recuerda enviarlos a la DGII dentro del plazo que ella establece.`],
      boton: { texto: "Ir a mis reportes", url: d.urlContabilidad ?? PANEL },
    }),
  },

  // ───────────────────────── SEGURIDAD ─────────────────────────
  acceso_nuevo: {
    meta: { categoria: "seguridad", nombre: "Acceso desde un dispositivo nuevo", cuando: "Al iniciar sesión desde un dispositivo no reconocido", destino: "usuario", naturaleza: "aviso" },
    render: (d) => ({
      asunto: "Nuevo inicio de sesión en tu cuenta", titulo: "Entraron a tu cuenta desde un dispositivo nuevo",
      parrafos: [saludo(d.nombre), "Detectamos un inicio de sesión desde un dispositivo que no reconocemos."],
      datos: [["Dispositivo", d.dispositivo], ["Fecha", d.fecha], ...(d.ubicacion ? [["Ubicación aproximada", d.ubicacion] as [string, string]] : [])],
      alerta: { tipo: "aviso", texto: "Si fuiste tú, no tienes que hacer nada. Si no, cambia tu acceso de inmediato y avísanos." },
      boton: { texto: "Revisar mi cuenta", url: PANEL },
    }),
  },
  miembro_agregado: {
    meta: { categoria: "seguridad", nombre: "Usuario agregado al equipo", cuando: "Al agregar o quitar usuarios (aviso al dueño)", destino: "usuario", naturaleza: "aviso" },
    render: (d) => ({
      asunto: `${d.miembro} se agregó al equipo de ${d.negocio}`, titulo: "Cambió el equipo de tu negocio",
      parrafos: [saludo(d.nombre), `${d.quien} agregó a ${d.miembro} a ${d.negocio} con el rol de ${d.rol}.`, "Si no reconoces este cambio, revisa los permisos de tu equipo."],
      boton: { texto: "Ver mi equipo", url: PANEL },
    }),
  },

  // ───────────────────────── NOVEDADES ─────────────────────────
  novedades: {
    meta: { categoria: "novedades", nombre: "Novedades del producto", cuando: "Cuando hay mejoras importantes (máx. 1 al mes)", destino: "usuario", naturaleza: "opcional" },
    render: (d) => ({
      asunto: d.titulo, titulo: d.titulo,
      parrafos: [saludo(d.nombre), "Esto es lo nuevo en Facturacon:", ...d.items.map((i) => `• ${i}`)],
      boton: d.urlMas ? { texto: "Ver más", url: d.urlMas } : undefined,
    }),
  },
  encuesta_opinion: {
    meta: { categoria: "novedades", nombre: "Encuesta de opinión", cuando: "7 días después de la primera factura", destino: "usuario", naturaleza: "opcional" },
    render: (d) => ({
      asunto: "¿Cómo te va con Facturacon?", titulo: "Queremos saber cómo te va",
      parrafos: [saludo(d.nombre), "Llevas una semana facturando con nosotros. ¿Nos regalas un minuto para contarnos qué tal te fue? Tu opinión decide qué mejoramos primero."],
      boton: { texto: "Responder (1 minuto)", url: d.urlEncuesta },
    }),
  },

  // ───────────────────────── INTERNOS (llegan a contacto@) ─────────────────────────
  interno_contacto_web: {
    meta: { categoria: "interno", nombre: "Mensaje del formulario de contacto", cuando: "Cuando alguien escribe desde la web", destino: "interno", naturaleza: "transaccional" },
    render: (d) => ({
      asunto: `Contacto web: ${d.nombre}`, titulo: "Nuevo mensaje desde la web",
      parrafos: [d.mensaje],
      datos: [["Nombre", d.nombre], ["Correo", d.correo], ...(d.telefono ? [["Teléfono", d.telefono] as [string, string]] : [])],
      notaFinal: "Responde a este correo: la respuesta llega directo a la persona.",
    }),
  },
  interno_pago_fallido: {
    meta: { categoria: "interno", nombre: "Pago fallido (cliente)", cuando: "Cuando falla el cobro de un cliente", destino: "interno", naturaleza: "aviso" },
    render: (d) => ({
      asunto: `Pago fallido: ${d.negocio}`, titulo: "Falló un cobro",
      parrafos: ["No se pudo cobrar la mensualidad de un cliente."],
      datos: [["Negocio", d.negocio], ["Plan", d.plan], ["Monto", rd(d.monto)], ["Motivo", d.motivo ?? "—"]],
    }),
  },
  interno_error_dgii: {
    meta: { categoria: "interno", nombre: "Error con la DGII", cuando: "Cuando falla algo grave al hablar con la DGII", destino: "interno", naturaleza: "aviso" },
    render: (d) => ({
      asunto: `Error DGII en ${d.negocio}`, titulo: "Falla en la comunicación con la DGII",
      parrafos: [d.contexto],
      alerta: { tipo: "error", texto: d.detalle },
      datos: [["Negocio", d.negocio]],
    }),
  },
  interno_cert_aprobada: {
    meta: { categoria: "interno", nombre: "Cliente certificado", cuando: "Cuando un negocio completa su certificación", destino: "interno", naturaleza: "aviso" },
    render: (d) => ({
      asunto: `¡Certificado! ${d.negocio}`, titulo: "Un negocio terminó su certificación",
      parrafos: ["Un cliente completó el proceso ante la DGII."],
      datos: [["Negocio", d.negocio], ["RNC", d.rnc], ...(d.dias ? [["Días que tomó", String(d.dias)] as [string, string]] : [])],
      alerta: { tipo: "exito", texto: "Certificación completada." },
    }),
  },
  interno_cert_rechazo: {
    meta: { categoria: "interno", nombre: "Rechazo en certificación (cliente)", cuando: "Cuando la DGII rechaza un paso de un cliente", destino: "interno", naturaleza: "aviso" },
    render: (d) => ({
      asunto: `Rechazo DGII en ${d.negocio}: ${d.paso}`, titulo: "La DGII rechazó un paso",
      parrafos: ["Un cliente recibió un rechazo durante su certificación."],
      alerta: { tipo: "error", texto: d.motivo },
      datos: [["Negocio", d.negocio], ["Paso", d.paso]],
    }),
  },
};

export function renderCorreo<K extends IdCorreo>(id: K, datos: DatosPorCorreo[K]): { asunto: string; html: string; texto: string; meta: MetaCorreo } {
  const def = CATALOGO[id] as Def<K>;
  const c = def.render(datos);
  const { html, texto } = armarCorreo(c, { conBaja: def.meta.naturaleza === "opcional" });
  return { asunto: c.asunto, html, texto, meta: def.meta };
}
