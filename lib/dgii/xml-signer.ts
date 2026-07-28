// Firmado de e-CF — XMLDSig con node-forge (carga del .p12) + xml-crypto (firma)
// Algoritmos exigidos por DGII: RSA-SHA256 + C14N 2001 + SHA256 digest + enveloped-signature
// (ver documentacion dgii/Firmado de e-CF.pdf)
//
// Esta es la versión confirmada en producción real (no la canonicalización C14N
// manual original, que pasó certificación pero falló en producción al firmar la
// Semilla que la propia DGII envía con indentación — ver
// documentacion-sistema-facturacion/LECCIONES-PRODUCCION-POST-CERTIFICACION.md,
// lección 11). El digest se calcula con un paso adicional (DgiiDigest) porque el
// validador de DGII espera la forma canonicalizada SIN nodos de texto de solo
// whitespace y con los atributos xmlns ordenados alfabéticamente — la
// canonicalización C14N estándar de xml-crypto no hace ninguna de las dos cosas,
// lo cual descuadra el DigestValue. Enfoque confirmado contra una implementación
// de terceros probada en producción (github.com/victors1681/dgii-ecf).
//
// A diferencia del código de referencia (single-tenant, certificado leído de
// disco/env): el .p12 y su contraseña NUNCA se leen de disco/env aquí — los
// recibe firmarXML() por parámetro, ya descifrados de KMS por el caller (ver
// lib/kms/p12-vault.ts). Esto evita que un solo certificado quede hardcodeado
// para todo el deployment: cada llamada firma con las credenciales del tenant
// correcto.

import * as forge      from "node-forge";
import * as crypto     from "crypto";
import { SignedXml }   from "xml-crypto";
import { DOMParser }   from "@xmldom/xmldom";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyNode = any;

// ── Carga del certificado P12 → PEM ───────────────────────────────────────────
export function loadCertAndKey(p12Buffer: Buffer, password: string): {
  privateKeyPem: string; certPem: string;
} {
  const derBytes = p12Buffer.toString("binary");
  const asn1     = forge.asn1.fromDer(derBytes);
  const p12      = forge.pkcs12.pkcs12FromAsn1(asn1, false, password);

  const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
  let   keyBag  = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0];
  if (!keyBag?.key) {
    const kb2 = p12.getBags({ bagType: forge.pki.oids.keyBag });
    keyBag    = kb2[forge.pki.oids.keyBag]?.[0] as typeof keyBag;
  }
  if (!keyBag?.key) throw new Error("No se pudo extraer la clave privada del .p12");

  const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
  const certBag  = certBags[forge.pki.oids.certBag]?.[0];
  if (!certBag?.cert) throw new Error("No se pudo extraer el certificado del .p12");

  const privateKeyPem = forge.pki.privateKeyToPem(keyBag.key as forge.pki.rsa.PrivateKey);
  const certPem       = forge.pki.certificateToPem(certBag.cert);

  return { privateKeyPem, certPem };
}

// Extrae el RNC/cédula del titular del certificado (Subject CN o serialNumber),
// usado en la Fase 4 para verificar que el .p12 subido corresponde al RNC
// declarado por el tenant, antes de cifrarlo y guardarlo.
export function extraerRncDelCertificado(p12Buffer: Buffer, password: string): string | null {
  const derBytes = p12Buffer.toString("binary");
  const asn1     = forge.asn1.fromDer(derBytes);
  const p12      = forge.pkcs12.pkcs12FromAsn1(asn1, false, password);
  const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
  const cert     = certBags[forge.pki.oids.certBag]?.[0]?.cert;
  if (!cert) return null;

  // node-forge no registra un "shortName" para el OID de serialNumber
  // (2.5.4.5) — cert.subject.getField("serialNumber") busca por shortName y
  // por eso nunca encuentra nada, incluso en certificados reales. Hay que
  // buscarlo directamente en el arreglo de atributos por OID/nombre.
  const serialNumberAttr = cert.subject.attributes.find(
    (a) => a.type === "2.5.4.5" || a.name === "serialNumber"
  );
  const cnAttr = cert.subject.getField("CN");
  const candidate = serialNumberAttr?.value ?? cnAttr?.value ?? "";
  const digits = candidate.replace(/\D/g, "");
  return digits.length === 9 || digits.length === 11 ? digits : null;
}

// Elimina comentarios y nodos de texto de solo whitespace (recursivo). Los
// documentos que arma nuestro propio xml-builder no tienen esos nodos, pero
// la Semilla que la DGII envía sí los trae (XML indentado) — sin esta
// limpieza, el DigestValue calculado no coincide con el que espera DGII.
function cleanNodes(node: AnyNode): void {
  for (let n = 0; n < node.childNodes.length; n++) {
    const child = node.childNodes[n];
    if (child.nodeType === 8 || (child.nodeType === 3 && !/\S/.test(child.nodeValue))) {
      node.removeChild(child);
      n--;
    } else if (child.nodeType === 1) {
      cleanNodes(child);
    }
  }
}

// Digest personalizado: re-parsea el XML ya canonicalizado/transformado por
// xml-crypto, ordena alfabéticamente los atributos xmlns del elemento raíz
// (DGII espera xsd antes de xsi, no el orden original del documento) y aplica
// SHA-256 sobre la serialización resultante.
class DgiiDigest {
  getHash(xml: string): string {
    const doc  = new DOMParser().parseFromString(xml, "text/xml") as AnyNode;
    const root = doc.childNodes[0] as AnyNode;
    const sorted = Array.from(root.attributes as ArrayLike<unknown>).sort((a, b) =>
      (a as string) < (b as string) ? -1 : (a as string) > (b as string) ? 1 : 0,
    );
    Object.assign(root.attributes, sorted);
    const shasum = crypto.createHash("sha256");
    shasum.update(doc.toString(), "utf8");
    return shasum.digest("base64");
  }
  getAlgorithmName(): string {
    return "http://www.w3.org/2001/04/xmlenc#sha256";
  }
}

// ── Firmado principal ─────────────────────────────────────────────────────────
export async function firmarXML(xmlOriginal: string, p12Buffer: Buffer, password: string): Promise<string> {
  const { privateKeyPem, certPem } = loadCertAndKey(p12Buffer, password);

  const doc = new DOMParser().parseFromString(xmlOriginal, "text/xml") as AnyNode;
  cleanNodes(doc);
  const rootName = doc.documentElement.tagName as string;

  const sig = new SignedXml({
    privateKey: privateKeyPem,
    publicCert: certPem,
    signatureAlgorithm: "http://www.w3.org/2001/04/xmldsig-more#rsa-sha256",
    canonicalizationAlgorithm: "http://www.w3.org/TR/2001/REC-xml-c14n-20010315",
  });

  // Registrado bajo una URI propia para que xml-crypto invoque nuestro
  // DgiiDigest en vez de su SHA-256 nativo — el <DigestMethod> resultante
  // sigue declarando la URI estándar via getAlgorithmName().
  sig.HashAlgorithms["http://dgii-digest"] = DgiiDigest;

  sig.addReference({
    xpath: `//*[local-name(.)='${rootName}']`,
    transforms: ["http://www.w3.org/2000/09/xmldsig#enveloped-signature"],
    digestAlgorithm: "http://dgii-digest",
    isEmptyUri: true,
  });

  sig.computeSignature(doc.toString(), {
    location: { reference: "/*", action: "append" },
  });

  return sig.getSignedXml();
}

// Alias para firmar la semilla de autenticación
export async function firmarSemilla(semillaXml: string, p12Buffer: Buffer, password: string): Promise<string> {
  return firmarXML(semillaXml, p12Buffer, password);
}

// Extrae <SignatureValue> de un XML ya firmado — lo necesita qr-builder.ts
// (calcularCodigoSeguridad toma los primeros 6 chars de este valor).
export function extraerSignatureValue(xmlFirmado: string): string {
  const match = xmlFirmado.match(/<SignatureValue>([^<]+)<\/SignatureValue>/);
  if (!match) throw new Error("El XML firmado no contiene SignatureValue");
  return match[1];
}
