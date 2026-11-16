import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth }      from "firebase-admin/auth";
import { getStorage }   from "firebase-admin/storage";

let adminApp: App;

if (!getApps().length) {
  adminApp = initializeApp({
    credential: cert({
      projectId:   process.env.FIREBASE_PROJECT_ID!,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
      privateKey:  process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n")!,
    }),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
} else {
  adminApp = getApps()[0];
}

export const adminDb      = getFirestore(adminApp);
// Los campos opcionales vacíos (undefined) se omiten en vez de lanzar error:
// sin esto, guardar un objeto con un campo sin valor hacía fallar la ruta con
// una respuesta vacía. settings() solo puede llamarse una vez por instancia
// (en desarrollo el módulo se recarga), por eso va protegido.
try { adminDb.settings({ ignoreUndefinedProperties: true }); } catch { /* ya configurado */ }
export const adminAuth    = getAuth(adminApp);
export const adminStorage = getStorage(adminApp);
