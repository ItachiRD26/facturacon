// Genera un certificado .p12 AUTOFIRMADO de PRUEBA — no es un certificado
// real emitido por ninguna entidad certificadora, solo sirve para probar en
// localhost el flujo de /onboarding/credenciales (parseo del .p12, cruce de
// RNC, cifrado con KMS). No tiene ninguna validez ante la DGII.
//
// Uso: node scripts/generar-p12-prueba.js <RNC> <password> [archivo-salida.p12]
//   RNC: 9 u 11 dígitos (sin guiones) — debe coincidir exactamente con el
//        RNC del tenant de prueba contra el que lo vayas a subir.

const forge = require("node-forge");
const fs = require("fs");

const [, , rncArg, password, archivoSalida] = process.argv;

if (!rncArg || !password) {
  console.error("Uso: node scripts/generar-p12-prueba.js <RNC> <password> [archivo-salida.p12]");
  process.exit(1);
}

const rnc = rncArg.replace(/\D/g, "");
if (rnc.length !== 9 && rnc.length !== 11) {
  console.error(`El RNC debe tener 9 u 11 dígitos (tiene ${rnc.length}).`);
  process.exit(1);
}

const keys = forge.pki.rsa.generateKeyPair(2048);
const cert = forge.pki.createCertificate();
cert.publicKey = keys.publicKey;
cert.serialNumber = "01";
cert.validity.notBefore = new Date();
cert.validity.notAfter = new Date();
cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);

// "serialNumber" aquí es el campo del Subject (OID 2.5.4.5) — es donde
// lib/dgii/xml-signer.ts → extraerRncDelCertificado() busca el RNC primero.
const attrs = [
  { name: "commonName", value: `PRUEBA ${rnc}` },
  { name: "countryName", value: "DO" },
  { name: "organizationName", value: "Certificado de prueba - SIN VALIDEZ" },
  { name: "serialNumber", value: rnc },
];

cert.setSubject(attrs);
cert.setIssuer(attrs);
cert.sign(keys.privateKey, forge.md.sha256.create());

const p12Asn1 = forge.pkcs12.toPkcs12Asn1(keys.privateKey, [cert], password, { algorithm: "3des" });
const p12Der = forge.asn1.toDer(p12Asn1).getBytes();

const salida = archivoSalida || `certificado-prueba-${rnc}.p12`;
fs.writeFileSync(salida, Buffer.from(p12Der, "binary"));

console.log(`✓ Generado: ${salida}`);
console.log(`  RNC incrustado: ${rnc}`);
console.log(`  Contraseña: ${password}`);
console.log(`  Recuerda: autofirmado, solo para pruebas en localhost.`);
