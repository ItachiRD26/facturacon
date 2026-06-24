import SiteHeader from "@/components/marketing/site-header";
import SiteFooter from "@/components/marketing/site-footer";

const secciones = [
  {
    t: "1. Qué datos recopilamos",
    p: "Datos de cuenta (correo, nombre), datos de tu empresa (RNC, razón social, dirección), y los datos operativos que ingreses al sistema (clientes, productos, facturas). En el entorno de prueba, estos datos son de ejemplo y no representan operaciones reales.",
  },
  {
    t: "2. Certificados de firma digital",
    p: "Tu certificado de firma digital (.p12) y su contraseña se cifran antes de almacenarse, usando un servicio de gestión de llaves (Google Cloud KMS). Nunca se almacenan en texto plano ni se exponen a otros contribuyentes de la plataforma.",
  },
  {
    t: "3. Para qué usamos tus datos",
    p: "Para operar tu sistema de facturación, comunicarnos contigo sobre tu cuenta y tu proceso de certificación, y cumplir con nuestras obligaciones frente a la DGII como facilitador del proceso de emisión electrónica.",
  },
  {
    t: "4. Con quién compartimos datos",
    p: "Con la DGII, en la medida necesaria para tu certificación y la emisión de tus comprobantes fiscales electrónicos una vez certificado. No vendemos tus datos a terceros.",
  },
  {
    t: "5. Aislamiento entre contribuyentes",
    p: "Los datos de cada empresa están separados lógicamente del resto de los contribuyentes de la plataforma; el acceso requiere pertenecer a esa empresa.",
  },
  {
    t: "6. Tus derechos",
    p: "Puedes solicitar la corrección o eliminación de tus datos de cuenta escribiéndonos a contacto@facturacon.cfd.",
  },
];

export default function PrivacidadPage() {
  return (
    <>
      <SiteHeader />
      <main style={{ fontFamily: "var(--font-sans)", maxWidth: 720, margin: "0 auto", padding: "48px 24px 72px" }}>
        <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "1.8rem", marginBottom: 8 }}>
          Política de privacidad
        </h1>
        <p style={{ fontSize: 12, color: "var(--c-text-3)", marginBottom: 28 }}>
          Última actualización: borrador inicial — pendiente de revisión legal.
        </p>

        <div style={{
          padding: 14, background: "var(--c-yellow-bg)", border: "1px solid var(--c-yellow-border)",
          borderRadius: 6, fontSize: 12, marginBottom: 32,
        }}>
          Este texto es una plantilla orientativa y todavía no ha sido revisado por un abogado.
          No debe considerarse asesoría legal ni publicarse en producción sin esa revisión.
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {secciones.map((s) => (
            <section key={s.t}>
              <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>{s.t}</h2>
              <p style={{ fontSize: 13, color: "var(--c-text-2)", lineHeight: 1.6 }}>{s.p}</p>
            </section>
          ))}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
