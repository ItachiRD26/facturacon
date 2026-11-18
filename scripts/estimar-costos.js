// Estimación de costos e ingresos de Facturacon para 10 / 50 / 100 / 500 / 1000 clientes de pago.
// TODO son supuestos explícitos (ver SUP): cámbialos y vuelve a correr.
const SUP = {
  rdPorUsd: 60,
  // Mezcla de planes de los clientes (fracción) y su precio mensual (RD$, ITBIS incluido) y tope de comprobantes.
  mezcla: [
    { plan: "Emprendedor 100", frac: 0.40, rd: 690, tope: 100 },
    { plan: "250", frac: 0.25, rd: 1380, tope: 250 },
    { plan: "500", frac: 0.20, rd: 2320, tope: 500 },
    { plan: "1000", frac: 0.10, rd: 3890, tope: 1000 },
    { plan: "2000", frac: 0.05, rd: 6340, tope: 2000 },
  ],
  usoDelTope: 0.8,            // cuánto del tope usan en promedio
  fraccionAnual: 0.2,         // clientes que pagan anual (10 meses por 12)
  incobrable: 0.05,           // cobros que fallan y no se recuperan
  itbis: 0.18,
  comisionPasarela: 0.04,     // SUPUESTO (Pagadito no publica tarifa): confirmar con ellos
  // Uso del sistema por cliente
  usuariosActivos: 2.4, diasMes: 22, pantallasPorDia: 12,
  clientes: 250, productos: 400, cotizaciones: 60, cuentasCobrar: 60,
  kbPorFactura: 9,            // documento de factura con xmlFirmado (≈7 KB) y demás campos
  kbOtros: 1,                 // clientes, productos, etc.
  // Precios Google (nam5, Firestore Standard) — verificar en la consola de precios vigente
  leer100k: 0.06, escribir100k: 0.18, almacenamientoGiB: 0.18, egresoGiB: 0.12, egresoGratisGiB: 10,
  respaldoGiB: 0.10, copiasRespaldo: 21,   // diario 7 + semanal 14 (cota alta: si cada copia fuera completa)
  // Otros
  vercelBase: 20, vercelCpuHora: 0.128, vercelMemGbHora: 0.0106, vercelInvocMillon: 0.60, vercelInvocIncl: 1_000_000,
  kmsPor10k: 0.03, correoMes: 4,
};

const usoMensual = SUP.mezcla.reduce((s, m) => s + m.frac * m.tope * SUP.usoDelTope, 0);          // comprobantes/cliente/mes
const precioMedioIncl = SUP.mezcla.reduce((s, m) => s + m.frac * m.rd, 0);                           // RD$ con ITBIS
const factorAnual = (1 - SUP.fraccionAnual) + SUP.fraccionAnual * (10 / 12);
const brutoCliente = precioMedioIncl * factorAnual * (1 - SUP.incobrable);                           // RD$ cobrados (con ITBIS)
const netoCliente = brutoCliente / (1 + SUP.itbis);                                                 // RD$ sin ITBIS (ingreso real)
const cargasMes = SUP.usuariosActivos * SUP.diasMes * SUP.pantallasPorDia;                           // pantallas abiertas/cliente/mes
const sesionesMes = SUP.usuariosActivos * SUP.diasMes;                                               // sesiones/cliente/mes

// Mezcla de pantallas → qué colecciones lee cada una (hoy: TODA la colección, sin límite)
const lecturasPorPantalla = (H, opt) => {
  const f = opt ? Math.min(H, 100) : H;      // optimizado: solo los últimos 100 comprobantes
  const c = SUP.clientes, p = SUP.productos, q = SUP.cotizaciones, a = SUP.cuentasCobrar;
  const pantallas = [
    { peso: 0.35, fact: true,  otros: c + p + a },        // facturas
    { peso: 0.25, fact: true,  otros: c + p + q + a },    // dashboard
    { peso: 0.10, fact: false, otros: c },                // clientes
    { peso: 0.10, fact: false, otros: p },                // inventario
    { peso: 0.10, fact: true,  otros: c + p + q + a },    // cotizaciones
    { peso: 0.10, fact: false, otros: p },                // otras
  ];
  let docs = 0, kb = 0;
  for (const x of pantallas) { const nf = x.fact ? f : 0; docs += x.peso * (nf + x.otros); kb += x.peso * (nf * SUP.kbPorFactura + x.otros * SUP.kbOtros); }
  return { docs, kb };
};

function infra(N, edadMeses, opt) {
  const H = usoMensual * edadMeses;                       // comprobantes acumulados por cliente
  const L = lecturasPorPantalla(H, opt);
  // Lecturas del navegador: hoy en cada pantalla; optimizado: un listener compartido por sesión (no por pantalla) + cambios
  const aperturas = opt ? sesionesMes : cargasMes;
  const lecturasNavegador = N * aperturas * L.docs + (opt ? N * usoMensual * 3 : 0);
  const lecturasServidor = N * usoMensual * 6;            // emisión: secuencia, bloqueo, conteo, certificado, etc.
  const escrituras = N * (usoMensual * 8 + 100);           // por comprobante ≈ 8 escrituras (+ ediciones de clientes/productos)
  const costoLecturas = ((lecturasNavegador + lecturasServidor) / 100_000) * SUP.leer100k;
  const costoEscrituras = (escrituras / 100_000) * SUP.escribir100k;
  const gbEgreso = (N * aperturas * L.kb) / 1024 / 1024;
  const costoEgreso = Math.max(0, gbEgreso - SUP.egresoGratisGiB) * SUP.egresoGiB;
  const gbAlmacen = (N * H * SUP.kbPorFactura * 1.4) / 1024 / 1024;   // 1.4 = índices
  const costoAlmacen = gbAlmacen * SUP.almacenamientoGiB + gbAlmacen * SUP.copiasRespaldo * SUP.respaldoGiB;
  // Vercel
  const invoc = N * (usoMensual * 3 + cargasMes * 3);
  const cpuHoras = (N * usoMensual * 1.5) / 3600, memGbHoras = (N * usoMensual * 3) / 3600;
  const vercel = SUP.vercelBase + Math.max(0, invoc - SUP.vercelInvocIncl) / 1e6 * SUP.vercelInvocMillon + cpuHoras * SUP.vercelCpuHora + memGbHoras * SUP.vercelMemGbHora;
  const kms = (N * usoMensual / 10_000) * SUP.kmsPor10k + 0.06;
  const correo = SUP.correoMes;
  const total = costoLecturas + costoEscrituras + costoEgreso + costoAlmacen + vercel + kms + correo;
  return { H, lecturasNavegadorM: lecturasNavegador / 1e6, gbEgreso, costoLecturas, costoEscrituras, costoEgreso, gbAlmacen, costoAlmacen, vercel, kms, correo, total };
}

const usd = (n) => "$" + n.toLocaleString("en-US", { maximumFractionDigits: n < 100 ? 2 : 0 });
const rdf = (n) => "RD$" + Math.round(n).toLocaleString("en-US");
const NS = [10, 50, 100, 500, 1000];
console.log(`Supuestos derivados: ${usoMensual.toFixed(0)} comprobantes/cliente/mes · precio medio ${rdf(precioMedioIncl)} con ITBIS · cobrado ${rdf(brutoCliente)} · neto sin ITBIS ${rdf(netoCliente)} (${usd(netoCliente / SUP.rdPorUsd)}) · ${cargasMes.toFixed(0)} pantallas/mes · ${sesionesMes.toFixed(0)} sesiones/mes\n`);
const filas = [];
for (const N of NS) {
  const ing = N * netoCliente / SUP.rdPorUsd;                         // USD netos por mes
  const pasarela = N * brutoCliente / SUP.rdPorUsd * SUP.comisionPasarela;
  const a1 = infra(N, 6, false), a1o = infra(N, 6, true), a3 = infra(N, 30, false), a3o = infra(N, 30, true);
  filas.push({ N, ing, pasarela, a1, a1o, a3, a3o });
  console.log(`── ${N} clientes ──  ingreso neto ${usd(ing)}/mes (${rdf(ing * SUP.rdPorUsd)}) · pasarela ${usd(pasarela)}`);
  for (const [t, r] of [["HOY año 1", a1], ["OPTIMIZADO año 1", a1o], ["HOY año 3", a3], ["OPTIMIZADO año 3", a3o]]) {
    console.log(`   ${t.padEnd(17)} infra ${usd(r.total).padStart(7)} = lect ${usd(r.costoLecturas)} + escr ${usd(r.costoEscrituras)} + egreso ${usd(r.costoEgreso)} (${r.gbEgreso.toFixed(0)} GiB) + almac/resp ${usd(r.costoAlmacen)} (${r.gbAlmacen.toFixed(0)} GiB) + vercel ${usd(r.vercel)} + kms ${usd(r.kms)} · ${(r.total / ing * 100).toFixed(1)}% del ingreso · lecturas navegador ${r.lecturasNavegadorM.toFixed(0)} M`);
  }
}
if (process.env.ESTIMACION_JSON) require("fs").writeFileSync(process.env.ESTIMACION_JSON, JSON.stringify({ SUP, usoMensual, precioMedioIncl, brutoCliente, netoCliente, filas }, null, 1));
