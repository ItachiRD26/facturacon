// Construye el XML de Aprobación Comercial (ACECF) — documento aparte del
// e-CF, con su propio root <ACECF>. Reutiliza firmarXML() de xml-signer.ts
// sin cambios: detecta el tag raíz por regex, así que firma este XML igual
// que firma un <ECF>.
import "server-only";
import type { ItemAC } from "./tipos";

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function buildACECFXml(item: ItemAC): string {
  const motivoTag = item.estado === 2 && item.motivoRechazo
    ? `<DetalleMotivoRechazo>${escapeXml(item.motivoRechazo.substring(0, 250))}</DetalleMotivoRechazo>`
    : "";

  return [
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`,
    `<ACECF>`,
    `<DetalleAprobacionComercial>`,
    `<Version>1.0</Version>`,
    `<RNCEmisor>${escapeXml(item.rncEmisor)}</RNCEmisor>`,
    `<eNCF>${escapeXml(item.encf)}</eNCF>`,
    `<FechaEmision>${escapeXml(item.fechaEmision)}</FechaEmision>`,
    `<MontoTotal>${item.montoTotal.toFixed(2)}</MontoTotal>`,
    `<RNCComprador>${escapeXml(item.rncComprador)}</RNCComprador>`,
    `<Estado>${item.estado}</Estado>`,
    motivoTag,
    `<FechaHoraAprobacionComercial>${escapeXml(item.fechaHoraAC)}</FechaHoraAprobacionComercial>`,
    `</DetalleAprobacionComercial>`,
    `</ACECF>`,
  ].filter(Boolean).join("");
}
