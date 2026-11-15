import Reveal from "./reveal";
import {
  Wrench, Pill, Basket, ForkKnife, Scissors, Car, Stethoscope, Briefcase,
} from "@phosphor-icons/react/dist/ssr";

// Tipos de negocio para los que sirve el sistema base. Cuadrícula pareja de 4x2
// con un icono por tipo (antes eran etiquetas sueltas que se partían en filas
// desiguales). Los filetes salen del truco gap:1px sobre fondo de borde.
const negocios = [
  { t: "Ferreterías", d: "Productos, stock y códigos de barra", Icono: Wrench },
  { t: "Farmacias", d: "Inventario y facturación ágil", Icono: Pill },
  { t: "Colmados y supermercados", d: "Ventas rápidas, ticket térmico", Icono: Basket },
  { t: "Restaurantes", d: "Facturas al momento, por mesa", Icono: ForkKnife },
  { t: "Salones y spas", d: "Servicios, clientes y cobranza", Icono: Scissors },
  { t: "Talleres mecánicos", d: "Cotizaciones y cuentas por cobrar", Icono: Car },
  { t: "Clínicas y consultorios", d: "Facturas a pacientes y empresas", Icono: Stethoscope },
  { t: "Servicios profesionales", d: "Cotiza, factura y da seguimiento", Icono: Briefcase },
];

export default function NegociosSection() {
  return (
    <div>
      <h3 style={{ fontWeight: 800, fontSize: "clamp(1.4rem, 2.4vw, 1.8rem)", letterSpacing: "-0.03em", lineHeight: 1.15, marginBottom: 8 }}>
        Funciona para cualquier negocio que venda productos o servicios
      </h3>
      <p style={{ fontSize: 16.5, color: "var(--c-text-2)", marginBottom: 28, maxWidth: 560, lineHeight: 1.55 }}>
        Si facturas, Facturacon se adapta. Estos son algunos de los negocios que más lo usarán.
      </p>
      <Reveal as="ul" stagger className="grid-negocios" style={{ listStyle: "none" }}>
        {negocios.map(({ t, d, Icono }) => (
          <li key={t} className="celda-negocio">
            <span className="celda-negocio-icono"><Icono size={26} weight="duotone" aria-hidden="true" /></span>
            <span>
              <span style={{ display: "block", fontWeight: 700, fontSize: 16, letterSpacing: "-0.01em", lineHeight: 1.25 }}>{t}</span>
              <span style={{ display: "block", fontSize: 14, color: "var(--c-text-3)", lineHeight: 1.45, marginTop: 3 }}>{d}</span>
            </span>
          </li>
        ))}
      </Reveal>
    </div>
  );
}
