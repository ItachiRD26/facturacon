import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { requerirRolPanel } from "@/lib/tenant/panel-acceso";
import { etiquetaAccion } from "@/lib/auditoria/etiquetas";
import { Card, PageHeader, Pill, th, td, tablaWrap, EmptyBlock } from "@/components/ui/kit";

// Bitácora de actividad de la empresa: quién hizo qué, cuándo y desde dónde. Solo dueño y administradores.
// Se lee en el servidor (las reglas de Firestore no dejan leerla desde el navegador).
export const dynamic = "force-dynamic";

interface Registro {
  id: string; uid: string; accion: string; recurso?: string; resultado: "ok" | "error";
  detalle?: Record<string, string | number | boolean | null>; ip?: string; creadoEn: string;
}

const fechaHora = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleString("es-DO", { timeZone: "America/Santo_Domingo", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true });
};

function resumenDetalle(d?: Record<string, string | number | boolean | null>): string {
  if (!d) return "";
  return Object.entries(d).filter(([, v]) => v !== null && v !== "").map(([k, v]) => `${k}: ${v}`).join(" · ");
}

export default async function ActividadPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  await requerirRolPanel(tenantId, ["owner", "admin"]);

  const snap = await adminDb.collection("tenants").doc(tenantId).collection("auditoria").orderBy("creadoEn", "desc").limit(200).get();
  const registros = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Registro, "id">) }));

  // Nombres de las personas (un solo viaje, máximo 100 a la vez).
  const uids = [...new Set(registros.map((r) => r.uid).filter((u) => u && u !== "sistema"))].slice(0, 100);
  const nombres = new Map<string, string>();
  if (uids.length) {
    const res = await adminAuth.getUsers(uids.map((uid) => ({ uid }))).catch(() => null);
    for (const u of res?.users ?? []) nombres.set(u.uid, u.displayName || u.email || "Usuario");
  }

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", fontFamily: "var(--font-sans)" }}>
      <PageHeader
        titulo="Actividad de la cuenta"
        descripcion="Registro de lo que se hace en tu empresa: quién, qué, cuándo y desde dónde. Sirve para dar trazabilidad y detectar usos indebidos. Se conserva 24 meses."
      />
      <Card padding={0}>
        {registros.length === 0 ? (
          <EmptyBlock titulo="Todavía no hay actividad registrada" texto="Aquí aparecerán las acciones importantes: certificados, equipo, secuencias, comprobantes y plan." />
        ) : (
          <div style={tablaWrap}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr><th style={th}>Fecha y hora</th><th style={th}>Persona</th><th style={th}>Acción</th><th style={th}>Detalle</th><th style={th}>IP</th></tr>
              </thead>
              <tbody>
                {registros.map((r) => (
                  <tr key={r.id}>
                    <td style={{ ...td, whiteSpace: "nowrap" }}>{fechaHora(r.creadoEn)}</td>
                    <td style={td}>{r.uid === "sistema" ? "Sistema" : nombres.get(r.uid) ?? "Usuario"}</td>
                    <td style={td}>{etiquetaAccion(r.accion)} {r.resultado === "error" && <Pill tono="danger">Falló</Pill>}</td>
                    <td style={{ ...td, color: "var(--c-text-3)", fontSize: 12 }}>{[r.recurso, resumenDetalle(r.detalle)].filter(Boolean).join(" · ")}</td>
                    <td style={{ ...td, color: "var(--c-text-3)", fontSize: 12, whiteSpace: "nowrap" }}>{r.ip && r.ip !== "desconocida" ? r.ip : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <p style={{ fontSize: 12, color: "var(--c-text-3)", marginTop: 12 }}>Se muestran los últimos 200 eventos.</p>
    </div>
  );
}
