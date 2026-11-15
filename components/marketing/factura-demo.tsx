// La factura de ejemplo, dibujada en HTML (no es una imagen) para que sea nítida
// en cualquier pantalla: una hoja con proporción A4 real y, aparte, el ticket
// térmico de 80 mm. Todo se mide en "em" sobre un tamaño de letra que sale del
// ancho del propio documento (cqw), así que escala completo sin deformarse.
// Datos ficticios; el QR es decorativo (no se puede escanear).
const mono = "var(--font-mono), 'Courier New', monospace";

// QR decorativo determinístico: 3 buscadores + módulos con semilla fija.
function Qr({ lado }: { lado: string }) {
  const N = 29;
  let s = 20261115;
  const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const buscador = (x: number, y: number) => (
    <g key={`f${x}${y}`}>
      <rect x={x} y={y} width="7" height="7" fill="#0F1A30" />
      <rect x={x + 1} y={y + 1} width="5" height="5" fill="#fff" />
      <rect x={x + 2} y={y + 2} width="3" height="3" fill="#0F1A30" />
    </g>
  );
  const mods: React.ReactNode[] = [];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const enBuscador = (x < 8 && y < 8) || (x > N - 9 && y < 8) || (x < 8 && y > N - 9);
    if (!enBuscador && rnd() > 0.52) mods.push(<rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="#0F1A30" />);
  }
  return (
    <svg viewBox={`0 0 ${N} ${N}`} shapeRendering="crispEdges" style={{ width: lado, height: lado, display: "block" }} aria-hidden="true">
      {mods}{buscador(0, 0)}{buscador(N - 7, 0)}{buscador(0, N - 7)}
    </svg>
  );
}

function Dientes() {
  const n = 22, w = 12;
  let d = `M0 0H${n * w}`;
  for (let i = n; i > 0; i--) d += `L${i * w - w / 2} 9L${(i - 1) * w} 0`;
  return (
    <svg viewBox={`0 0 ${n * w} 9`} preserveAspectRatio="none" aria-hidden="true" style={{ display: "block", width: "100%", height: "0.9em" }}>
      <path d={d + "Z"} fill="#fff" />
    </svg>
  );
}

const ITEMS = [
  ["Cemento gris 42.5 kg", "20", "485.00", "9,700.00"],
  ["Varilla corrugada 3/8\"", "40", "215.00", "8,600.00"],
  ["Block de 6\"", "150", "38.00", "5,700.00"],
  ["Alambre de amarre (lb)", "25", "62.00", "1,550.00"],
];

export default function FacturaDemo() {
  return (
    <div className="fd">
      {/* Hoja A4: 210 x 297 */}
      <figure className="fd-col fd-col-a4">
        <div className="fd-a4">
          <div className="fd-pg">
            <div className="fd-franja" />
            <div className="fd-cab">
              <div>
                <div className="fd-emp">Ferretería El Progreso</div>
                <div className="fd-peq">RNC 1-31-12345-6<br />Av. Duarte #123, Santo Domingo<br />809-555-0142</div>
              </div>
              <div className="fd-tipo">
                <b>Factura de Crédito Fiscal Electrónica</b>
                <div className="fd-enc">E310000000214</div>
                <span className="fd-peq">Válido hasta: 31-12-2027</span>
              </div>
            </div>

            <div className="fd-meta">
              <div><span className="fd-peq">Cliente</span><br /><b>Constructora Vargas SRL</b><br />RNC 1-30-98765-4</div>
              <div><span className="fd-peq">Fecha de emisión</span> 15-11-2026<br /><span className="fd-peq">Condición</span> Contado<br /><span className="fd-peq">Atendido por</span> Marisol R.</div>
            </div>

            <table className="fd-tabla">
              <thead><tr><th>Descripción</th><th>Cant.</th><th>Precio</th><th>Importe</th></tr></thead>
              <tbody>
                {ITEMS.map((r) => (
                  <tr key={r[0]}><td>{r[0]}</td><td>{r[1]}</td><td>{r[2]}</td><td>{r[3]}</td></tr>
                ))}
              </tbody>
            </table>

            <div className="fd-tot">
              <div><span>Subtotal</span><span>25,550.00</span></div>
              <div><span>ITBIS 18%</span><span>4,599.00</span></div>
              <div className="fd-g"><span>Total RD$</span><span>30,149.00</span></div>
            </div>

            <div className="fd-pie">
              <Qr lado="7.6em" />
              <div className="fd-peq" style={{ lineHeight: 1.7 }}>
                Código de seguridad: <b style={{ fontFamily: mono, fontWeight: 500, color: "#0F1A30" }}>Xa9fK2</b><br />
                Fecha de firma: <b style={{ fontFamily: mono, fontWeight: 500, color: "#0F1A30" }}>15-11-2026 10:42:18</b><br />
                Escanea el código para verificar este comprobante en la DGII.
              </div>
            </div>
          </div>
        </div>
        <figcaption>Hoja A4</figcaption>
      </figure>

      {/* Ticket térmico de 80 mm: se imprime al entrar */}
      <figure className="fd-col fd-col-ticket">
        <div className="fd-ticket-imprime">
          <div className="fd-tk">
            <div className="fd-c fd-tk-grande">FERRETERÍA EL PROGRESO</div>
            <div className="fd-c">RNC 1-31-12345-6</div>
            <div className="fd-c">Av. Duarte #123</div>
            <hr />
            <div className="fd-c">Factura de Crédito Fiscal<br />Electrónica</div>
            <div className="fd-c fd-tk-grande">E310000000214</div>
            <hr />
            {ITEMS.map((r) => (
              <div key={r[0]}>
                <div>{r[0].replace(" kg", "kg").replace("corrugada ", "").replace("de amarre ", "")}</div>
                <div className="fd-f"><span>{r[1]} x {r[2]}</span><span>{r[3]}</span></div>
              </div>
            ))}
            <hr />
            <div className="fd-f"><span>Subtotal</span><span>25,550.00</span></div>
            <div className="fd-f"><span>ITBIS 18%</span><span>4,599.00</span></div>
            <div className="fd-f fd-tk-grande"><span>TOTAL</span><span>30,149.00</span></div>
            <hr />
            <div className="fd-c" style={{ display: "flex", justifyContent: "center" }}><Qr lado="7em" /></div>
            <div className="fd-c">Código de seguridad: Xa9fK2</div>
            <div className="fd-c">15-11-2026 10:42:18</div>
          </div>
          <Dientes />
        </div>
        <figcaption>Ticket térmico, 80 mm</figcaption>
      </figure>
    </div>
  );
}
