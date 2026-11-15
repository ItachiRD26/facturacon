import { requerirRolPanel } from "@/lib/tenant/panel-acceso";
import { etiquetaDeMes, mesAnteriorDe, mesSiguienteDe, mesValido, resumenContable } from "@/lib/tenant/contabilidad";
import { fmt, TIPOS_ECF } from "@/types";
import { Avatar, Button, Card, CardTitle, EmptyBlock, PageHeader, Pill, StatCard, td, th, tablaWrap } from "@/components/ui/kit";

const ESTADO_TONO = { pagada: "success", pendiente: "warning", anulada: "danger" } as const;
const ESTADO_TXT = { pagada: "Pagada", pendiente: "Por cobrar", anulada: "Anulada" } as const;

// Barras diarias sin etiquetas (un mes tiene hasta 31): el detalle sale en el
// tooltip nativo. Más legible que una gráfica de 31 columnas con números.
function BarrasPorDia({ datos }: { datos: { dia: number; total: number }[] }) {
  const max = Math.max(1, ...datos.map((d) => d.total));
  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 120 }}>
        {datos.map((d) => (
          <div key={d.dia} title={`Día ${d.dia}: RD$ ${fmt(d.total)}`} style={{
            flex: 1, minWidth: 3, borderRadius: "3px 3px 0 0",
            height: d.total ? `${Math.max(4, (d.total / max) * 100)}%` : 2,
            background: d.total ? "var(--c-brand)" : "var(--c-border)",
          }} />
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--c-text-4)", marginTop: 6 }}>
        <span>1</span><span>{Math.ceil(datos.length / 2)}</span><span>{datos.length}</span>
      </div>
    </div>
  );
}

export default async function ContabilidadPage({
  params, searchParams,
}: { params: Promise<{ tenantId: string }>; searchParams: Promise<{ mes?: string }> }) {
  const { tenantId } = await params;
  const { mes: mesParam } = await searchParams;
  const { tenant } = await requerirRolPanel(tenantId, ["owner", "admin", "contador"]);

  const mes = mesValido(mesParam);
  const r = await resumenContable(tenantId, mes, tenant.estado !== "activo");
  const base = `/panel/${tenantId}/contabilidad`;
  const hoy = mesValido(undefined);
  const hayMovimiento = r.comprobantes + r.anulados > 0;
  const variacion = r.totalMesAnterior > 0 ? ((r.total - r.totalMesAnterior) / r.totalMesAnterior) * 100 : null;
  const labelTipo = (t: string) => TIPOS_ECF.find((x) => x.codigo === t)?.label ?? t;
  const maxCajero = Math.max(1, ...r.porCajero.map((c) => c.total));

  return (
    <div style={{ maxWidth: 1040, margin: "0 auto", fontFamily: "var(--font-sans)" }}>
      <PageHeader
        titulo="Contabilidad"
        descripcion="Lo facturado cada mes, quién lo emitió y cuánto falta por cobrar. Los comprobantes anulados no suman."
        acciones={
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 4, border: "1px solid var(--c-border)", borderRadius: "var(--radius-md)", background: "var(--c-surface)", padding: 3 }}>
              <Button variante="ghost" tamano="sm" href={`${base}?mes=${mesAnteriorDe(mes)}`} titulo="Mes anterior">←</Button>
              <span style={{ fontSize: 13, fontWeight: 700, minWidth: 130, textAlign: "center", textTransform: "capitalize" }}>{etiquetaDeMes(mes)}</span>
              <Button variante="ghost" tamano="sm" href={`${base}?mes=${mesSiguienteDe(mes)}`} disabled={mes >= hoy} titulo="Mes siguiente">→</Button>
            </div>
            <Button variante="secondary" href={`/api/tenant/contabilidad/exportar?t=${tenantId}&mes=${mes}`} disabled={!hayMovimiento}>
              ⬇ Descargar CSV
            </Button>
          </>
        }
      />

      {r.esPrueba && (
        <div style={{
          padding: "11px 14px", marginBottom: 18, borderRadius: "var(--radius-md)", fontSize: 12.5, lineHeight: 1.5,
          background: "var(--c-yellow-bg)", border: "1px solid var(--c-yellow-border)", color: "var(--c-yellow)",
        }}>
          <strong>Estás viendo datos de prueba.</strong> Así se verá tu contabilidad cuando factures de verdad; estas cifras no son fiscales.
        </div>
      )}

      {!hayMovimiento ? (
        <EmptyBlock
          titulo={`Sin comprobantes en ${etiquetaDeMes(mes)}`}
          texto="Cuando emitas facturas verás aquí el total facturado, el ITBIS, lo que falta por cobrar y el trabajo de cada cajero."
          accion={mes !== hoy ? <Button variante="secondary" href={base}>Ir al mes actual</Button> : undefined}
        />
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 18 }}>
            <StatCard etiqueta="Total facturado" valor={`RD$ ${fmt(r.total)}`} tono="brand"
              nota={variacion === null ? "Sin datos del mes anterior" : `${variacion >= 0 ? "▲" : "▼"} ${Math.abs(variacion).toFixed(0)}% vs. mes anterior`} />
            <StatCard etiqueta="ITBIS del mes" valor={`RD$ ${fmt(r.itbis)}`} nota={`Subtotal RD$ ${fmt(r.subtotal)}`} />
            <StatCard etiqueta="Por cobrar" valor={`RD$ ${fmt(r.porCobrar)}`} tono={r.porCobrar > 0 ? "warning" : undefined} nota={`Cobrado RD$ ${fmt(r.cobrado)}`} />
            <StatCard etiqueta="Comprobantes" valor={r.comprobantes.toLocaleString("es-DO")} nota={`Promedio RD$ ${fmt(r.ticketPromedio)}${r.anulados ? ` · ${r.anulados} anulados` : ""}`} />
          </div>

          <Card style={{ marginBottom: 18 }}>
            <CardTitle extra="Total facturado por día">Ritmo del mes</CardTitle>
            <BarrasPorDia datos={r.porDia} />
          </Card>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 14, marginBottom: 18 }}>
            <Card padding={0}>
              <div style={{ padding: "18px 20px 8px" }}><CardTitle>Por tipo de comprobante</CardTitle></div>
              <div style={{ ...tablaWrap, border: "none", borderRadius: 0 }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead><tr><th style={th}>Tipo</th><th style={{ ...th, textAlign: "right" }}>Cant.</th><th style={{ ...th, textAlign: "right" }}>ITBIS</th><th style={{ ...th, textAlign: "right" }}>Total</th></tr></thead>
                  <tbody>
                    {r.porTipo.map((t) => (
                      <tr key={t.tipo}>
                        <td style={td}><span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700 }}>{t.tipo}</span><div style={{ fontSize: 11, color: "var(--c-text-3)" }}>{labelTipo(t.tipo)}</div></td>
                        <td className="num" style={{ ...td, textAlign: "right" }}>{t.cantidad}</td>
                        <td className="num" style={{ ...td, textAlign: "right", color: "var(--c-text-3)" }}>{fmt(t.itbis)}</td>
                        <td className="num" style={{ ...td, textAlign: "right", fontWeight: 600 }}>{fmt(t.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card padding={0}>
              <div style={{ padding: "18px 20px 8px" }}><CardTitle>Por cajero / vendedor</CardTitle></div>
              <div style={{ padding: "4px 20px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
                {r.porCajero.map((c) => (
                  <div key={c.uid}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                      <Avatar nombre={c.nombre} tamano={28} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{c.nombre}</div>
                        <div style={{ fontSize: 11, color: "var(--c-text-3)" }}>{c.cantidad} comprobantes</div>
                      </div>
                      <div className="num" style={{ fontSize: 13, fontWeight: 700 }}>RD$ {fmt(c.total)}</div>
                    </div>
                    <div style={{ height: 5, background: "var(--c-border-lt)", borderRadius: 999 }}>
                      <div style={{ width: `${(c.total / maxCajero) * 100}%`, height: "100%", background: "var(--c-brand)", borderRadius: 999 }} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <Card padding={0}>
            <div style={{ padding: "18px 20px 8px" }}>
              <CardTitle extra={r.filas.length > 25 ? "Mostrando los 25 más recientes · el CSV trae todos" : undefined}>Comprobantes del mes</CardTitle>
            </div>
            <div style={{ ...tablaWrap, border: "none", borderRadius: 0 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr><th style={th}>Fecha</th><th style={th}>e-CF</th><th style={th}>Emitido por</th><th style={th}>Estado</th><th style={{ ...th, textAlign: "right" }}>Total</th></tr></thead>
                <tbody>
                  {r.filas.slice(0, 25).map((f) => (
                    <tr key={f.id} style={f.estado === "anulada" ? { opacity: 0.55 } : undefined}>
                      <td style={{ ...td, color: "var(--c-text-3)", whiteSpace: "nowrap" }}>{f.fecha}</td>
                      <td style={{ ...td, fontFamily: "var(--font-mono)", fontSize: 12 }}>{f.eCF}</td>
                      <td style={td}>{f.cajeroNombre || <span style={{ color: "var(--c-text-4)" }}>—</span>}</td>
                      <td style={td}><Pill tono={ESTADO_TONO[f.estado]}>{ESTADO_TXT[f.estado]}</Pill></td>
                      <td className="num" style={{ ...td, textAlign: "right", fontWeight: 600 }}>RD$ {fmt(f.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
