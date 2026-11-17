// Manda TODOS los correos del catálogo (con datos de ejemplo) a una dirección, para revisar
// cómo se ven en la bandeja. No toca la base de datos ni nada del sitio.
//
// Uso:   node scripts/enviar-todos-los-correos.mjs tucorreo@ejemplo.com
//        node scripts/enviar-todos-los-correos.mjs tucorreo@ejemplo.com --solo=pago_recibido,bienvenida
//        node scripts/enviar-todos-los-correos.mjs --listar          (solo arma los correos, no envía)
//
// Lee SMTP_HOST, SMTP_PORT, SMTP_USER y SMTP_PASS de .env.local (la clave nunca se imprime).
// Cada asunto lleva el prefijo [Prueba n/total] para ubicarlos fácil. Los "internos" (que en
// producción llegan a contacto@) aquí también van a la dirección que pongas.
import fs from "fs";
import os from "os";
import path from "path";
import { createRequire } from "module";
import { fileURLToPath, pathToFileURL } from "url";

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const nodemailer = require("nodemailer");

// El catálogo está en TypeScript con imports sin extensión: se copia a una carpeta temporal
// ajustando solo esos imports, y se carga desde ahí.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "correos-"));
fs.copyFileSync(path.join(RAIZ, "lib/email/plantilla.ts"), path.join(tmp, "plantilla.ts"));
fs.writeFileSync(path.join(tmp, "catalogo.ts"), fs.readFileSync(path.join(RAIZ, "lib/email/catalogo.ts"), "utf8").replace('from "./plantilla"', 'from "./plantilla.ts"'));
const { CATALOGO, renderCorreo } = await import(pathToFileURL(path.join(tmp, "catalogo.ts")).href);

const U = "https://www.facturacon.com.do";
const MUESTRA = {
  bienvenida: { nombre: "Peter" },
  invitacion_equipo: { nombre: "Laura", invitador: "Peter García", negocio: "ABC Facturacon", rol: "Cajera", urlAcceso: `${U}/login` },
  rol_cambiado: { nombre: "Laura", negocio: "ABC Facturacon", rolNuevo: "Encargada de almacén" },
  cert_iniciada: { nombre: "Peter", negocio: "ABC Facturacon", urlAsistente: `${U}/panel` },
  cert_rechazo_dgii: { nombre: "Peter", negocio: "ABC Facturacon", paso: "Representación impresa", motivo: "El código de seguridad y la fecha de firma deben estar debajo del QR.", urlAsistente: `${U}/panel` },
  cert_inactiva: { nombre: "Peter", negocio: "ABC Facturacon", dias: 3, pasoActual: "Set de pruebas", urlAsistente: `${U}/panel` },
  cert_aprobada: { nombre: "Peter", negocio: "ABC Facturacon" },
  certificado_por_vencer: { nombre: "Peter", negocio: "ABC Facturacon", dias: 30, fechaVence: "15-12-2026" },
  certificado_vencido: { nombre: "Peter", negocio: "ABC Facturacon", fechaVencio: "15-12-2026" },
  ecf_rechazado_dgii: { nombre: "Peter", negocio: "ABC Facturacon", eNCF: "E310000000012", motivo: "El RNC del comprador no es válido.", urlFactura: `${U}/panel` },
  contingencia_pendientes: { nombre: "Peter", negocio: "ABC Facturacon", cantidad: 3, horasMasAntigua: 40 },
  secuencias_por_agotarse: { nombre: "Peter", negocio: "ABC Facturacon", tipo: "E32", restantes: 25 },
  pago_recibido: { nombre: "Peter", plan: "Emprendedor", monto: 690, fecha: "16-11-2026", referencia: "PAG-12345", eNCF: "E320000000009", proximoCobro: "16-12-2026" },
  pago_fallido: { nombre: "Peter", plan: "Emprendedor", monto: 690, motivo: "Tarjeta rechazada" },
  plan_por_vencer: { nombre: "Peter", plan: "Emprendedor", dias: 3, fecha: "19-11-2026" },
  cuenta_suspendida: { nombre: "Peter", negocio: "ABC Facturacon", motivo: "pago pendiente" },
  limite_comprobantes: { nombre: "Peter", negocio: "ABC Facturacon", usados: 82, incluidos: 100, extraRD: 3 },
  cambio_plan: { nombre: "Peter", planAnterior: "Emprendedor", planNuevo: "Negocio", desde: "16-11-2026" },
  cuenta_cerrada: { nombre: "Peter", negocio: "ABC Facturacon" },
  resumen_semanal: { nombre: "Peter", negocio: "ABC Facturacon", desde: "09-11-2026", hasta: "15-11-2026", comprobantes: 64, ventas: 215400.5, itbis: 32310 },
  resumen_mensual: { nombre: "Peter", negocio: "ABC Facturacon", mes: "octubre 2026", comprobantes: 248, ventas: 880000, itbis: 134000, rechazados: 2 },
  recordatorio_declaraciones: { nombre: "Peter", negocio: "ABC Facturacon", mes: "octubre 2026" },
  acceso_nuevo: { nombre: "Peter", dispositivo: "Chrome en Windows", fecha: "16-11-2026 08:15", ubicacion: "Santo Domingo, DO" },
  miembro_agregado: { nombre: "Peter", negocio: "ABC Facturacon", miembro: "Laura", rol: "Cajera", quien: "Peter García" },
  novedades: { nombre: "Peter", titulo: "Novedades de noviembre", items: ["Caja rápida con lector de código de barras", "Inventario con entradas y mermas"] },
  encuesta_opinion: { nombre: "Peter", urlEncuesta: `${U}/encuesta` },
  interno_contacto_web: { nombre: "Ana", correo: "ana@ejemplo.com", telefono: "809-555-1234", mensaje: "Hola, quiero saber cuánto cuesta certificar mi colmado." },
  interno_pago_fallido: { negocio: "ABC Facturacon", plan: "Emprendedor", monto: 690, motivo: "Fondos insuficientes" },
  interno_error_dgii: { negocio: "ABC Facturacon", contexto: "No se pudo autenticar con la DGII", detalle: "Envío e-CF: 500 — servicio no disponible" },
  interno_cert_aprobada: { negocio: "ABC Facturacon", rnc: "40212171397", dias: 6 },
  interno_cert_rechazo: { negocio: "ABC Facturacon", paso: "Simulación", motivo: "La propiedad Totales no coincide." },
};

const args = process.argv.slice(2);
const listar = args.includes("--listar");
const soloArg = args.find((a) => a.startsWith("--solo="));
const destino = args.find((a) => !a.startsWith("--"));
const ids = Object.keys(CATALOGO).filter((id) => !soloArg || soloArg.slice(7).split(",").includes(id));

const sinMuestra = Object.keys(CATALOGO).filter((id) => !(id in MUESTRA));
if (sinMuestra.length) { console.error("Faltan datos de ejemplo para:", sinMuestra.join(", ")); process.exit(1); }

if (listar) {
  for (const id of ids) { const r = renderCorreo(id, MUESTRA[id]); console.log(`${id.padEnd(28)} ${r.asunto}`); }
  console.log(`\n${ids.length} correos armados correctamente (no se envió ninguno).`);
  fs.rmSync(tmp, { recursive: true, force: true });
  process.exit(0);
}

if (!destino || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(destino)) {
  console.error("Uso: node scripts/enviar-todos-los-correos.mjs tucorreo@ejemplo.com   (o --listar para solo armarlos)");
  process.exit(1);
}

const env = {};
for (const l of fs.readFileSync(path.join(RAIZ, ".env.local"), "utf8").split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].replace(/^"|"$/g, "");
}
const faltan = ["SMTP_HOST", "SMTP_USER", "SMTP_PASS"].filter((k) => !env[k]);
if (faltan.length) { console.error("Faltan en .env.local:", faltan.join(", ")); process.exit(1); }

const puerto = Number(env.SMTP_PORT || 465);
const t = nodemailer.createTransport({
  host: env.SMTP_HOST, port: puerto, secure: puerto === 465, requireTLS: puerto !== 465,
  auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
});

const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
let ok = 0, fallos = 0;
console.log(`Enviando ${ids.length} correos de prueba a ${destino}…\n`);
for (const [i, id] of ids.entries()) {
  const r = renderCorreo(id, MUESTRA[id]);
  try {
    await t.sendMail({
      from: { name: "Facturacon", address: env.SMTP_USER },
      to: destino,
      replyTo: env.MAIL_REPLY_TO || "contacto@facturacon.com.do",
      subject: `[Prueba ${i + 1}/${ids.length}] ${r.asunto}`,
      html: r.html, text: r.texto,
      headers: r.meta.naturaleza === "opcional" ? { "List-Unsubscribe": "<mailto:contacto@facturacon.com.do?subject=Baja>" } : {},
    });
    ok++; console.log(`✔ ${String(i + 1).padStart(2)}/${ids.length}  ${id}`);
  } catch (e) {
    fallos++; console.error(`✘ ${String(i + 1).padStart(2)}/${ids.length}  ${id}: ${e.message}`);
    if (/rate|limit|too many|454|421|550 5\.4/i.test(e.message)) { console.error("  → Zoho pidió bajar el ritmo; espera unos minutos y usa --solo=… con los que faltaron."); break; }
  }
  await pausa(2000); // para no pasar el límite de envíos por minuto
}
console.log(`\nListo: ${ok} enviados, ${fallos} con error.`);
fs.rmSync(tmp, { recursive: true, force: true });
