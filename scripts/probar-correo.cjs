/* eslint-disable @typescript-eslint/no-require-imports -- script de Node (CommonJS) que se ejecuta a mano */
// Prueba que el correo está bien configurado: verifica el acceso al servidor SMTP y manda
// un mensaje de prueba. No toca la base de datos ni nada del sitio.
//
// Uso:   node scripts/probar-correo.cjs tucorreo@ejemplo.com
// Lee SMTP_HOST, SMTP_PORT, SMTP_USER y SMTP_PASS de .env.local (la clave nunca se imprime).
const fs = require("fs");
const path = require("path");
const nodemailer = require("nodemailer");

const env = {};
for (const l of fs.readFileSync(path.join(__dirname, "..", ".env.local"), "utf8").split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^"|"$/g, "");
}
const faltan = ["SMTP_HOST", "SMTP_USER", "SMTP_PASS"].filter((k) => !env[k]);
if (faltan.length) { console.error("Faltan en .env.local:", faltan.join(", ")); process.exit(1); }
const destino = process.argv[2];
if (!destino || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(destino)) { console.error("Uso: node scripts/probar-correo.cjs tucorreo@ejemplo.com"); process.exit(1); }

const puerto = Number(env.SMTP_PORT || 465);
const t = nodemailer.createTransport({
  host: env.SMTP_HOST, port: puerto, secure: puerto === 465, requireTLS: puerto !== 465,
  auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
});

(async () => {
  try {
    await t.verify();
    console.log(`✔ Conexión y clave correctas con ${env.SMTP_HOST}:${puerto} (usuario ${env.SMTP_USER})`);
    const r = await t.sendMail({
      from: { name: "Facturacon", address: env.SMTP_USER },
      to: destino,
      replyTo: env.MAIL_REPLY_TO || "contacto@facturacon.com.do",
      subject: "Prueba de correo de Facturacon",
      text: "Si lees esto, el correo del sistema funciona. Puedes borrar este mensaje.",
      html: '<div style="font-family:Arial,sans-serif;font-size:15px;color:#0F1A30"><h2>Prueba de correo</h2><p>Si lees esto, el correo del sistema de <b>Facturacon</b> funciona.</p><p style="color:#6B7280;font-size:12px">Puedes borrar este mensaje.</p></div>',
    });
    console.log("✔ Mensaje enviado a", destino, "· id:", r.messageId);
  } catch (e) {
    console.error("✘ No funcionó:", e.message);
    if (/Invalid login|535|auth/i.test(e.message)) console.error("  → Revisa que SMTP_PASS sea la contraseña de aplicación del buzón (no la clave normal) y el servidor (smtp.zoho.com / .eu / .in).");
    process.exit(1);
  }
})();
