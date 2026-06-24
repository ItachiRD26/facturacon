// Cifra/descifra el certificado .p12 (y su contraseña) de cada tenant con
// Google Cloud KMS. El ciphertext se guarda en
// tenants/{tenantId}/config/certificado — nunca el .p12 en claro.
//
// Una sola key compartida (projects/sass-facturacion/locations/us/keyRings/
// facturacon/cryptoKeys/p12-vault) con el tenantId como AAD (additionalAuthenticatedData):
// KMS rechaza el descifrado si el AAD no coincide exactamente, así que un
// ciphertext robado de un tenant no puede descifrarse usando el tenantId de
// otro, sin necesitar una key física por tenant.
import "server-only";
import { KeyManagementServiceClient } from "@google-cloud/kms";
import { adminDb } from "@/lib/firebase-admin";

let client: KeyManagementServiceClient | null = null;
function getClient(): KeyManagementServiceClient {
  // Reusa la misma service account de Firebase Admin (FIREBASE_PROJECT_ID/
  // CLIENT_EMAIL/PRIVATE_KEY) en vez de depender de Application Default
  // Credentials — `gcloud auth login` (cuenta de usuario) no es lo mismo que
  // `gcloud auth application-default login`, y esta service account ya tiene
  // el rol cloudkms.cryptoKeyEncrypterDecrypter otorgado sobre la key.
  if (!client) {
    client = new KeyManagementServiceClient({
      projectId: process.env.FIREBASE_PROJECT_ID,
      credentials: {
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        private_key:  process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      },
    });
  }
  return client;
}

function keyName(): string {
  const c = getClient();
  return c.cryptoKeyPath(
    process.env.KMS_PROJECT_ID!,
    process.env.KMS_LOCATION!,
    process.env.KMS_KEY_RING!,
    process.env.KMS_KEY_NAME!,
  );
}

async function encrypt(plaintext: Buffer, tenantId: string): Promise<string> {
  const [res] = await getClient().encrypt({
    name: keyName(),
    plaintext,
    additionalAuthenticatedData: Buffer.from(tenantId),
  });
  if (!res.ciphertext) throw new Error("KMS no devolvió ciphertext");
  return Buffer.from(res.ciphertext as Uint8Array).toString("base64");
}

async function decrypt(ciphertextB64: string, tenantId: string): Promise<Buffer> {
  const [res] = await getClient().decrypt({
    name: keyName(),
    ciphertext: Buffer.from(ciphertextB64, "base64"),
    additionalAuthenticatedData: Buffer.from(tenantId),
  });
  if (!res.plaintext) throw new Error("KMS no devolvió plaintext");
  return Buffer.from(res.plaintext as Uint8Array);
}

export interface CertificadoGuardado {
  p12Ciphertext:       string;
  passwordCiphertext:  string;
  fingerprint:         string;
  subidoEn:            string;
}

// Cifra el .p12 + password y los guarda en tenants/{tenantId}/config/certificado.
export async function guardarCertificado(
  tenantId: string, p12Buffer: Buffer, password: string, fingerprint: string,
): Promise<void> {
  const [p12Ciphertext, passwordCiphertext] = await Promise.all([
    encrypt(p12Buffer, tenantId),
    encrypt(Buffer.from(password, "utf8"), tenantId),
  ]);
  const data: CertificadoGuardado = {
    p12Ciphertext, passwordCiphertext, fingerprint,
    subidoEn: new Date().toISOString(),
  };
  await adminDb.collection("tenants").doc(tenantId).collection("config").doc("certificado").set(data);
}

// Descifra el .p12 + password de un tenant. Server-only, se invoca justo
// antes de firmar y el buffer no debe persistirse ni serializarse a ninguna
// respuesta HTTP.
export async function obtenerCertificado(tenantId: string): Promise<{ p12Buffer: Buffer; password: string }> {
  const snap = await adminDb.collection("tenants").doc(tenantId).collection("config").doc("certificado").get();
  if (!snap.exists) throw new Error(`Tenant ${tenantId} no tiene certificado .p12 guardado`);
  const data = snap.data() as CertificadoGuardado;

  const [p12Buffer, passwordBuffer] = await Promise.all([
    decrypt(data.p12Ciphertext, tenantId),
    decrypt(data.passwordCiphertext, tenantId),
  ]);
  return { p12Buffer, password: passwordBuffer.toString("utf8") };
}
