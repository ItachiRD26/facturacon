import {
  SquaresFour, Receipt, ClipboardText, UsersThree, Package, Wallet, Tray, SealCheck,
} from "@phosphor-icons/react/dist/ssr";
import { MarcaFacturacon } from "@/components/ui/logo";
import CountUp from "./count-up";

// Dashboard e inventario de ejemplo, dibujados en HTML (no son imágenes). Se
// diseñan a 1112 px de ancho y <VentanaEscalada> los escala al espacio disponible.
// Datos ficticios (Ferretería El Progreso). Estilos: .vt-*, .dd-*, .iv-* en globals.css.

type Pagina = "dashboard" | "inventario";

const NAV: { id: string; label: string; Icono: typeof SquaresFour; grupo?: string }[] = [
  { id: "dashboard", label: "Dashboard", Icono: SquaresFour },
  { id: "facturas", label: "Facturas", Icono: Receipt },
  { id: "cotizaciones", label: "Cotizaciones", Icono: ClipboardText },
  { id: "clientes", label: "Clientes", Icono: UsersThree },
  { id: "inventario", label: "Inventario", Icono: Package },
  { id: "cxc", label: "Cuentas por cobrar", Icono: Wallet, grupo: "Cobranza" },
  { id: "recibidas", label: "Facturas recibidas", Icono: Tray },
];

function Marco({ activa, titulo, children }: { activa: Pagina; titulo: string; children: React.ReactNode }) {
  return (
    <div className="vt-win">
      <div className="vt-chrome"><i style={{ background: "#f87171" }} /><i style={{ background: "#fbbf24" }} /><i style={{ background: "#34d399" }} /><span className="vt-url">ferreteriaprogreso.facturacon.com.do</span></div>
      <div className="vt-app">
        <aside className="vt-side">
          <div className="vt-brand"><MarcaFacturacon size={26} tone="color" />facturacon</div>
          {NAV.map(({ id, label, Icono, grupo }) => (
            <div key={id}>
              {grupo && <div className="vt-grupo">{grupo}</div>}
              <div className={`vt-it${id === activa ? " on" : ""}`}><Icono size={18} weight={id === activa ? "fill" : "duotone"} aria-hidden="true" />{label}</div>
            </div>
          ))}
          <div className="vt-estado"><SealCheck size={16} weight="fill" aria-hidden="true" />Certificado ante la DGII</div>
        </aside>
        <div className="vt-main">
          <div className="vt-top"><h3>{titulo}</h3><div className="vt-quien"><span>Ferretería El Progreso</span><span className="vt-av">MR</span></div></div>
          {children}
        </div>
      </div>
    </div>
  );
}

const BARRAS = [32, 41, 28, 55, 62, 48, 20, 36, 58, 66, 52, 44, 30, 38, 61, 70, 64, 49, 26, 40, 57, 73, 68, 54, 35, 42, 60, 78, 72, 59];
const ULTIMOS = [
  ["E310000000214", "Constructora Vargas", "14,750.00"],
  ["E320000000611", "Consumidor final", "1,180.00"],
  ["E310000000213", "Inversiones Peña", "32,400.00"],
  ["E320000000610", "Consumidor final", "560.50"],
  ["E310000000212", "Taller Los Hermanos", "8,925.00"],
];

export function DashboardDemo() {
  return (
    <Marco activa="dashboard" titulo="Dashboard">
      <div className="dd-body">
        <div className="dd-kpis">
          <div className="vt-card dd-kpi"><div className="l">Facturado este mes</div><div className="v"><CountUp to={482350} prefix="RD$ " /></div><div className="n up">+12.4% vs. mes anterior</div></div>
          <div className="vt-card dd-kpi"><div className="l">Por cobrar</div><div className="v"><CountUp to={96120} prefix="RD$ " /></div><div className="n">9 facturas a crédito</div></div>
          <div className="vt-card dd-kpi"><div className="l">Comprobantes emitidos</div><div className="v"><CountUp to={214} /></div><div className="n">de 500 de tu plan</div></div>
          <div className="vt-card dd-kpi"><div className="l">ITBIS del mes</div><div className="v"><CountUp to={73580} prefix="RD$ " /></div><div className="n">sobre ventas gravadas</div></div>
        </div>
        <div className="dd-row">
          <div className="vt-card dd-chart">
            <h4>Facturado por día</h4><div className="sub">Últimos 30 días</div>
            <div className="dd-barras">
              {BARRAS.map((n, i) => (
                <span key={i} className={i === 27 ? "hoy" : ""} style={{ height: `${(n / 80) * 100}%`, ["--i" as string]: i }} />
              ))}
            </div>
          </div>
          <div className="vt-card dd-ultimos">
            <h4>Últimos comprobantes</h4>
            <table>
              <thead><tr><th>e-NCF</th><th>Cliente</th><th>Total</th></tr></thead>
              <tbody>
                {ULTIMOS.map((r, i) => (
                  <tr key={r[0]} className="dd-fila" style={{ ["--i" as string]: i }}><td className="m">{r[0]}</td><td>{r[1]}</td><td className="r">{r[2]}</td></tr>
                ))}
              </tbody>
            </table>
            <div className="pie"><span className="vt-pill ok">Todos aceptados por la DGII</span></div>
          </div>
        </div>
      </div>
    </Marco>
  );
}

const PRODUCTOS: [string, string, string, string, "ok" | "warn" | "bad", string][] = [
  ["7461234500012", "Cemento gris 42.5 kg", "184", "485.00", "ok", "En stock"],
  ["7461234500029", "Varilla corrugada 3/8\"", "96", "215.00", "ok", "En stock"],
  ["7461234500036", "Block de 6\"", "1,240", "38.00", "ok", "En stock"],
  ["7461234500043", "Pintura acrílica blanca 1 gal", "12", "1,350.00", "warn", "Quedan pocos"],
  ["7461234500050", "Alambre de amarre (lb)", "310", "62.00", "ok", "En stock"],
  ["7461234500067", "Tubo PVC 1/2\" x 20 pies", "4", "395.00", "bad", "Stock bajo"],
  ["7461234500074", "Brocha 3 pulgadas", "58", "145.00", "ok", "En stock"],
  ["7461234500081", "Candado 50 mm", "27", "420.00", "ok", "En stock"],
  ["7461234500098", "Cinta métrica 5 m", "41", "180.00", "ok", "En stock"],
];

function CodigoBarras() {
  let s = 7461234, x = 4;
  const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  const barras: React.ReactNode[] = [];
  while (x < 196) {
    const w = 1 + Math.floor(rnd() * 3);
    barras.push(<rect key={x} x={x} y={0} width={w} height={54} fill="#0F1A30" />);
    x += w + 1 + Math.floor(rnd() * 3);
  }
  return <svg viewBox="0 0 200 54" preserveAspectRatio="none" style={{ width: "100%", height: 54, display: "block" }} aria-hidden="true">{barras}</svg>;
}

export function InventarioDemo() {
  return (
    <Marco activa="inventario" titulo="Inventario">
      <div className="iv-body">
        <div>
          <div className="iv-tools"><div className="iv-search">Buscar por nombre o código de barras…</div><div className="iv-btn">Imprimir etiquetas</div><div className="iv-btn p">Nuevo producto</div></div>
          <div className="vt-card" style={{ overflow: "hidden" }}>
            <table className="iv-tabla">
              <thead><tr><th>Código</th><th>Producto</th><th className="r">Stock</th><th className="r">Precio</th><th>Estado</th></tr></thead>
              <tbody>
                {PRODUCTOS.map((p, i) => (
                  <tr key={p[0]} className={`dd-fila${i === 0 ? " sel" : ""}`} style={{ ["--i" as string]: i }}>
                    <td className="m">{p[0]}</td><td>{i === 0 ? <b>{p[1]}</b> : p[1]}</td><td className="r">{p[2]}</td><td className="r">{p[3]}</td>
                    <td><span className={`vt-pill ${p[4]}`}>{p[5]}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="vt-card iv-lab">
          <h4>Etiqueta del producto</h4>
          <div className="iv-etq">
            <div className="n">Cemento gris 42.5 kg</div><div className="p">RD$ 485.00</div>
            <CodigoBarras />
            <div className="c">7461234500012</div>
          </div>
          <div className="iv-scan">Escanea con tu lector USB y el producto se agrega solo a la factura.</div>
          <div className="iv-btn" style={{ textAlign: "center" }}>Imprimir etiqueta</div>
        </div>
      </div>
    </Marco>
  );
}
