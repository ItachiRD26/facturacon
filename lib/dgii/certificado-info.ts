// Lee los datos PÚBLICOS de un certificado .p12 (titular, quién lo emitió, fechas de validez).
// Nada de esto es secreto: sirve para mostrar el estado del certificado y avisar antes de que venza.
import "server-only";
import * as forge from "node-forge";
import { createHash } from "crypto";
import { extraerRncDelCertificado } from "./xml-signer";

export interface InfoCertificado {
  titular: string;        // nombre del titular (CN)
  emisor: string;         // entidad que lo emitió (p. ej. Cámara de Comercio)
  rnc: string | null;     // RNC o cédula que lleva el certificado
  validoDesde: string;    // ISO
  venceEn: string;        // ISO
  fingerprint: string;    // 16 caracteres del hash del archivo (identifica "cuál" certificado es)
}

const campo = (attrs: forge.pki.CertificateField[], ...nombres: string[]) =>
  attrs.find((a) => nombres.includes(String(a.shortName)) || nombres.includes(String(a.name)))?.value as string | undefined;

export function leerInfoCertificado(p12Buffer: Buffer, password: string): InfoCertificado {
  const p12 = forge.pkcs12.pkcs12FromAsn1(forge.asn1.fromDer(p12Buffer.toString("binary")), false, password);
  const cert = p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag]?.[0]?.cert;
  if (!cert) throw new Error("El archivo no trae un certificado");
  return {
    titular: campo(cert.subject.attributes, "CN", "commonName") ?? "—",
    emisor: campo(cert.issuer.attributes, "O", "organizationName") ?? campo(cert.issuer.attributes, "CN", "commonName") ?? "—",
    rnc: extraerRncDelCertificado(p12Buffer, password),
    validoDesde: cert.validity.notBefore.toISOString(),
    venceEn: cert.validity.notAfter.toISOString(),
    fingerprint: createHash("sha256").update(p12Buffer).digest("hex").slice(0, 16).toUpperCase(),
  };
}

export type EstadoCertificado = "vigente" | "por_vencer" | "vencido";
export const DIAS_AVISO = 60; // desde cuántos días antes se marca "por vencer"

export function estadoPorFecha(venceEnISO: string, ahora = new Date()): { estado: EstadoCertificado; dias: number } {
  const dias = Math.floor((new Date(venceEnISO).getTime() - ahora.getTime()) / 86_400_000);
  return { estado: dias < 0 ? "vencido" : dias <= DIAS_AVISO ? "por_vencer" : "vigente", dias };
}
