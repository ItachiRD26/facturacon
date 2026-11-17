/* eslint-disable @typescript-eslint/no-require-imports -- script de Node (CommonJS) que se ejecuta a mano */
// Pruebas de la integración de cobros recurrentes contra el SANDBOX de Pagadito (API de Tokenización).
// Nunca toca el ambiente real ni la empresa de Peter: cada prueba crea una empresa ficticia
// "PAGADITOPRUEBA<n>" (marcada esPrueba) para que los webhooks de Pagadito caigan ahí.
//
// Uso (desde la carpeta del proyecto; lee PAGADITO_UID/WSK de .env.local, nunca los imprime):
//   node scripts/pagadito-sandbox.cjs credenciales
//   node scripts/pagadito-sandbox.cjs suscribir mensual [100] [visa|mc]
//   node scripts/pagadito-sandbox.cjs suscribir anual [100]
//   node scripts/pagadito-sandbox.cjs cobrar <tenantId> <usd>       (cobro suelto con el token: como los comprobantes adicionales)
//   node scripts/pagadito-sandbox.cjs cancelar <tenantId>
//   node scripts/pagadito-sandbox.cjs reembolsar <authorization> [motivo]
//   node scripts/pagadito-sandbox.cjs estado <tenantId>
//   node scripts/pagadito-sandbox.cjs limpiar                       (borra las empresas de prueba)
const fs = require("fs");
const path = require("path");
const { createRequire } = require("module");

const RAIZ = path.join(__dirname, "..");
const req = createRequire(path.join(RAIZ, "package.json"));
const env = {};
for (const l of fs.readFileSync(path.join(RAIZ, ".env.local"), "utf8").split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].replace(/^"|"$/g, "");
}

// Planes (los mismos de lib/payments/planes.ts; USD por mensualidad)
const PLANES = { "100": { facturas: 100, usd: 11.5 }, "250": { facturas: 250, usd: 23 }, "500": { facturas: 500, usd: 38.67 }, "1000": { facturas: 1000, usd: 64.83 } };
const TARJETAS = {
  visa: { number: "4111111111111111", marca: "VISA" },
  mc: { number: "5555555555554444", marca: "MasterCard" },
  mc2: { number: "5105105105105100", marca: "MasterCard" },
  mc3: { number: "4242424242424242", marca: "MasterCard (doc)" },
};

if (env.PAGADITO_ENV === "live") { console.error("PAGADITO_ENV=live: este script solo corre contra el SANDBOX. Cámbialo a sandbox."); process.exit(1); }
if (!env.PAGADITO_UID || !env.PAGADITO_WSK) { console.error("Faltan PAGADITO_UID / PAGADITO_WSK en .env.local (credenciales del SANDBOX)."); process.exit(1); }
const AUTH = "Basic " + Buffer.from(`${env.PAGADITO_UID}:${env.PAGADITO_WSK}`).toString("base64");
const BASE = "https://sandbox-api.pagadito.com/v1/";

async function llamar(recurso, body) {
  const res = await fetch(BASE + recurso, { method: "POST", headers: { "Content-Type": "Application/json;charset=UTF-8", Authorization: AUTH }, body: JSON.stringify(body) });
  const texto = await res.text();
  let data; try { data = JSON.parse(texto); } catch { data = { response_code: "NO-JSON", response_message: texto.slice(0, 200) }; }
  return { http: res.status, data };
}
const resumen = (r) => `HTTP ${r.http} · ${r.data.response_code} — ${r.data.response_message}`;

function db() {
  const { initializeApp, cert, getApps } = req("firebase-admin/app");
  const { getFirestore } = req("firebase-admin/firestore");
  if (!getApps().length) initializeApp({ credential: cert({ projectId: env.FIREBASE_PROJECT_ID, clientEmail: env.FIREBASE_CLIENT_EMAIL, privateKey: env.FIREBASE_PRIVATE_KEY.split("\\n").join("\n") }) });
  return getFirestore();
}
const refSus = (d, id) => d.collection("tenants").doc(id).collection("facturacion").doc("suscripcion");
const BROWSER = { deviceFingerprintID: "prueba-" + Date.now().toString(36), customerIp: "190.80.1.1" };

const [, , cmd, a1, a2, a3] = process.argv;

(async () => {
  if (cmd === "credenciales") {
    // Una cancelación de un código inexistente: si las credenciales son válidas, Pagadito responde con un error de negocio (no de acceso).
    const r = await llamar("subscription-cancel", { subscription_code: "sub_inexistente0" });
    console.log("Respuesta:", resumen(r));
    console.log(r.http === 401 || /PG3007|denied|unauthor|credential/i.test(JSON.stringify(r.data))
      ? "✘ Las credenciales no fueron aceptadas (revisa UID/WSK del SANDBOX)." : "✔ Las credenciales parecen válidas (Pagadito te atendió; el error es solo por el código falso).");

  } else if (cmd === "suscribir") {
    const periodo = a1 === "anual" ? "anual" : "mensual";
    const plan = PLANES[a2 && PLANES[a2] ? a2 : "100"];
    const tarjeta = TARJETAS[a3] ?? TARJETAS.visa;
    const tenantId = "PAGADITOPRUEBA" + Date.now();
    const montoUSD = (plan.usd * (periodo === "anual" ? 10 : 1)).toFixed(2);
    const r = await llamar("subscription", {
      card: {
        number: tarjeta.number, expirationDate: "12/2030", cvv: "123", cardHolderName: "PRUEBA FACTURACON",
        firstName: "Prueba", lastName: "Facturacon", email: "pruebas@facturacon.com.do",
        billingAddress: { city: "Santo Domingo", state: "Distrito Nacional", zip: "", countryId: "214", line1: "Calle de prueba 1", phone: "+1 809 555 5555" },
      },
      recurring: {
        interval: periodo === "anual" ? "year" : "month", interval_count: periodo === "anual" ? 10 : 120, first_interval_free: false,
        merchantTransactionId: `sub-${tenantId}`, description: `Prueba plan ${plan.facturas}${periodo === "anual" ? " (anual)" : ""} — Facturacon`.slice(0, 100),
        interval_amount: montoUSD,
      },
      browserInfo: BROWSER,
    });
    console.log(`${periodo} · ${tarjeta.marca} · US$${montoUSD} →`, resumen(r));
    const cr = r.data.customer_reply;
    if (cr) {
      const d = db();
      await d.collection("tenants").doc(tenantId).set({ estado: "activo", esPrueba: true, nombreNegocio: "Prueba Pagadito", creadoEn: new Date().toISOString() });
      await refSus(d, tenantId).set({
        paymentToken: cr.payment_token, subscriptionCode: cr.recurring.subscription_code, planId: String(a2 && PLANES[a2] ? a2 : "100"), facturasMes: plan.facturas,
        montoUSD, periodo, estado: "activa", ultimos4: tarjeta.number.slice(-4), creadoEn: new Date().toISOString(), ultimoPagoEn: new Date().toISOString(), browserInfo: BROWSER,
      });
      console.log("✔ Suscripción creada. Empresa de prueba:", tenantId);
      console.log("  period (según Pagadito):", cr.recurring.period, "| autorización:", cr.authorization, "| código:", cr.recurring.subscription_code);
      console.log("  Siguiente: espera el webhook y mira el estado con →  node scripts/pagadito-sandbox.cjs estado " + tenantId);
    }

  } else if (cmd === "cobrar") {
    const d = db(); const s = (await refSus(d, a1).get()).data();
    if (!s) { console.error("No existe esa empresa de prueba."); process.exit(1); }
    const r = await llamar("payment", {
      payment_token: s.paymentToken, browserInfo: s.browserInfo ?? BROWSER,
      transaction: { merchantTransactionId: `adic-${a1}-${Date.now()}`, currencyId: "USD", transactionDetails: [{ quantity: "1", description: "Prueba comprobantes adicionales", amount: Number(a2 || "3").toFixed(2) }] },
    });
    console.log("Cobro con token →", resumen(r));
    if (r.data.customer_reply) console.log("✔ autorización:", r.data.customer_reply.authorization);

  } else if (cmd === "cancelar") {
    const d = db(); const s = (await refSus(d, a1).get()).data();
    if (!s) { console.error("No existe esa empresa de prueba."); process.exit(1); }
    const r = await llamar("subscription-cancel", { subscription_code: s.subscriptionCode });
    console.log("Cancelación →", resumen(r));
    if (r.data.response_code === "PG200-00") await refSus(d, a1).set({ estado: "cancelada", actualizadoEn: new Date().toISOString() }, { merge: true });

  } else if (cmd === "reembolsar") {
    const r = await llamar("refund", { authorization: a1, reason: a2 || "Prueba de reembolso" });
    console.log("Reembolso →", resumen(r), r.data.amount ? `· monto ${r.data.amount}` : "");

  } else if (cmd === "estado") {
    const d = db();
    const t = (await d.collection("tenants").doc(a1).get()).data();
    const s = (await refSus(d, a1).get()).data();
    console.log("tenant:", t ? t.estado : "no existe", "| suscripción:", s ? JSON.stringify({ estado: s.estado, periodo: s.periodo, ultimoPagoEn: s.ultimoPagoEn, actualizadoEn: s.actualizadoEn }) : "no existe");

  } else if (cmd === "limpiar") {
    const d = db(); const todos = await d.collection("tenants").where("esPrueba", "==", true).get();
    for (const t of todos.docs) { await refSus(d, t.id).delete().catch(() => {}); await t.ref.delete(); }
    console.log("Empresas de prueba borradas:", todos.size);

  } else {
    console.log("Comandos: credenciales | suscribir mensual|anual [plan] [visa|mc|mc2|mc3] | cobrar <tenantId> <usd> | cancelar <tenantId> | reembolsar <autorizacion> | estado <tenantId> | limpiar");
  }
})().catch((e) => { console.error("Error:", e.message); process.exit(1); });
