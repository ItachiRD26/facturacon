import Link from "next/link";
import { Check, UserPlus, Receipt, Buildings } from "@phosphor-icons/react/dist/ssr";
import Reveal from "./reveal";
import { PLANES, TARIFAS_ADICIONALES, VOLUMEN_EMPRESA } from "@/lib/payments/planes";

// Tarifario completo de la landing: una sola tabla con todos los planes (en vez de
// siete tarjetas iguales) y, debajo, lo que se suma al plan. Sin botón por plan a
// propósito: el plan se elige DESPUÉS de certificarse, dentro del panel. Los
// valores salen de lib/payments/planes.ts (un solo lugar para ajustarlos).
const dinero = (n: number) => n.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function Tarifario() {
  const maxPlan = PLANES[PLANES.length - 1].facturas;
  const extraMin = Math.min(...PLANES.map((p) => p.extraRD));

  return (
    <div>
      <div className="tarifa-panel">
        <div className="tarifa-cab" aria-hidden="true">
          <span>Comprobantes al mes</span><span>Usuarios incluidos</span><span>Comprobante adicional</span><span className="der">Precio mensual</span>
        </div>
        <Reveal as="ul" stagger className="tarifa-filas" style={{ listStyle: "none" }}>
          {PLANES.map((p) => (
            <li key={p.id} className="tarifa-fila">
              <div className="tc-vol">
                <div className="tc-vol-t"><b className="num-sans">{p.facturas.toLocaleString("es-DO")}</b><span>comprobantes</span></div>
                <div className="tarifa-barra" aria-hidden="true"><i style={{ width: `${Math.sqrt(p.facturas / maxPlan) * 100}%` }} /></div>
              </div>
              <div className="tc" data-label="Usuarios incluidos">{p.usuarios} usuarios</div>
              <div className="tc" data-label="Comprobante adicional">RD$ {dinero(p.extraRD)}</div>
              <div className="tc-precio">
                <b className="num-sans">RD$ {p.montoRD.toLocaleString("es-DO")}</b><span>/mes</span>
              </div>
            </li>
          ))}
          <li className="tarifa-fila tarifa-empresa">
            <div className="tc-emp-txt">
              <b>Más de {maxPlan.toLocaleString("es-DO")} comprobantes al mes</b>
              <span>Si emites {VOLUMEN_EMPRESA.toLocaleString("es-DO")} o más, o tienes varias sucursales, armamos un plan a tu medida y lo acordamos contigo.</span>
            </div>
            <Link href="/empresas" className="btn-l btn-ticket">Hablar con ventas</Link>
          </li>
        </Reveal>
      </div>

      <h3 className="tarifa-sub">Lo que se suma a tu plan</h3>
      <Reveal stagger className="cols-3 adicionales">
        <div className="adicional hov-lift">
          <UserPlus size={34} weight="duotone" color="var(--c-ticket)" aria-hidden="true" />
          <h4>Usuario adicional</h4>
          <div className="adicional-valor"><b className="num-sans">RD$ {TARIFAS_ADICIONALES.usuarioRD.toLocaleString("es-DO")}</b><span>/mes por usuario</span></div>
          <p>Suma un cajero, administrador o contador sin cambiar de plan.</p>
        </div>
        <div className="adicional hov-lift">
          <Receipt size={34} weight="duotone" color="var(--c-ticket)" aria-hidden="true" />
          <h4>Comprobante adicional</h4>
          <div className="adicional-valor"><span>Desde</span><b className="num-sans">RD$ {dinero(extraMin)}</b><span>cada uno</span></div>
          <p>Si pasas el tope del mes, cada comprobante extra se cobra al precio de la columna de tu plan.</p>
        </div>
        <div className="adicional hov-lift">
          <Buildings size={34} weight="duotone" color="var(--c-ticket)" aria-hidden="true" />
          <h4>Empresa adicional</h4>
          <div className="adicional-valor"><b>Su propio plan</b></div>
          <p>Con la cuenta gestor administras varias empresas desde un solo acceso; cada una con su certificación y su suscripción.</p>
        </div>
      </Reveal>

      <Reveal className="siempre-gratis">
        <b>Siempre gratis</b>
        <ul>
          {["Certificación ante la DGII", "Entorno de prueba con datos de ejemplo", "Asistente guiado de 13 pasos"].map((t) => (
            <li key={t}><Check size={18} weight="bold" aria-hidden="true" />{t}</li>
          ))}
        </ul>
      </Reveal>
    </div>
  );
}
