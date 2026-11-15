import "server-only";
import * as cheerio from "cheerio";
import https from "node:https";
import dns from "node:dns";

export interface ResultadoConsultaDGII {
  valid:  boolean;
  name?:  string;
  rnc?:   string;
  estado?: string | null;
  activo?: boolean | null;
  error?: string;
  // Texto literal que la propia DGII muestra en su portal cuando no
  // encuentra el RNC/cédula (ej. "El RNC/Cédula consultado no se encuentra
  // inscrito como Contribuyente.") — capturado del span
  // #cphMain_lblInformacion, en vez de que nosotros inventemos nuestra
  // propia redacción del motivo del rechazo.
  mensajeDgii?: string;
}

// Consulta el padrón público de la DGII por RNC o cédula (el mismo
// formulario acepta ambos en el campo txtRNCCedula). Usado por
// /api/validate-rnc (RNC de la empresa, en el onboarding) y por
// /api/onboarding/completar-requisitos (cédula del representante, Fase 4) —
// extraído a un solo lugar para no duplicar el scraping ni hacer una
// llamada HTTP de un route handler a otro.
// El portal de la DGII es lento y desconfía de clientes que no parecen un navegador:
// sin `User-Agent` deja la conexión colgada ~10 s hasta que Node la corta (lo
// comprobamos: la misma URL responde 200 con la cabecera y "Connect Timeout" sin
// ella). El proyecto de Soraya, que lo usa en producción, resolvió lo mismo con
// cabeceras de navegador en las DOS consultas + reintentos.
const DGII_HOST = "dgii.gov.do";
const DGII_RUTA = "/app/WebApps/ConsultasWeb2/ConsultasWeb/consultas/rnc.aspx";
const CABECERAS_NAVEGADOR = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
  "Cache-Control": "no-cache",
};
// Tope por intento, contando DNS + conexión + respuesta. Con 1 reintento por
// consulta y dos consultas, el peor caso queda dentro de maxDuration (60 s).
const TIEMPO_MAX_MS = 14_000;
const REINTENTOS = 1;

// Medimos en la práctica que la resolución de DNS de dgii.gov.do puede tardar ~11 s
// la primera vez (y luego 30 ms), y el fetch de Node la contaba dentro de su tope de
// conexión de 10 s: la consulta fallaba aunque el portal respondiera bien. Aquí se
// resuelve solo por IPv4 (sin esperar el AAAA) y se recuerda la dirección unos
// minutos, así el DNS lento solo cuenta una vez.
let ipDGII: { ip: string; hasta: number } | null = null;
const TTL_IP_MS = 10 * 60 * 1000;

function resolverDGII(
  host: string,
  opciones: dns.LookupOptions,
  cb: (err: NodeJS.ErrnoException | null, direccion: string | dns.LookupAddress[], familia?: number) => void,
) {
  const entregar = (ip: string) => (opciones.all ? cb(null, [{ address: ip, family: 4 }]) : cb(null, ip, 4));
  if (ipDGII && ipDGII.hasta > Date.now()) return entregar(ipDGII.ip);
  dns.lookup(host, { family: 4 }, (err, address) => {
    if (err) return cb(err, "");
    ipDGII = { ip: address, hasta: Date.now() + TTL_IP_MS };
    entregar(address);
  });
}

function unaPeticion(init: { method?: string; headers?: Record<string, string>; body?: string }): Promise<{ status: number; text: string }> {
  return new Promise((resolve, reject) => {
    const cuerpo = init.body;
    const req = https.request({
      host: DGII_HOST, path: DGII_RUTA, method: init.method ?? "GET", family: 4,
      lookup: resolverDGII as unknown as typeof dns.lookup,
      signal: AbortSignal.timeout(TIEMPO_MAX_MS),
      headers: {
        ...CABECERAS_NAVEGADOR, ...init.headers,
        ...(cuerpo ? { "Content-Length": String(Buffer.byteLength(cuerpo)) } : {}),
      },
    }, (res) => {
      const trozos: Buffer[] = [];
      res.on("data", (c: Buffer) => trozos.push(c));
      res.on("end", () => resolve({ status: res.statusCode ?? 0, text: Buffer.concat(trozos).toString("utf8") }));
      res.on("error", reject);
    });
    req.on("error", reject);
    if (cuerpo) req.write(cuerpo);
    req.end();
  });
}

async function fetchDGII(init: { method?: string; headers?: Record<string, string>; body?: string }) {
  let ultimo: unknown;
  for (let intento = 0; intento <= REINTENTOS; intento++) {
    try { return await unaPeticion(init); }
    catch (e) {
      ultimo = e;
      if (intento < REINTENTOS) await new Promise((r) => setTimeout(r, 1000));
    }
  }
  throw ultimo;
}

export async function consultarRncODGII(numero: string): Promise<ResultadoConsultaDGII> {
  const number = numero.replace(/[^0-9]/g, "");
  if (!number) return { valid: false, error: "Número no proporcionado" };

  try {
    const htmlForm = (await fetchDGII({})).text;
    const $form    = cheerio.load(htmlForm);

    const viewState          = $form("#__VIEWSTATE").val()          || "";
    const eventValidation    = $form("#__EVENTVALIDATION").val()    || "";
    const viewStateGenerator = $form("#__VIEWSTATEGENERATOR").val() || "";

    // Si el portal contestó con otra cosa (bloqueo, página de error), no hay tokens:
    // se dice claro en vez de enviar un formulario vacío y devolver "no encontrado".
    if (!viewState || !eventValidation) {
      return { valid: false, error: "No pudimos leer el formulario de la DGII ahora. Intenta de nuevo en un momento." };
    }

    const response = await fetchDGII(
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          "__EVENTTARGET":                 "",
          "__EVENTARGUMENT":               "",
          "__VIEWSTATE":                   viewState.toString(),
          "__VIEWSTATEGENERATOR":          viewStateGenerator.toString(),
          "__EVENTVALIDATION":             eventValidation.toString(),
          "ctl00$cphMain$hidActiveTab":    "rnc",
          "ctl00$cphMain$txtRNCCedula":    number,
          "ctl00$cphMain$btnBuscarPorRNC": "BUSCAR",
        }).toString(),
      }
    );

    const html = response.text;
    const $    = cheerio.load(html);

    const name = $("#cphMain_dvDatosContribuyentes td")
      .filter((_i, el) => $(el).text().trim() === "Nombre/Razón Social")
      .next().text().trim();

    const rncResult = $("#cphMain_dvDatosContribuyentes td")
      .filter((_i, el) => $(el).text().trim() === "Cédula/RNC")
      .next().text().trim();

    const estado = $("#cphMain_dvDatosContribuyentes td")
      .filter((_i, el) => $(el).text().trim() === "Estado")
      .next().text().trim();

    if (name && rncResult) {
      return {
        valid: true, name,
        rnc: rncResult.replace(/[^0-9]/g, ""),
        estado: estado || null,
        activo: estado ? estado.toUpperCase().includes("ACTIVO") : null,
      };
    }

    const mensajeDgii = $("#cphMain_lblInformacion").text().trim() || undefined;
    return { valid: false, mensajeDgii };
  } catch (error) {
    console.error("❌ Error al consultar DGII:", error);
    // El tiempo agotado llega de varias formas: nuestro AbortSignal.timeout, o el
    // "ConnectTimeoutError" de undici dentro de `cause` cuando el portal no contesta.
    const causa = error instanceof Error ? (error as Error & { cause?: { name?: string; code?: string } }).cause : undefined;
    const agotado = error instanceof Error && (
      /timeout|abort/i.test(error.name) || /timeout/i.test(`${causa?.name ?? ""} ${causa?.code ?? ""}`) ||
      ["ETIMEDOUT", "ECONNRESET", "ECONNABORTED"].includes((error as NodeJS.ErrnoException).code ?? "")
    );
    return { valid: false, error: agotado ? "La DGII tardó demasiado en responder. Intenta de nuevo en un momento." : "Error al consultar DGII" };
  }
}
