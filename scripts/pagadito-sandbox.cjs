/* eslint-disable @typescript-eslint/no-require-imports -- script de Node (CommonJS) que se ejecuta a mano */
// Pruebas de la integración de cobros recurrentes contra el SANDBOX de Pagadito (API de Tokenización).
// Nunca toca el ambiente real ni la empresa de Peter: cada prueba crea una empresa ficticia
// "PAGADITOPRUEBA<n>" (marcada esPrueba) para que los webhooks de Pagadito caigan ahí.
//
// Uso (desde la carpeta del proyecto; lee PAGADITO_UID/WSK de .env.local, nunca los imprime):
//   node scripts/pagadito-sandbox.cjs credenciales
//   node scripts/pagadito-sandbox.cjs suscribir mensual [100] [visa|mc]
//   node scripts/pagadito-sandbox.cjs suscribir anual [100]
//   node scripts/pagadito-sandbox.cjs ciclo <tenantId> [YYYY-MM-DD]   (simula el cobro del ciclo en esa fecha; requiere npm run dev y CRON_SECRET)
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
const BROWSER = { deviceFingerprintID: String(Date.now()) + String(Math.floor(Math.random() * 1e6)).padStart(6, "0"), customerIp: "190.80.1.1" };

const [, , cmd, a1, a2, a3] = process.argv;

(async () => {
  if (cmd === "credenciales") {
    // Una cancelación de un código inexistente: si las credenciales son válidas, Pagadito responde con un error de negocio (no de acceso).
    const r = await llamar("subscription-cancel", { subscription_code: "sub_inexistente0" });
    console.log("Respuesta:", resumen(r));
    console.log(r.http === 401 || /PG3007|denied|unauthor|credential/i.test(JSON.stringify(r.data))
      ? "✘ Las credenciales no fueron aceptadas (revisa UID/WSK del SANDBOX)." : "✔ Las credenciales parecen válidas (Pagadito te atendió; el error es solo por el código falso).");

  } else if (cmd === "suscribir") {
    // Igual que el sistema real (lib/payments/cobros.ts): tokeniza la tarjeta y hace el PRIMER cobro con /customer;
    // los cobros siguientes los decide Facturacon (cron /api/cron/cobros), no Pagadito.
    const periodo = a1 === "anual" ? "anual" : "mensual";
    const plan = PLANES[a2 && PLANES[a2] ? a2 : "100"];
    const tarjeta = TARJETAS[a3] ?? (/^\d{13,19}$/.test(a3 || "") ? { number: a3, marca: "tarjeta " + a3.slice(0, 4) + "…" + a3.slice(-4) } : TARJETAS.visa);   // también acepta un número de 13 a 19 dígitos
    const tenantId = "PAGADITOPRUEBA" + Date.now();
    const montoUSD = (plan.usd * (periodo === "anual" ? 10 : 1)).toFixed(2);
    const ern = `sub-${tenantId}-${Date.now().toString(36)}`;
    const r = await llamar("customer", {
      card: {
        number: tarjeta.number, expirationDate: "12/2030", cvv: "123", cardHolderName: "PRUEBA FACTURACON",
        firstName: "Prueba", lastName: "Facturacon", email: "pruebas@facturacon.com.do",
        billingAddress: { city: "Santo Domingo", state: "Distrito Nacional", zip: "", countryId: "214", line1: "Calle de prueba 1", phone: "+1 809 555 5555" },
      },
      transaction: {
        merchantTransactionId: ern, currencyId: "USD",
        transactionDetails: [{ quantity: "1", description: `Prueba plan ${plan.facturas}${periodo === "anual" ? " (anual)" : ""} - Facturacon`.slice(0, 100), amount: montoUSD }],
      },
      browserInfo: BROWSER,
    });
    console.log(`${periodo} · ${tarjeta.marca} · US$${montoUSD} →`, resumen(r));
    const cr = r.data.customer_reply;
    if (cr) {
      const d = db();
      const hoy = new Date(Date.now() - 4 * 3600e3).toISOString().slice(0, 10);   // fecha en RD (UTC-4)
      const [y, m, dia] = hoy.split("-").map(Number);
      const prox = periodo === "anual" ? `${y + 1}-${String(m).padStart(2, "0")}-${String(dia).padStart(2, "0")}` : (m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`) + `-${String(Math.min(dia, 28)).padStart(2, "0")}`;
      const mesAnt = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
      await d.collection("tenants").doc(tenantId).set({ estado: "activo", esPrueba: true, nombreNegocio: "Prueba Pagadito", creadoEn: new Date().toISOString() });
      await refSus(d, tenantId).set({
        paymentToken: cr.payment_token, planId: String(a2 && PLANES[a2] ? a2 : "100"), facturasMes: plan.facturas,
        montoUSD, periodo, estado: "activa", ultimos4: tarjeta.number.slice(-4), creadoEn: new Date().toISOString(), ultimoPagoEn: new Date().toISOString(), browserInfo: BROWSER,
        ern, ultimoErn: ern, autorizacion: cr.authorization,
        cobroPropio: true, anclaCobro: hoy, cicloActual: 1, proximoCobroEn: prox, intentosFallidos: 0, adicionalesFacturadosHasta: mesAnt,
      });
      console.log("✔ Primer cobro hecho. Empresa de prueba:", tenantId);
      console.log("  autorización:", cr.authorization, "| ERN:", ern, "| próximo cobro:", prox);
      console.log("  Simular el siguiente ciclo (con el servidor local y CRON_SECRET en .env.local):");
      console.log(`    node scripts/pagadito-sandbox.cjs ciclo ${tenantId} ${prox}`);
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

  } else if (cmd === "ciclo") {
    // Pide al servidor local (npm run dev) que cobre el ciclo como si hoy fuera <fecha>; solo funciona fuera de "live".
    if (!env.CRON_SECRET) { console.error("Falta CRON_SECRET en .env.local (y reiniciar el servidor)."); process.exit(1); }
    const fecha = a2 || new Date().toISOString().slice(0, 10);
    const res = await fetch(`http://localhost:3000/api/cron/cobros?tenant=${encodeURIComponent(a1)}&hoy=${fecha}`, { headers: { Authorization: `Bearer ${env.CRON_SECRET}` } });
    console.log("Cron de cobros →", res.status, await res.text());
    console.log("Mira el resultado con →  node scripts/pagadito-sandbox.cjs estado " + a1);

  } else if (cmd === "cancelar") {
    const d = db(); const s = (await refSus(d, a1).get()).data();
    if (!s) { console.error("No existe esa empresa de prueba."); process.exit(1); }
    // Con el cobro propio no hay suscripción en Pagadito que cancelar: basta con dejar de cobrar (en el panel,
    // "Cancelar cobro recurrente" también cobra los adicionales acumulados). Aquí solo se marca como cancelada.
    if (s.subscriptionCode) { const r = await llamar("subscription-cancel", { subscription_code: s.subscriptionCode }); console.log("Cancelación en Pagadito →", resumen(r)); }
    await refSus(d, a1).set({ estado: "cancelada", actualizadoEn: new Date().toISOString() }, { merge: true });
    console.log("✔ Marcada como cancelada.");

  } else if (cmd === "reembolsar") {
    const r = await llamar("refund", { authorization: a1, reason: a2 || "Prueba de reembolso" });
    console.log("Reembolso →", resumen(r), r.data.amount ? `· monto ${r.data.amount}` : "");

  } else if (cmd === "estado") {
    const d = db();
    const t = (await d.collection("tenants").doc(a1).get()).data();
    const s = (await refSus(d, a1).get()).data();
    console.log("tenant:", t ? t.estado : "no existe", "| suscripción:", s ? JSON.stringify({ estado: s.estado, periodo: s.periodo, ultimoPagoEn: s.ultimoPagoEn, proximoCobroEn: s.proximoCobroEn, proximoIntentoEn: s.proximoIntentoEn, intentosFallidos: s.intentosFallidos, cicloActual: s.cicloActual, hastaMes: s.adicionalesFacturadosHasta, error: s.ultimoError }) : "no existe");

  } else if (cmd === "limpiar") {
    const d = db(); const todos = await d.collection("tenants").where("esPrueba", "==", true).get();
    for (const t of todos.docs) { await refSus(d, t.id).delete().catch(() => {}); await t.ref.delete(); }
    console.log("Empresas de prueba borradas:", todos.size);

  } else {
    console.log("Comandos: credenciales | suscribir mensual|anual [plan] [visa|mc|mc2|mc3] | ciclo <tenantId> [fecha] | cobrar <tenantId> <usd> | cancelar <tenantId> | reembolsar <autorizacion> | estado <tenantId> | limpiar");
  }
})().catch((e) => { console.error("Error:", e.message); process.exit(1); });
