import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { estadoPorFecha } from "@/lib/dgii/certificado-info";
import { enviarPlantilla } from "@/lib/email/enviar";
import { datosDestinatario } from "@/lib/payments/cobros";

// Aviso por correo al dueño cuando el certificado digital (.p12) está por vencer o ya venció. Un certificado vencido
// detiene toda la emisión de la empresa, así que se avisa a los 60, 30, 15, 7, 3 y 1 días, y una vez al vencer.
// Se llama desde el cron diario de cobros (no consume un cron más). Cada umbral se avisa UNA sola vez: se anota el
// último umbral avisado en el documento del certificado; al renovarlo (otra fecha de vencimiento lejana) se reinicia.
const UMBRALES = [60, 30, 15, 7, 3, 1];

const fecha = (iso: string) => new Date(iso).toLocaleDateString("es-DO", { timeZone: "America/Santo_Domingo", day: "2-digit", month: "2-digit", year: "numeric" });

export async function avisarCertificadosPorVencer(tenantIds: string[]): Promise<{ revisados: number; avisados: number }> {
  const r = { revisados: 0, avisados: 0 };
  for (const id of tenantIds) {
    try {
      const ref = adminDb.collection("tenants").doc(id).collection("config").doc("certificado");
      const d = (await ref.get()).data() as { venceEn?: string; ultimoAvisoUmbral?: number } | undefined;
      if (!d?.venceEn) continue;
      r.revisados++;
      const { dias } = estadoPorFecha(d.venceEn);
      // 0 = ya venció; si falta más que el primer umbral, no hay aviso (y se limpia la marca por si se renovó).
      const umbral = dias < 0 ? 0 : UMBRALES.slice().reverse().find((u) => dias <= u);
      if (umbral === undefined) {
        if (d.ultimoAvisoUmbral !== undefined) await ref.set({ ultimoAvisoUmbral: FieldValue.delete() }, { merge: true });
        continue;
      }
      if (d.ultimoAvisoUmbral !== undefined && d.ultimoAvisoUmbral <= umbral) continue;   // ya se avisó este umbral (o uno más cercano)

      const dest = await datosDestinatario(id);
      if (!dest) continue;
      const res = umbral === 0
        ? await enviarPlantilla("certificado_vencido", { nombre: dest.nombre, negocio: dest.negocio, fechaVencio: fecha(d.venceEn) }, { para: dest.email })
        : await enviarPlantilla("certificado_por_vencer", { nombre: dest.nombre, negocio: dest.negocio, dias: Math.max(dias, 0), fechaVence: fecha(d.venceEn) }, { para: dest.email });
      if (res.enviado) { await ref.set({ ultimoAvisoUmbral: umbral }, { merge: true }); r.avisados++; }
    } catch (e) {
      console.error(`[avisos-certificado][${id}]`, e instanceof Error ? e.message : e);
    }
  }
  return r;
}
