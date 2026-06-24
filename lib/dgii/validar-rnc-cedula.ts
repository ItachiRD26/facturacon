import "server-only";
import * as cheerio from "cheerio";

export interface ResultadoConsultaDGII {
  valid:  boolean;
  name?:  string;
  rnc?:   string;
  estado?: string | null;
  activo?: boolean | null;
  error?: string;
}

// Consulta el padrón público de la DGII por RNC o cédula (el mismo
// formulario acepta ambos en el campo txtRNCCedula). Usado por
// /api/validate-rnc (RNC de la empresa, en el onboarding) y por
// /api/onboarding/completar-requisitos (cédula del representante, Fase 4) —
// extraído a un solo lugar para no duplicar el scraping ni hacer una
// llamada HTTP de un route handler a otro.
export async function consultarRncODGII(numero: string): Promise<ResultadoConsultaDGII> {
  const number = numero.replace(/[^0-9]/g, "");
  if (!number) return { valid: false, error: "Número no proporcionado" };

  try {
    const formPage = await fetch(
      "https://dgii.gov.do/app/WebApps/ConsultasWeb2/ConsultasWeb/consultas/rnc.aspx"
    );
    const htmlForm = await formPage.text();
    const $form    = cheerio.load(htmlForm);

    const viewState          = $form("#__VIEWSTATE").val()          || "";
    const eventValidation    = $form("#__EVENTVALIDATION").val()    || "";
    const viewStateGenerator = $form("#__VIEWSTATEGENERATOR").val() || "";

    const response = await fetch(
      "https://dgii.gov.do/app/WebApps/ConsultasWeb2/ConsultasWeb/consultas/rnc.aspx",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
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

    const html = await response.text();
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
    return { valid: false };
  } catch (error) {
    console.error("❌ Error al consultar DGII:", error);
    return { valid: false, error: "Error al consultar DGII" };
  }
}
