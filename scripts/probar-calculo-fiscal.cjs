// Pruebas del cálculo fiscal (ITBIS incluido en el precio). Carga el código REAL del proyecto, no copias.
//   node scripts/probar-calculo-fiscal.cjs
//
// Qué comprueba:
//  A) Ejemplos conocidos, al centavo.
//  B) Equivalencia con la versión ANTERIOR cuando el precio NO incluye ITBIS (certificación, E41, exentos): idéntica.
//  C) Contra la fórmula de Soraya y Leonardo Tours / Hotel Gil (ya operando ante la DGII), miles de facturas al azar.
//  D) Invariantes y reglas de la DGII (Informe Técnico e-CF v1.0: tolerancia ±1 por línea y global = nº de líneas).
//  E) El XML real que se firma (buildXML / buildRFCEXml): cuadra al centavo con la suma de los precios.
//  F) Que la pantalla (types/index.ts) calcule exactamente lo mismo que el servidor.
const path = require("path");
const fs = require("fs");
const Module = require("module");
const ts = require("typescript");

const ROOT = path.resolve(__dirname, "..");
require.extensions[".ts"] = (m, filename) => {
  const out = ts.transpileModule(fs.readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true }, fileName: filename });
  m._compile(out.outputText, filename);
};
const resolverOriginal = Module._resolveFilename;
Module._resolveFilename = function (request, ...resto) {
  if (request.startsWith("@/")) {
    const base = path.join(ROOT, request.slice(2));
    for (const ext of [".ts", ".tsx", "/index.ts"]) if (fs.existsSync(base + ext)) return base + ext;
  }
  return resolverOriginal.call(this, request, ...resto);
};
const calc = require(path.join(ROOT, "lib/fiscal/calculo.ts"));
const xmlb = require(path.join(ROOT, "lib/dgii/xml-builder.ts"));
const tipos = require(path.join(ROOT, "types/index.ts"));

let fallos = 0, pruebas = 0, seccion = "?";
const porSeccion = {};
const ok = (cond, msg) => { pruebas++; if (!cond) { fallos++; porSeccion[seccion] = (porSeccion[seccion] || 0) + 1; if (porSeccion[seccion] <= 4) console.error("  ✗", msg); } };
const igual = (a, b, msg) => ok(a === b, `${msg}: obtuve ${a}, esperaba ${b}`);
// Se compara en centavos enteros: con montos de cientos de millones los decimales binarios engañan.
const cerca = (a, b, tol, msg) => ok(Math.abs(Math.round(a * 100) - Math.round(b * 100)) <= tol * 100 + 1e-6, `${msg}: ${a} vs ${b} (dif ${Math.abs(a - b).toFixed(4)} > ${tol})`);

// ── Generador reproducible
let semilla = 20261119;
const rnd = () => { semilla |= 0; semilla = (semilla + 0x6D2B79F5) | 0; let t = Math.imul(semilla ^ (semilla >>> 15), 1 | semilla); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const entre = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const cents = (c) => Math.round(c) / 100;
function lineaAzar(incluye) {
  const modo = rnd() < 0.85 ? "unidad" : rnd() < 0.5 ? "por_persona" : "por_grupo";
  const precio = cents(entre(50, rnd() < 0.1 ? 99_999_999 : 9_999_99));      // 0.50 … grandes, a centavos
  const cant = modo === "unidad" ? (rnd() < 0.6 ? entre(1, 12) : cents(entre(1, rnd() < 0.05 ? 500_000 : 50_000))) : 1;
  const pax = modo === "unidad" ? 0 : entre(1, 30);
  const bruto = modo === "por_grupo" ? precio : precio * (modo === "unidad" ? cant : pax);
  const descuentoMonto = rnd() < 0.3 ? cents(entre(0, Math.floor(bruto * 100))) : 0;
  const itbis = rnd() < 0.7 ? 0.18 : rnd() < 0.5 ? 0.16 : 0;
  return { codigo: "X", descripcion: "Línea de prueba", modo, cant, pax, precio, descuentoMonto, itbis, ...(incluye ? { incluyeITBIS: itbis > 0 } : {}) };
}
const facturaAzar = (incluye) => Array.from({ length: entre(1, 12) }, () => lineaAzar(incluye));
// Facturas cuyas líneas SÍ se pueden declarar con precisión (el servidor rechaza las demás con un mensaje claro).
const facturaDeclarable = () => { for (;;) { const f = facturaAzar(true); if (calc.lineaConPrecisionInsuficiente(f) < 0) return f; } };
const r2 = calc.r2;

// ══ A) Ejemplos conocidos ══
console.log("A) Ejemplos conocidos"); seccion = "A";
{
  const l = { codigo: "S", descripcion: "Servicio", modo: "unidad", cant: 1, pax: 0, precio: 12500, descuentoMonto: 0, itbis: 0.18, incluyeITBIS: true };
  const t = calc.totalesFiscales([l]);
  igual(t.gravadoI1, 10593.22, "12,500 al 18 %: base"); igual(t.itbis, 1906.78, "12,500 al 18 %: ITBIS"); igual(t.total, 12500, "12,500 al 18 %: total");
  const f = calc.lineaFiscal(l);
  igual(f.monto, 10593.22, "MontoItem"); igual(Math.round(f.precioU * 10000) / 10000, 10593.2203, "PrecioUnitarioItem sin ITBIS (4 decimales)");
  const c = calc.totalesFiscales([{ ...l, precio: 100 }]);
  igual(c.gravadoI1, 84.75, "100 al 18 %: base"); igual(c.itbis, 15.25, "100 al 18 %: ITBIS"); igual(c.total, 100, "100 al 18 %: total exacto (no 100.01)");
  const e = calc.totalesFiscales([{ ...l, precio: 500, itbis: 0, incluyeITBIS: false }]);
  igual(e.exento, 500, "Exento: monto"); igual(e.itbis, 0, "Exento: sin ITBIS"); igual(e.total, 500, "Exento: total");
  const x = calc.totalesFiscales([{ ...l, precio: 116, itbis: 0.16 }]);
  igual(x.gravadoI2, 100, "116 al 16 %: base"); igual(x.itbis2, 16, "116 al 16 %: ITBIS"); igual(x.total, 116, "116 al 16 %: total");
  const m = calc.totalesFiscales([{ ...l, precio: 118 }, { ...l, precio: 232, itbis: 0.16 }, { ...l, precio: 50, itbis: 0, incluyeITBIS: false }]);
  igual(m.total, 400, "Mixto 18 % + 16 % + exento: total = suma de precios");
  const d = calc.totalesFiscales([{ ...l, cant: 3, precio: 59, descuentoMonto: 17 }]);   // 3×59 = 177 − 17 = 160
  igual(d.total, 160, "Con descuento: total = cantidad × precio − descuento");
}

// ══ B) Sin ITBIS incluido: idéntico a la versión anterior ══
console.log("B) Equivalencia con la versión anterior (precio sin ITBIS incluido)"); seccion = "B";
{
  const L_r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
  const legacyLinea = (item) => {
    const cant = item.modo === "por_grupo" ? 1 : item.modo === "unidad" ? (item.cant || 1) : (item.pax || 1);
    const bruto = L_r2(cant * item.precio); const desc = Math.min(L_r2(item.descuentoMonto || 0), bruto);
    return { cant, precioU: item.precio, desc, monto: L_r2(bruto - desc), tasa: item.itbis || 0 };
  };
  const legacyTotales = (items, modo = "normal") => {
    let g1 = 0, g2 = 0, g3 = 0, ex = 0;
    for (const it of items) { const l = legacyLinea(it); if (modo === "exento") ex += l.monto; else if (modo === "tasa3") g3 += l.monto; else if (l.tasa === 0.18) g1 += l.monto; else if (l.tasa === 0.16) g2 += l.monto; else ex += l.monto; }
    g1 = L_r2(g1); g2 = L_r2(g2); g3 = L_r2(g3); ex = L_r2(ex);
    const itbis1 = L_r2(g1 * 0.18), itbis2 = L_r2(g2 * 0.16);
    return { gravadoI1: g1, gravadoI2: g2, gravadoI3: g3, exento: ex, itbis1, itbis2, itbis: L_r2(itbis1 + itbis2), total: L_r2(g1 + g2 + g3 + ex + itbis1 + itbis2) };
  };
  for (let i = 0; i < 15000; i++) {
    const items = facturaAzar(false);
    for (const modo of ["normal", "exento", "tasa3"]) {
      const a = calc.totalesFiscales(items, modo), b = legacyTotales(items, modo);
      for (const k of Object.keys(b)) if (a[k] !== b[k]) { ok(false, `modo ${modo}, ${k}: nuevo ${a[k]} ≠ anterior ${b[k]}`); break; }
    }
    for (const it of items) { const a = calc.lineaFiscal(it), b = legacyLinea(it); ok(a.cant === b.cant && a.precioU === b.precioU && a.desc === b.desc && a.monto === b.monto && a.tasa === b.tasa && a.incluye === false, "lineaFiscal sin ITBIS incluido difiere de la anterior"); }
  }
  // Marcar «incluido» con tasa 0 o en tipos exentos no debe cambiar nada
  const itemsEx = facturaAzar(false).map((x) => ({ ...x, itbis: 0, incluyeITBIS: true }));
  const aEx = calc.totalesFiscales(itemsEx), bEx = legacyTotales(itemsEx.map((x) => ({ ...x, incluyeITBIS: false })));
  igual(aEx.total, bEx.total, "tasa 0 con la marca puesta: sin efecto");
  for (const modo of ["exento", "tasa3"]) { const it = facturaAzar(true); igual(JSON.stringify(calc.totalesFiscales(it, modo)), JSON.stringify(legacyTotales(it.map((x) => ({ ...x, incluyeITBIS: false })), modo)), `modo ${modo} ignora la marca`); }
}

// ══ C) Contra la fórmula de Soraya / Hotel Gil (en producción ante la DGII) ══
console.log("C) Contra Soraya y Leonardo Tours / Hotel Gil"); seccion = "C";
let maxDifGrav = 0, maxDifItbis = 0, difTotal = 0;
{
  // Verbatim de soraya-tours-ecf/types/index.ts (calcLinea/calcTotales) y de hotelgil/lib/ecf-types.ts
  const vivoLinea = (item) => {
    const bruto = item.modo === "por_grupo" ? item.precio : item.precio * (item.modo === "unidad" ? item.cant : item.pax || 1);
    const descAmt = Math.min(item.descuentoMonto || 0, bruto);
    const neto = Math.max(0, bruto - descAmt);
    if (item.incluyeITBIS && item.itbis > 0) { const sub = neto / (1 + item.itbis); return { sub, itbisAmt: neto - sub, total: neto }; }
    return { sub: neto, itbisAmt: neto * (item.itbis || 0), total: neto + neto * (item.itbis || 0) };
  };
  for (let i = 0; i < 20000; i++) {
    const items = facturaDeclarable();
    const mio = calc.totalesFiscales(items);
    let sub = 0, itb = 0, tot = 0, grav = 0;
    for (const it of items) { const c = vivoLinea(it); sub += c.sub; itb += c.itbisAmt; tot += c.total; if (it.itbis > 0) grav += c.sub; }
    const vivoTotal = r2(tot), vivoItbis = r2(itb), vivoGrav = r2(grav);
    const n = items.length;
    const enteras = items.every((x) => x.modo !== "unidad" || Number.isInteger(x.cant));
    if (enteras) igual(mio.total, vivoTotal, "total idéntico al de los sistemas vivos (cantidades enteras)");
    else cerca(mio.total, vivoTotal, 0.005 * n + 0.0101, "total vs sistemas vivos (cantidades fraccionarias: redondeo por línea)");
    difTotal = Math.max(difTotal, Math.abs(mio.total - vivoTotal));
    const mioGrav = r2(mio.gravadoI1 + mio.gravadoI2);
    cerca(mioGrav, vivoGrav, 0.01 * n, "gravado vs sistemas vivos"); cerca(mio.itbis, vivoItbis, 0.01 * n, "ITBIS vs sistemas vivos");
    maxDifGrav = Math.max(maxDifGrav, Math.abs(mioGrav - vivoGrav)); maxDifItbis = Math.max(maxDifItbis, Math.abs(mio.itbis - vivoItbis));
  }
  console.log(`   diferencia máxima del total: ${difTotal.toFixed(2)} · del gravado: ${maxDifGrav.toFixed(2)} · del ITBIS: ${maxDifItbis.toFixed(2)} (en pesos)`);
}

// ══ D) Invariantes y tolerancias de la DGII ══
console.log("D) Invariantes y tolerancias de la DGII"); seccion = "D";
let maxLinea = 0, maxGlobal = 0, maxItbisVsGrav = 0;
{
  for (let i = 0; i < 20000; i++) {
    const items = facturaDeclarable();
    const t = calc.totalesFiscales(items), lineas = items.map(calc.lineaFiscal);
    const suma = r2(lineas.reduce((s, l) => s + l.neto, 0));
    igual(t.total, suma, "el total es exactamente la suma de lo que paga el cliente por cada línea");
    igual(r2(t.gravadoI1 + t.gravadoI2 + t.gravadoI3 + t.exento + t.itbis), t.total, "gravado + exento + ITBIS = total");
    ok(t.gravadoI1 >= 0 && t.gravadoI2 >= 0 && t.exento >= 0 && t.itbis1 >= 0 && t.itbis2 >= 0, "ningún monto negativo");
    igual(r2(lineas.filter((l) => l.tasa === 0.18).reduce((s, l) => s + l.monto, 0)), t.gravadoI1, "Σ MontoItem al 18 % = MontoGravadoI1");
    igual(r2(lineas.filter((l) => l.tasa === 0.16).reduce((s, l) => s + l.monto, 0)), t.gravadoI2, "Σ MontoItem al 16 % = MontoGravadoI2");
    let global = 0;
    for (const l of lineas) {
      const p4 = Math.round(l.precioU * 10000) / 10000;                   // lo que realmente se imprime en el XML
      const dif = Math.abs(l.cant * p4 - l.desc - l.monto);
      maxLinea = Math.max(maxLinea, dif); global += l.cant * p4 - l.desc - l.monto;
      ok(dif <= 1, `tolerancia por línea de la DGII (±1): ${dif.toFixed(3)}`);
    }
    maxGlobal = Math.max(maxGlobal, Math.abs(global) / items.length);
    ok(Math.abs(global) <= items.length, "tolerancia global de la DGII (± nº de líneas)");
    const d1 = Math.abs(t.itbis1 - r2(t.gravadoI1 * 0.18)), d2 = Math.abs(t.itbis2 - r2(t.gravadoI2 * 0.16));
    maxItbisVsGrav = Math.max(maxItbisVsGrav, d1, d2);
    ok(Math.round(d1 * 100) <= items.length && Math.round(d2 * 100) <= items.length, `ITBIS vs base × tasa dentro de 1 centavo por línea: d1=${d1.toFixed(4)} d2=${d2.toFixed(4)} n=${items.length}`);
  }
  console.log(`   mayor diferencia por línea: ${maxLinea.toFixed(4)} (tolerancia 1.00) · global por línea: ${maxGlobal.toFixed(4)} · ITBIS vs base×tasa: ${maxItbisVsGrav.toFixed(2)}`);
}

// ══ D2) Líneas con cantidad enorme: se detectan (y el servidor las rechaza con un mensaje) ══
console.log("D2) Cantidades enormes");
seccion = "D";
{
  const grande = { codigo: "G", descripcion: "Muchas unidades", modo: "unidad", cant: 500000, pax: 0, precio: 0.5, descuentoMonto: 0, itbis: 0.18, incluyeITBIS: true };
  ok(calc.lineaConPrecisionInsuficiente([grande]) === 0, "500,000 unidades a RD$0.50 se marca como no declarable");
  ok(calc.lineaConPrecisionInsuficiente([{ ...grande, cant: 5000 }]) < 0, "5,000 unidades sí se puede declarar");
  ok(calc.lineaConPrecisionInsuficiente([{ ...grande, cant: 500000, incluyeITBIS: false }]) < 0, "sin ITBIS incluido no aplica (comportamiento de siempre)");
  let aceptadas = 0, rechazadas = 0;
  for (let i = 0; i < 5000; i++) { const f = facturaAzar(true); if (calc.lineaConPrecisionInsuficiente(f) < 0) aceptadas++; else rechazadas++; }
  console.log(`   de 5,000 facturas al azar (con cantidades hasta 500,000), ${rechazadas} se rechazarían por precisión`);
}

// ══ E) El XML real ══
console.log("E) XML real (buildXML / buildRFCEXml)"); seccion = "E";
{
  const empresa = { nombre: "EMPRESA DE PRUEBA SRL", rnc: "000000002", direccion: "Calle 1", telefono: "8095550000", ambiente: "testecf", actividadEconomica: "Venta" };
  const num = (xml, tag) => [...xml.matchAll(new RegExp(`<${tag}>([\\d.]+)</${tag}>`, "g"))].map((m) => Number(m[1]));
  const un = (xml, tag) => { const v = num(xml, tag); return v.length ? v[0] : 0; };
  for (let i = 0; i < 400; i++) {
    const tipo = ["E31", "E32", "E33", "E34", "E45"][i % 5];
    const items = calc.conItbisIncluido(facturaDeclarable().map((x) => ({ ...x, incluyeITBIS: undefined })), tipo);
    if (calc.lineaConPrecisionInsuficiente(items) >= 0) continue;
    const total = calc.totalesFiscales(items).total;
    const base = { id: "t", noFactura: "1", eCF: tipo + "0000000001", tipoECF: tipo, fecha: "2026-11-19", vencimientoECF: "2027-12-31", terminos: "Contado", metodoPago: "Efectivo", clienteId: "c1", items, estado: "pendiente", modalidadPago: "unico", esConsumidorFinal: false, ...(tipo === "E33" || tipo === "E34" ? { eCFRef: "E310000000001", fechaECFRef: "2026-11-01", codigoModificacion: "1", motivoNota: "prueba" } : {}) };
    const cliente = { id: "c1", rnc: "131000003", nombre: "CLIENTE", tipoPersona: "juridica", direccion: "x", ciudad: "x", contacto: "", telefono: "" };
    let xml;
    try { xml = xmlb.buildXML(base, cliente, empresa); } catch (e) { ok(false, `buildXML ${tipo} lanzó: ${e.message}`); continue; }
    const montoItems = num(xml, "MontoItem");
    ok(montoItems.length === items.length, `${tipo}: un MontoItem por línea`);
    const grav = un(xml, "MontoGravadoTotal"), exe = un(xml, "MontoExento"), itb = un(xml, "TotalITBIS"), mt = un(xml, "MontoTotal");
    cerca(r2(grav + exe + itb), mt, 0.005, `${tipo}: MontoGravadoTotal + MontoExento + TotalITBIS = MontoTotal`);
    igual(mt, total, `${tipo}: MontoTotal = suma de los precios`);
    cerca(r2(montoItems.reduce((s, v) => s + v, 0)), r2(grav + exe), 0.005, `${tipo}: Σ MontoItem = gravado + exento`);
    // Cada ítem cumple Cantidad × Precio − Descuento = MontoItem (±1)
    const cants = num(xml, "CantidadItem"), precios = num(xml, "PrecioUnitarioItem");
    const itemsXml = [...xml.matchAll(/<Item>[\s\S]*?<\/Item>/g)].map((m) => m[0]);
    itemsXml.forEach((it, k) => { const d = un(it, "DescuentoMonto"); const dif = Math.abs(un(it, "CantidadItem") * un(it, "PrecioUnitarioItem") - d - un(it, "MontoItem")); ok(dif <= 1, `${tipo} ítem ${k + 1}: tolerancia por línea (${dif.toFixed(3)})`); });
    ok(!/<IndicadorMontoGravado>1</.test(xml), `${tipo}: IndicadorMontoGravado nunca en 1 (los montos van sin ITBIS)`);
    void cants; void precios;
  }
  // E32 pequeño → RFCE
  const items32 = calc.conItbisIncluido(facturaAzar(false).slice(0, 4).map((x) => ({ ...x, precio: Math.min(x.precio, 900), cant: Math.min(x.cant || 1, 3), descuentoMonto: 0 })), "E32");
  const f32 = { id: "t", noFactura: "1", eCF: "E320000000001", tipoECF: "E32", fecha: "2026-11-19", vencimientoECF: "2027-12-31", terminos: "Contado", metodoPago: "Efectivo", clienteId: "walk-in", esConsumidorFinal: true, nombreConsumidor: "CONSUMIDOR FINAL", items: items32, estado: "pendiente", modalidadPago: "unico" };
  try {
    const rf = xmlb.buildRFCEXml(f32, empresa, "ABC123");
    igual(un(rf, "MontoTotal"), calc.totalesFiscales(items32).total, "RFCE: MontoTotal = suma de los precios");
    cerca(r2(un(rf, "MontoGravadoTotal") + un(rf, "MontoExento") + un(rf, "TotalITBIS")), un(rf, "MontoTotal"), 0.005, "RFCE: gravado + exento + ITBIS = total");
  } catch (e) { ok(false, `buildRFCEXml lanzó: ${e.message}`); }
}

// ══ F) La pantalla calcula lo mismo que el servidor ══
console.log("F) Pantalla (types/index.ts) = servidor"); seccion = "F";
{
  for (let i = 0; i < 10000; i++) {
    const items = facturaDeclarable(), s = calc.totalesFiscales(items), c = tipos.calcTotales(items);
    igual(r2(c.total), s.total, "pantalla: total"); igual(r2(c.itbis), s.itbis, "pantalla: ITBIS"); igual(r2(c.sub), r2(s.gravadoI1 + s.gravadoI2 + s.gravadoI3 + s.exento), "pantalla: subtotal");
    igual(r2(c.sub + c.itbis), r2(c.total), "pantalla: subtotal + ITBIS = total");
    for (const it of items) { const l = tipos.calcLinea(it); if (it.itbis > 0) igual(r2(l.total), calc.lineaFiscal(it).neto, "pantalla: línea = lo que paga el cliente"); }
    for (const it of items) { const l = tipos.calcLinea(it); igual(r2(l.brutoFinal - l.descFinal), r2(l.total - (it.incluyeITBIS && it.itbis > 0 ? 0 : l.itbisAmt)), "impresión: cantidad × precio − descuento = importe de la línea"); }
  }
  // Sin la marca, la pantalla sigue como siempre (precio = base)
  const sinMarca = [{ codigo: "A", descripcion: "A", modo: "unidad", cant: 2, pax: 0, precio: 100, descuentoMonto: 0, itbis: 0.18 }];
  igual(r2(tipos.calcTotales(sinMarca).total), 236, "sin la marca: precio = base + ITBIS (comportamiento de siempre)");
}

if (fallos) console.error("Fallos por sección:", JSON.stringify(porSeccion));
console.log(`\n${fallos === 0 ? "✅ TODO CORRECTO" : "❌ HAY FALLOS"} — ${pruebas.toLocaleString("es-DO")} comprobaciones, ${fallos} fallo(s).`);
process.exit(fallos === 0 ? 0 : 1);
