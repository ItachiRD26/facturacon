import type { Metadata } from "next";
import SiteHeader from "@/components/marketing/site-header";
import SiteFooter from "@/components/marketing/site-footer";
import Seccion from "@/components/marketing/seccion";
import ContactoComercialForm from "@/components/marketing/contacto-comercial-form";
import { VOLUMEN_EMPRESA } from "@/lib/payments/planes";
import { UsersThree, Headset, Handshake } from "@phosphor-icons/react/dist/ssr";

export const metadata: Metadata = {
  title: "Plan para empresas: Facturacon",
  description: "Si emites 10,000 comprobantes o más al mes, armamos un plan adaptado a tu empresa.",
};

const puntos = [
  { Icono: Handshake, t: "Precio acordado contigo", d: "Nada de plan de lista: conversamos tu volumen y tu operación y acordamos las condiciones." },
  { Icono: UsersThree, t: "Usuarios y sucursales a tu medida", d: "Cajeros, administradores y contadores según tu estructura, sin toparte con límites de un plan estándar." },
  { Icono: Headset, t: "Atención directa", d: "Un contacto de nuestro equipo para el arranque y para cuando lo necesites, no solo un buzón de soporte." },
];

export default async function EmpresasPage({ searchParams }: { searchParams: Promise<{ volumen?: string }> }) {
  const { volumen } = await searchParams;
  const v = Number(volumen);

  return (
    <>
      <SiteHeader />
      <main style={{ fontFamily: "var(--font-sans)" }}>
        <Seccion tono="paper">
          <div className="split">
            <div>
              <h1 className="sec-h2">Un plan para tu empresa</h1>
              <p className="sec-lede">
                Si emites {VOLUMEN_EMPRESA.toLocaleString("es-DO")} comprobantes o más al mes, o tu operación tiene
                varias sucursales, hablemos. Armamos un plan adaptado y lo acordamos contigo.
              </p>
              <ul style={{ listStyle: "none", marginTop: 36, display: "flex", flexDirection: "column", gap: 24 }}>
                {puntos.map(({ Icono, t, d }) => (
                  <li key={t} style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                    <Icono size={34} weight="duotone" color="var(--c-brand)" style={{ flexShrink: 0 }} aria-hidden="true" />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 4 }}>{t}</div>
                      <div style={{ fontSize: 15.5, color: "var(--c-text-2)", lineHeight: 1.6 }}>{d}</div>
                    </div>
                  </li>
                ))}
              </ul>
              <p style={{ marginTop: 32, fontSize: 15, color: "var(--c-text-2)" }}>
                Prefieres escribir directo:{" "}
                <a href="mailto:contacto@facturacon.com.do" style={{ color: "var(--c-brand)", fontWeight: 700 }}>contacto@facturacon.com.do</a>
              </p>
            </div>
            <ContactoComercialForm volumenInicial={Number.isFinite(v) && v > 0 ? Math.round(v) : undefined} />
          </div>
        </Seccion>
      </main>
      <SiteFooter />
    </>
  );
}
