// Simulador de envío/respuesta DGII para el entorno de prueba (sandbox) del
// onboarding — el tenant todavía no tiene certificado .p12 ni RNC habilitado
// como emisor electrónico en este punto del flujo, así que no se puede (ni
// se debe) llamar a `lib/dgii/dgii-client.ts` real, ni siquiera al ambiente
// `certecf`/`testecf`. Este módulo "simula" el ciclo firma → envío →
// aceptación → QR por completo en el navegador, sin red, para que el
// prospecto vea cómo se vería su factura ya certificada de verdad.
//
// El QR generado NO apunta a los dominios reales de la DGII (ecf.dgii.gov.do
// / fc.dgii.gov.do) para no producir un comprobante que aparente ser un
// timbre fiscal real — apunta a una página propia que aclara que es una
// demostración.

export interface ResultadoSimulado {
  trackIdDGII:     string;
  estadoDGII:      "Aceptado";
  codigoSeguridad: string;
  urlQR:           string;
  fechaEnvioDGII:  string;
}

function randomAlfanumerico(largo: number): string {
  const alfabeto = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < largo; i++) out += alfabeto[Math.floor(Math.random() * alfabeto.length)];
  return out;
}

export function generarCodigoSeguridadDemo(): string {
  return randomAlfanumerico(6);
}

export function generarTrackIdDemo(): string {
  return `DEMO-${Date.now().toString(36).toUpperCase()}-${randomAlfanumerico(8)}`;
}

interface ParamsQRDemo {
  rncEmisor:    string;
  nombreEmisor: string;
  eNCF:         string;
  tipoECF:      string;
  montoTotal:   number;
  fechaEmision: string;
  codigoSeguridad: string;
}

export function construirUrlQRDemo(params: ParamsQRDemo, rootDomain: string): string {
  const protocolo = rootDomain.startsWith("localhost") ? "http" : "https";
  const qs = new URLSearchParams({
    rncEmisor: params.rncEmisor,
    nombreEmisor: params.nombreEmisor,
    encf: params.eNCF,
    tipoECF: params.tipoECF,
    monto: params.montoTotal.toFixed(2),
    fecha: params.fechaEmision,
    codigoSeguridad: params.codigoSeguridad,
  });
  return `${protocolo}://${rootDomain}/demo/comprobante?${qs.toString()}`;
}

// Simula la latencia real de un envío a la DGII (semilla → token → envío →
// polling de TrackId) para que la experiencia de "emitir" se sienta real,
// sin que ninguna llamada salga del proceso de Node.
export async function simularEmisionECF(input: {
  rncEmisor: string; nombreEmisor: string; eNCF: string; tipoECF: string;
  montoTotal: number; fechaEmision: string; rootDomain: string;
}): Promise<ResultadoSimulado> {
  await new Promise((r) => setTimeout(r, 900));
  const codigoSeguridad = generarCodigoSeguridadDemo();
  return {
    trackIdDGII: generarTrackIdDemo(),
    estadoDGII: "Aceptado",
    codigoSeguridad,
    urlQR: construirUrlQRDemo({ ...input, codigoSeguridad }, input.rootDomain),
    fechaEnvioDGII: new Date().toISOString(),
  };
}
