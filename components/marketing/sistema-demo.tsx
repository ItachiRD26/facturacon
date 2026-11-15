import {
  SquaresFour, Receipt, ClipboardText, UsersThree, Package, Wallet, Tray, SealCheck, UserPlus, Key, Link, Copy, Check,
} from "@phosphor-icons/react/dist/ssr";
import { MarcaFacturacon } from "@/components/ui/logo";
import CountUp from "./count-up";

// Dashboard e inventario de ejemplo, dibujados en HTML (no son imágenes). Se
// diseñan a 1112 px de ancho y <VentanaEscalada> los escala al espacio disponible.
// Datos ficticios (Ferretería El Progreso). Estilos: .vt-*, .dd-*, .iv-* en globals.css.

type Pagina = "dashboard" | "inventario" | "clientes" | "cotizaciones" | "cxc";

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


// ── Clientes ─────────────────────────────────────────────────────────────
const CLIENTES: [string, string, string, string, string, "ok" | "warn"][] = [
  ["CV", "Constructora Vargas SRL", "1-30-98765-4", "809-555-0178", "214,300.00", "ok"],
  ["IP", "Inversiones Peña", "1-31-44210-7", "829-555-0136", "168,900.00", "ok"],
  ["TH", "Taller Los Hermanos", "1-02-31877-5", "809-555-0192", "74,250.00", "warn"],
  ["MG", "Mariela Gómez", "001-1234567-8", "849-555-0114", "18,640.00", "ok"],
  ["FR", "Farmacia Rodríguez", "1-01-55920-3", "809-555-0167", "52,180.00", "ok"],
  ["ES", "Estructuras del Sur SRL", "1-31-60418-2", "829-555-0105", "131,700.00", "warn"],
  ["JD", "Juan de la Cruz", "001-7654321-0", "809-555-0149", "9,820.00", "ok"],
  ["RS", "Restaurante El Sabor", "1-30-72266-9", "849-555-0183", "41,560.00", "ok"],
];

export function ClientesDemo() {
  return (
    <Marco activa="clientes" titulo="Clientes">
      <div className="iv-body">
        <div>
          <div className="iv-tools"><div className="iv-search">Buscar por nombre, RNC o cédula…</div><div className="iv-btn p">Nuevo cliente</div></div>
          <div className="vt-card" style={{ overflow: "hidden" }}>
            <table className="iv-tabla">
              <thead><tr><th>Cliente</th><th>RNC / Cédula</th><th className="r">Facturado</th><th>Estado</th></tr></thead>
              <tbody>
                {CLIENTES.map((c, i) => (
                  <tr key={c[1]} className={`dd-fila${i === 0 ? " sel" : ""}`} style={{ ["--i" as string]: i }}>
                    <td><span className="cl-fila"><span className="cl-av">{c[0]}</span>{i === 0 ? <b>{c[1]}</b> : c[1]}</span></td>
                    <td className="m">{c[2]}</td><td className="r">{c[4]}</td>
                    <td><span className={`vt-pill ${c[5]}`}>{c[5] === "ok" ? "Al día" : "Con saldo"}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="vt-card iv-lab">
          <div className="cl-ficha">
            <span className="cl-av grande">CV</span>
            <div><b>Constructora Vargas SRL</b><div className="sub2">RNC 1-30-98765-4</div></div>
          </div>
          <div className="cl-datos"><span>Correo</span><b>compras@vargas.do</b><span>Teléfono</span><b>809-555-0178</b><span>Dirección</span><b>Av. Charles de Gaulle 45, SDE</b></div>
          <div className="cl-stats"><div><span>Facturado</span><b>RD$ 214,300</b></div><div><span>Por cobrar</span><b>RD$ 14,750</b></div></div>
          <div className="iv-btn p" style={{ textAlign: "center" }}>Nueva factura</div>
          <div className="iv-btn" style={{ textAlign: "center" }}>Crear cotización</div>
        </div>
      </div>
    </Marco>
  );
}

// ── Cotizaciones ─────────────────────────────────────────────────────────
const COTIZACIONES: [string, string, string, string, string, "ok" | "warn" | "bad", string][] = [
  ["COT-0048", "Constructora Vargas SRL", "13-11-2026", "28-11-2026", "58,300.00", "ok", "Vigente"],
  ["COT-0047", "Inversiones Peña", "12-11-2026", "27-11-2026", "124,750.00", "ok", "Vigente"],
  ["COT-0046", "Estructuras del Sur SRL", "10-11-2026", "25-11-2026", "36,900.00", "ok", "Vigente"],
  ["COT-0045", "Taller Los Hermanos", "05-11-2026", "20-11-2026", "12,480.00", "warn", "Convertida"],
  ["COT-0044", "Farmacia Rodríguez", "02-11-2026", "17-11-2026", "9,150.00", "warn", "Convertida"],
  ["COT-0043", "Restaurante El Sabor", "28-10-2026", "12-11-2026", "21,600.00", "bad", "Vencida"],
  ["COT-0042", "Mariela Gómez", "24-10-2026", "08-11-2026", "4,320.00", "warn", "Convertida"],
];

export function CotizacionesDemo() {
  return (
    <Marco activa="cotizaciones" titulo="Cotizaciones">
      <div className="dd-body">
        <div className="dd-kpis k3">
          <div className="vt-card dd-kpi"><div className="l">Vigentes</div><div className="v"><CountUp to={3} /></div><div className="n">RD$ 219,950.00 por cerrar</div></div>
          <div className="vt-card dd-kpi"><div className="l">Convertidas en factura</div><div className="v"><CountUp to={11} /></div><div className="n up">este mes</div></div>
          <div className="vt-card dd-kpi"><div className="l">Vencidas</div><div className="v"><CountUp to={1} /></div><div className="n">sin respuesta del cliente</div></div>
        </div>
        <div className="vt-card" style={{ overflow: "hidden" }}>
          <table className="iv-tabla">
            <thead><tr><th>Número</th><th>Cliente</th><th>Emitida</th><th>Vence</th><th className="r">Total</th><th>Estado</th><th /></tr></thead>
            <tbody>
              {COTIZACIONES.map((c, i) => (
                <tr key={c[0]} className={`dd-fila${i === 0 ? " sel" : ""}`} style={{ ["--i" as string]: i }}>
                  <td className="m">{c[0]}</td><td>{i === 0 ? <b>{c[1]}</b> : c[1]}</td><td>{c[2]}</td><td>{c[3]}</td><td className="r">{c[4]}</td>
                  <td><span className={`vt-pill ${c[5]}`}>{c[6]}</span></td>
                  <td className="r">{c[6] === "Vigente" ? <span className="iv-btn mini">Convertir en factura</span> : null}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Marco>
  );
}

// ── Cuentas por cobrar ───────────────────────────────────────────────────
const CUENTAS: [string, string, string, string, "ok" | "warn" | "bad", string][] = [
  ["Constructora Vargas SRL", "E310000000214", "30-11-2026", "14,750.00", "ok", "Al día"],
  ["Estructuras del Sur SRL", "E310000000203", "20-11-2026", "38,400.00", "warn", "Vence en 5 días"],
  ["Taller Los Hermanos", "E310000000198", "12-11-2026", "22,400.00", "bad", "Vencida hace 3 días"],
  ["Inversiones Peña", "E310000000191", "10-12-2026", "10,570.00", "ok", "Al día"],
  ["Restaurante El Sabor", "E310000000187", "18-11-2026", "10,000.00", "warn", "Vence en 3 días"],
];

export function CuentasDemo() {
  return (
    <Marco activa="cxc" titulo="Cuentas por cobrar">
      <div className="dd-body">
        <div className="dd-kpis k3">
          <div className="vt-card dd-kpi"><div className="l">Por cobrar</div><div className="v"><CountUp to={96120} prefix="RD$ " /></div><div className="n">9 facturas a crédito</div></div>
          <div className="vt-card dd-kpi"><div className="l">Vencido</div><div className="v" style={{ color: "#991b1b" }}><CountUp to={22400} prefix="RD$ " /></div><div className="n">1 cliente con atraso</div></div>
          <div className="vt-card dd-kpi"><div className="l">Cobrado este mes</div><div className="v"><CountUp to={61300} prefix="RD$ " /></div><div className="n up">en abonos y pagos</div></div>
        </div>
        <div className="vt-card" style={{ overflow: "hidden" }}>
          <table className="iv-tabla">
            <thead><tr><th>Cliente</th><th>Factura</th><th>Vence</th><th className="r">Pendiente</th><th>Estado</th><th /></tr></thead>
            <tbody>
              {CUENTAS.map((c, i) => (
                <tr key={c[1]} className={`dd-fila${i === 2 ? " sel" : ""}`} style={{ ["--i" as string]: i }}>
                  <td>{i === 2 ? <b>{c[0]}</b> : c[0]}</td><td className="m">{c[1]}</td><td>{c[2]}</td><td className="r">{c[3]}</td>
                  <td><span className={`vt-pill ${c[4]}`}>{c[5]}</span></td>
                  <td className="r"><span className="iv-btn mini">Registrar abono</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Marco>
  );
}


// ── Equipo y cajas (panel del dueño) ─────────────────────────────────────
// Varios cajeros facturando a la vez, cada uno con su código, y el dueño viéndolo
// todo desde un solo lugar. Las ventas suman lo mismo que el dashboard (482,350).
const CAJEROS: [string, string, string, number, number][] = [
  ["MR", "Marisol Reyes", "Cajera principal", 98, 221400],
  ["LP", "Luis Peña", "Turno tarde", 71, 158750],
  ["AM", "Ana Martínez", "Sucursal Norte", 45, 102200],
];
const MAX_VENTA = 221400;
const ACTIVIDAD: [string, string, string, string, string][] = [
  ["AM", "Ana Martínez", "E320000000615", "1,740.00", "hace 1 min"],
  ["MR", "Marisol Reyes", "E310000000214", "14,750.00", "hace 3 min"],
  ["LP", "Luis Peña", "E320000000614", "560.50", "hace 6 min"],
];

export function EquipoDemo() {
  return (
    <div className="vt-win">
      <div className="vt-chrome"><i style={{ background: "#f87171" }} /><i style={{ background: "#fbbf24" }} /><i style={{ background: "#34d399" }} /><span className="vt-url">facturacon.com.do/panel/ferreteria-progreso/equipo</span></div>
      <div className="vt-app">
        <aside className="vt-side">
          <div className="vt-brand"><MarcaFacturacon size={26} tone="color" />facturacon</div>
          <div className="vt-it"><SquaresFour size={18} weight="duotone" aria-hidden="true" />Resumen</div>
          <div className="vt-grupo">Mi negocio</div>
          <div className="vt-it on"><UsersThree size={18} weight="fill" aria-hidden="true" />Equipo y accesos</div>
          <div className="vt-it"><Wallet size={18} weight="duotone" aria-hidden="true" />Contabilidad</div>
          <div className="vt-it"><Receipt size={18} weight="duotone" aria-hidden="true" />Secuencias fiscales</div>
          <div className="vt-grupo">Cuenta</div>
          <div className="vt-it"><Receipt size={18} weight="duotone" aria-hidden="true" />Plan y facturación</div>
          <div className="vt-estado"><SealCheck size={16} weight="fill" aria-hidden="true" />Certificado ante la DGII</div>
        </aside>
        <div className="vt-main">
          <div className="vt-top"><h3>Equipo y accesos</h3><div className="vt-quien"><span>Ferretería El Progreso</span><span className="vt-av">MR</span></div></div>
          <div className="eq-body">
            <div className="eq-izq">
              <div className="vt-card eq-plan">
                <div className="eq-plan-t"><b>Usas 4 de 5 usuarios de tu plan</b><span>Plan de 500 comprobantes al mes</span></div>
                <div className="eq-barra"><i style={{ width: "80%" }} /></div>
              </div>
              <div className="eq-tabs"><span className="on">Cajeros y personal</span><span>Administradores y contador</span><span>Qué puede hacer cada rol</span></div>
              <div className="vt-card" style={{ overflow: "hidden" }}>
                <table className="iv-tabla">
                  <thead><tr><th>Cajero</th><th className="r">Facturas del mes</th><th className="r">Vendido</th><th>Acceso</th></tr></thead>
                  <tbody>
                    {CAJEROS.map((c, i) => (
                      <tr key={c[0]} className="dd-fila" style={{ ["--i" as string]: i }}>
                        <td><span className="cl-fila"><span className="cl-av">{c[0]}</span><span><b>{c[1]}</b><span className="eq-sub">{c[2]}</span></span></span></td>
                        <td className="r">{c[3]}</td>
                        <td className="r">
                          <b>RD$ {c[4].toLocaleString("es-DO")}</b>
                          <span className="eq-venta"><i style={{ width: `${(c[4] / MAX_VENTA) * 100}%`, ["--i" as string]: i }} /></span>
                        </td>
                        <td><span className="vt-pill ok">Activo</span> <span className="iv-btn mini">Revocar</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="vt-card eq-feed">
                <h4>Lo que está pasando ahora en tus cajas</h4>
                {ACTIVIDAD.map((a, i) => (
                  <div key={a[2]} className="eq-act dd-fila" style={{ ["--i" as string]: i + 3 }}>
                    <span className="cl-av">{a[0]}</span>
                    <span className="t"><b>{a[1]}</b> emitió <span className="m2">{a[2]}</span> por <b>RD$ {a[3]}</b></span>
                    <span className="h">{a[4]}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="eq-der">
              <div className="vt-card eq-card">
                <h4><UserPlus size={18} weight="duotone" aria-hidden="true" /> Agrega un cajero en segundos</h4>
                <ol className="eq-pasos">
                  <li><Check size={14} weight="bold" aria-hidden="true" />Escribes su nombre</li>
                  <li><Check size={14} weight="bold" aria-hidden="true" />Te damos un código de acceso</li>
                  <li><Check size={14} weight="bold" aria-hidden="true" />Entra con el código, sin correo ni contraseña</li>
                </ol>
                <div className="eq-codigo"><Key size={16} weight="duotone" aria-hidden="true" /><b>K7M4-9QXP-2TWN</b></div>
                <div className="eq-nota">Código de ejemplo. Se muestra una sola vez.</div>
              </div>
              <div className="vt-card eq-card">
                <h4><Link size={18} weight="duotone" aria-hidden="true" /> Enlace de tus cajeros</h4>
                <div className="eq-link">ferreteriaprogreso.facturacon.com.do/empleado/k4m9x2qr7t</div>
                <div className="iv-btn" style={{ textAlign: "center" }}><Copy size={14} weight="bold" aria-hidden="true" /> Copiar enlace</div>
                <div className="eq-nota">Cada cajero solo ve lo suyo; tú ves todo.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
