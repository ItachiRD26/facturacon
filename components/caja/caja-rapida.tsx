"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Barcode, CheckCircle, CreditCard, FileText, Keyboard, Minus, Money, Plus, Printer, Storefront, UserCircle, Warning, X } from "@phosphor-icons/react/dist/ssr";
import type { Factura, LineaServicio, Producto } from "@/types";
import { calcLinea, calcTotales, fmt, genECF, localDate, today } from "@/types";
import { nextSecuencia } from "@/hooks/use-secuencias";
import { construirFacturaSimulada } from "@/lib/sandbox/emitir-factura";
import { construirFacturaReal, ErrorRedEmision } from "@/lib/produccion/emitir-factura";
import { imprimirHtml } from "@/lib/print/imprimir";
import FacturaTermica from "@/components/print/factura-termica";

// Caja rápida: el flujo del cajero para una venta de mostrador. Siempre emite una
// E32 (factura de consumo) a consumidor final: sin elegir cliente, tipo ni nada.
// El lector de código de barras escribe en el campo de arriba (siempre enfocado):
// escanear = agregar. Al terminar se cobra (efectivo con devuelta o tarjeta) y se
// decide si se imprime. Para crédito fiscal, gubernamental, etc. hay un botón que abre
// el formulario completo de siempre ("Otro tipo de factura").
const LIMITE_IDENTIFICACION = 250_000;
const BILLETES = [100, 200, 500, 1000, 2000, 5000];

const norm = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
const redondear = (n: number) => Math.round(n * 100) / 100;

function pitar(ok: boolean) {
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC(); const osc = ctx.createOscillator(); const gan = ctx.createGain();
    osc.frequency.value = ok ? 1100 : 220; gan.gain.value = 0.06;
    osc.connect(gan); gan.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + (ok ? 0.07 : 0.22));
    osc.onended = () => ctx.close();
  } catch { /* el sonido es opcional */ }
}

interface Props {
  open: boolean; onClose: () => void; onOtroTipo: () => void;
  tenantId: string; productos: Producto[]; modo: "sandbox" | "produccion";
  nombreEmisor: string; nombreComercialEmisor?: string; rncEmisor: string; rootDomain?: string;
  logoTermicoUrl?: string; esMuestra: boolean;
  onSave: (data: Factura | Omit<Factura, "id">) => Promise<void>;
  bloqueo?: string;
}

type Metodo = "efectivo" | "tarjeta";
interface Fin { factura: Factura; cambio: number; metodo: Metodo; imprimir: boolean; adicional?: number; advertencia?: string }

function CajaAbierta({
  open, onClose, onOtroTipo, tenantId, productos, modo, nombreEmisor, nombreComercialEmisor, rncEmisor, rootDomain,
  logoTermicoUrl, esMuestra, onSave, bloqueo,
}: Props) {
  const [lineas, setLineas] = useState<LineaServicio[]>([]);
  const [texto, setTexto] = useState("");
  const [sel, setSel] = useState(0);
  const [aviso, setAviso] = useState("");
  const [pago, setPago] = useState<Metodo | null>(null);
  const [recibido, setRecibido] = useState("");
  const [referencia, setReferencia] = useState("");
  const [verCliente, setVerCliente] = useState(false);
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [rncOcasional, setRncOcasional] = useState("");
  const [extranjero, setExtranjero] = useState(false);
  const [verProductos, setVerProductos] = useState(false);
  const [emitiendo, setEmitiendo] = useState(false);
  const [error, setError] = useState("");
  const [fin, setFin] = useState<Fin | null>(null);

  const entradaRef = useRef<HTMLInputElement>(null);
  const recibidoRef = useRef<HTMLInputElement>(null);
  const impresionRef = useRef<HTMLDivElement>(null);
  const llave = useRef<string | null>(null);
  const yaImpresa = useRef<string | null>(null);

  const enfocar = useCallback(() => { setTimeout(() => entradaRef.current?.focus(), 0); }, []);

  const reiniciar = useCallback(() => {
    setLineas([]); setTexto(""); setSel(0); setAviso(""); setPago(null); setRecibido(""); setReferencia("");
    setVerCliente(false); setNombre(""); setTelefono(""); setRncOcasional(""); setExtranjero(false);
    setVerProductos(false); setEmitiendo(false); setError(""); setFin(null); llave.current = null; yaImpresa.current = null;
    enfocar();
  }, [enfocar]);

  useEffect(() => { enfocar(); }, [enfocar]);

  const activos = useMemo(() => productos.filter((p) => p.activo !== false), [productos]);
  const totales = useMemo(() => calcTotales(lineas), [lineas]);
  const total = redondear(totales.total);
  const necesitaId = total >= LIMITE_IDENTIFICACION;

  const sugerencias = useMemo(() => {
    const q = norm(texto.replace(/^\d+(?:[.,]\d+)?\s*[*xX]\s*/, "").trim());
    if (q.length < 2) return [];
    return activos.filter((p) => norm(p.nombre).includes(q) || norm(p.codigo).includes(q)).slice(0, 6);
  }, [texto, activos]);

  const agregar = (p: Producto, cant = 1) => {
    setLineas((prev) => {
      const i = prev.findIndex((l) => l.servicioId === p.id);
      if (i >= 0) return prev.map((l, k) => (k === i ? { ...l, cant: redondear(l.cant + cant) } : l));
      return [...prev, {
        codigo: p.codigo, descripcion: p.nombre, modo: "unidad", cant, pax: 1, precio: p.precio,
        descuentoMonto: 0, itbis: p.itbis, servicioId: p.id, fromCatalog: true,
      }];
    });
  };

  const procesarEntrada = () => {
    const crudo = texto.trim();
    if (!crudo) return;
    const m = crudo.match(/^(\d+(?:[.,]\d+)?)\s*[*xX]\s*(.+)$/); // "3*7501234" = 3 unidades
    const cant = m ? Math.max(0.01, Number(m[1].replace(",", "."))) : 1;
    const q = (m ? m[2] : crudo).trim();
    const exacto = activos.find((p) => p.codigo.toLowerCase() === q.toLowerCase());
    const candidatos = exacto ? [exacto] : sugerencias;
    const p = exacto ?? candidatos[sel] ?? candidatos[0];
    if (!p) { setAviso(`No encontré «${q}». Revisa el código o búscalo por nombre.`); pitar(false); return; }
    agregar(p, cant); setTexto(""); setSel(0); setAviso(""); pitar(true);
  };

  const cambiarCant = (i: number, valor: number) => {
    if (!Number.isFinite(valor) || valor <= 0) { setLineas((prev) => prev.filter((_, k) => k !== i)); return; }
    setLineas((prev) => prev.map((l, k) => (k === i ? { ...l, cant: redondear(valor) } : l)));
  };

  // ── Cobro ────────────────────────────────────────────────────────────────────
  const recibidoNum = recibido.trim() === "" ? total : redondear(Number(recibido.replace(/,/g, "")) || 0);
  const cambio = pago === "efectivo" ? redondear(recibidoNum - total) : 0;
  const faltaDinero = pago === "efectivo" && cambio < 0;
  const faltaId = necesitaId && !rncOcasional.trim() && !extranjero;
  const sugeridos = BILLETES.filter((b) => b >= total).slice(0, 3);

  const abrirCobro = useCallback((m: Metodo) => {
    if (lineas.length === 0 || bloqueo || fin) return;
    setPago(m); setError("");
    setTimeout(() => recibidoRef.current?.focus(), 30);
  }, [lineas.length, bloqueo, fin]);

  const emitir = async (imprimir: boolean) => {
    if (lineas.length === 0 || emitiendo || !pago || faltaDinero || faltaId) return;
    setEmitiendo(true); setError("");
    try {
      const metodoPago = pago === "tarjeta" ? "Tarjeta" : "Efectivo";
      const datos = {
        tipoECF: "E32" as const, terminos: "Contado" as const, metodoPago, clienteId: "walk-in", items: lineas,
        esConsumidorFinal: true, nombreConsumidor: nombre.trim() || "Consumidor Final", telefonoConsumidor: telefono.trim() || undefined,
        rncCompradorOcasional: necesitaId && rncOcasional.trim() ? rncOcasional.trim() : undefined,
        esExtranjeroComprador: necesitaId && extranjero ? true : undefined,
        modalidadPago: "unico" as const, idTransaccion: pago === "tarjeta" && referencia.trim() ? referencia.trim() : undefined,
      };
      let factura: Factura & { advertencia?: string; adicional?: { costoRD: number } };
      // Lo que se le pasa a `onSave`: en producción el servidor ya guardó la factura (llega con id y no se
      // vuelve a guardar); en el sandbox va SIN id para que la página la guarde.
      let paraGuardar: Factura | Omit<Factura, "id">;
      if (modo === "produccion") {
        factura = await construirFacturaReal({ ...datos, tenantId, idempotencyKey: (llave.current ??= crypto.randomUUID()) });
        paraGuardar = factura;
      } else {
        const seq = await nextSecuencia(tenantId, "E32");
        const venc = (() => { const f = new Date(); f.setFullYear(f.getFullYear() + 1); return localDate(f); })();
        const simulada = await construirFacturaSimulada({
          ...datos, noFactura: String(seq), eCF: genECF("E32", seq), fecha: today(), vencimientoECF: venc,
          rncEmisor, nombreEmisor, rootDomain: rootDomain ?? "",
        });
        paraGuardar = simulada;
        factura = { id: "caja", ...simulada }; // solo para mostrar e imprimir
      }
      await onSave(paraGuardar);
      llave.current = null;
      setFin({ factura, cambio: Math.max(0, cambio), metodo: pago, imprimir, adicional: factura.adicional?.costoRD, advertencia: factura.advertencia });
    } catch (err) {
      // Si no hubo respuesta (red), la llave se conserva para no duplicar el comprobante al reintentar.
      if (!(err instanceof ErrorRedEmision)) llave.current = null;
      setError(err instanceof Error ? err.message : "No se pudo emitir la factura. Intenta de nuevo.");
    } finally { setEmitiendo(false); }
  };

  // Imprime sola, justo después de emitir, si se eligió "Cobrar e imprimir".
  const imprimirActual = useCallback(() => {
    const html = impresionRef.current?.innerHTML;
    if (html && fin) void imprimirHtml(html, "termica", fin.factura.eCF);
  }, [fin]);
  useEffect(() => {
    if (!fin?.imprimir || yaImpresa.current === fin.factura.eCF) return;
    yaImpresa.current = fin.factura.eCF;
    const t = setTimeout(imprimirActual, 150);
    return () => clearTimeout(t);
  }, [fin, imprimirActual]);

  // ── Teclado ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "F2") { e.preventDefault(); abrirCobro("efectivo"); return; }
      if (e.key === "F4") { e.preventDefault(); abrirCobro("tarjeta"); return; }
      if (e.key === "Escape") {
        if (fin) return;
        if (pago) { setPago(null); enfocar(); return; }
        if (lineas.length === 0) onClose();
        return;
      }
      // Un lector de código de barras "teclea" aunque el foco se haya ido a otro lado:
      // se devuelve el foco al campo de escaneo para no perder el primer dígito.
      const el = document.activeElement;
      const enCampo = el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement;
      if (!enCampo && !fin && !pago && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) entradaRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, abrirCobro, enfocar, fin, pago, lineas.length, onClose]);

  if (!open || typeof document === "undefined") return null;

  const empresaImpresion = { nombre: nombreEmisor, nombreComercial: nombreComercialEmisor, rnc: rncEmisor, logoTermicoUrl };

  return createPortal(
    <div className="caja-fondo" role="dialog" aria-modal="true" aria-label="Caja">
      <header className="caja-barra">
        <Storefront size={22} weight="duotone" color="var(--c-brand)" aria-hidden="true" />
        <strong style={{ fontSize: 16 }}>Caja</strong>
        <span className="caja-sub">Factura de consumo (E32) · consumidor final</span>
        <span style={{ flex: 1 }} />
        <span className="caja-atajos" aria-hidden="true"><Keyboard size={16} aria-hidden="true" /> F2 efectivo · F4 tarjeta</span>
        <button type="button" className="caja-btn-sec" onClick={onOtroTipo}><FileText size={16} aria-hidden="true" /> Otro tipo de factura</button>
        <button type="button" className="caja-cerrar" onClick={onClose} aria-label="Cerrar la caja"><X size={20} aria-hidden="true" /></button>
      </header>

      {bloqueo && <div role="alert" className="caja-bloqueo"><Warning size={18} weight="fill" aria-hidden="true" /> {bloqueo}</div>}

      <div className="caja-cuerpo">
        <section className="caja-izq" aria-label="Productos de la venta">
          <div className="caja-escan">
            <Barcode size={26} weight="duotone" aria-hidden="true" className="caja-escan-ico" />
            <input
              ref={entradaRef} value={texto} autoFocus autoComplete="off" spellCheck={false}
              aria-label="Escanea el código de barras o escribe el nombre del producto"
              placeholder="Escanea el código o escribe el nombre del producto"
              disabled={!!fin}
              onChange={(e) => { setTexto(e.target.value); setSel(0); setAviso(""); }}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); procesarEntrada(); }
                else if (e.key === "ArrowDown" && sugerencias.length) { e.preventDefault(); setSel((s) => Math.min(s + 1, sugerencias.length - 1)); }
                else if (e.key === "ArrowUp" && sugerencias.length) { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
              }}
            />
            {sugerencias.length > 0 && (
              <ul className="caja-sug" role="listbox" aria-label="Productos que coinciden">
                {sugerencias.map((p, i) => (
                  <li key={p.id} role="option" aria-selected={i === sel}>
                    <button type="button" className={i === sel ? "act" : ""} onMouseDown={(e) => { e.preventDefault(); agregar(p); setTexto(""); setSel(0); pitar(true); enfocar(); }}>
                      <span>{p.nombre}<small>{p.codigo}{p.controlaStock && p.stock !== undefined ? ` · quedan ${p.stock}` : ""}</small></span><b>RD$ {fmt(p.precio)}</b>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {aviso && <div role="alert" className="caja-aviso">{aviso}</div>}

          <div className="caja-lineas">
            {lineas.length === 0 ? (
              <div className="caja-vacio">
                <Barcode size={54} weight="duotone" aria-hidden="true" />
                <strong>Escanea un producto para empezar</strong>
                <span>También puedes escribir parte del nombre, o tocar un producto de abajo. Con «3*código» agregas 3 unidades.</span>
              </div>
            ) : lineas.map((l, i) => (
              <div className="caja-linea" key={`${l.servicioId ?? l.codigo}-${i}`}>
                <div className="caja-linea-nom"><span>{l.descripcion}</span><small>{l.codigo} · RD$ {fmt(l.precio)}{l.itbis ? "" : " · exento"}</small>{(() => {
                  const p = activos.find((x) => x.id === l.servicioId);
                  return p?.controlaStock && p.stock !== undefined && l.cant > p.stock
                    ? <small className="caja-sin-stock"><Warning size={12} weight="fill" aria-hidden="true" /> {p.stock > 0 ? `Solo hay ${p.stock} en inventario` : "Sin existencias en inventario"}</small>
                    : null;
                })()}</div>
                <div className="caja-cant" role="group" aria-label={`Cantidad de ${l.descripcion}`}>
                  <button type="button" onClick={() => cambiarCant(i, l.cant - 1)} aria-label="Quitar una unidad" disabled={!!fin}><Minus size={16} weight="bold" aria-hidden="true" /></button>
                  <input type="number" inputMode="decimal" min={0} step="any" value={l.cant} disabled={!!fin}
                    onChange={(e) => setLineas((prev) => prev.map((x, k) => (k === i ? { ...x, cant: Number(e.target.value) } : x)))}
                    onBlur={(e) => cambiarCant(i, Number(e.target.value))} aria-label="Cantidad" />
                  <button type="button" onClick={() => cambiarCant(i, l.cant + 1)} aria-label="Agregar una unidad" disabled={!!fin}><Plus size={16} weight="bold" aria-hidden="true" /></button>
                </div>
                <div className="caja-linea-tot">RD$ {fmt(calcLinea(l).total)}</div>
                <button type="button" className="caja-quitar" onClick={() => cambiarCant(i, 0)} aria-label={`Quitar ${l.descripcion}`} disabled={!!fin}><X size={16} aria-hidden="true" /></button>
              </div>
            ))}
          </div>

          <div>
            <button type="button" className="caja-link" onClick={() => setVerProductos((v) => !v)} aria-expanded={verProductos}>
              {verProductos ? "Ocultar productos" : `Ver productos (${activos.length}) para tocar y agregar`}
            </button>
            {verProductos && (
              <div className="caja-tiles">
                {activos.map((p) => (
                  <button type="button" key={p.id} className="caja-tile" onClick={() => { agregar(p); pitar(true); enfocar(); }} disabled={!!fin}>
                    <span>{p.nombre}</span><b>RD$ {fmt(p.precio)}</b>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        <aside className="caja-der" aria-label="Cobro">
          <div>
            <div className="caja-etq">Total a pagar</div>
            <div className="caja-total" aria-live="polite">RD$ {fmt(total)}</div>
            <div className="caja-desg">Subtotal {fmt(totales.sub)} · ITBIS {fmt(totales.itbis)}</div>
          </div>

          {!fin && (
            <>
              <button type="button" className="caja-cliente-btn" onClick={() => setVerCliente((v) => !v)} aria-expanded={verCliente}>
                <UserCircle size={18} aria-hidden="true" /> Datos del cliente <span>(opcional)</span>
              </button>
              {verCliente && (
                <div className="caja-cliente">
                  <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre" aria-label="Nombre del cliente (opcional)" autoComplete="off" />
                  <input value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="Teléfono" aria-label="Teléfono del cliente (opcional)" inputMode="tel" autoComplete="off" />
                </div>
              )}
              {necesitaId && (
                <div className="caja-id">
                  <b>Venta de RD$ {fmt(LIMITE_IDENTIFICACION)} o más: la DGII exige identificar al comprador.</b>
                  <input value={rncOcasional} onChange={(e) => setRncOcasional(e.target.value)} placeholder="RNC o cédula del comprador" aria-label="RNC o cédula del comprador" inputMode="numeric" />
                  <label><input type="checkbox" checked={extranjero} onChange={(e) => setExtranjero(e.target.checked)} /> Es extranjero</label>
                </div>
              )}

              {!pago ? (
                <div className="caja-metodos">
                  <button type="button" className="caja-metodo" onClick={() => abrirCobro("efectivo")} disabled={lineas.length === 0 || !!bloqueo}>
                    <Money size={26} weight="duotone" aria-hidden="true" /> Efectivo <kbd>F2</kbd>
                  </button>
                  <button type="button" className="caja-metodo" onClick={() => abrirCobro("tarjeta")} disabled={lineas.length === 0 || !!bloqueo}>
                    <CreditCard size={26} weight="duotone" aria-hidden="true" /> Tarjeta <kbd>F4</kbd>
                  </button>
                </div>
              ) : (
                <div className="caja-cobro">
                  <div className="caja-cobro-tit">
                    {pago === "efectivo" ? <Money size={20} weight="duotone" aria-hidden="true" /> : <CreditCard size={20} weight="duotone" aria-hidden="true" />}
                    {pago === "efectivo" ? "Pago en efectivo" : "Pago con tarjeta"}
                    <button type="button" className="caja-link" onClick={() => { setPago(null); enfocar(); }}>Cambiar</button>
                  </div>

                  {pago === "efectivo" ? (
                    <>
                      <label className="caja-etq" htmlFor="caja-recibido">El cliente paga con</label>
                      <input id="caja-recibido" ref={recibidoRef} className="caja-recibido" inputMode="decimal" autoComplete="off"
                        placeholder={fmt(total)} value={recibido} onChange={(e) => setRecibido(e.target.value.replace(/[^\d.,]/g, ""))}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void emitir(true); } }} />
                      <div className="caja-billetes">
                        <button type="button" onClick={() => setRecibido("")}>Exacto</button>
                        {sugeridos.map((b) => <button type="button" key={b} onClick={() => setRecibido(String(b))}>{b.toLocaleString("es-DO")}</button>)}
                      </div>
                      <div className={`caja-devuelta ${faltaDinero ? "falta" : ""}`} aria-live="polite">
                        {faltaDinero ? <>Faltan <b>RD$ {fmt(-cambio)}</b></> : cambio > 0 ? <>Devolver <b>RD$ {fmt(cambio)}</b></> : <>Pago exacto</>}
                      </div>
                    </>
                  ) : (
                    <>
                      <label className="caja-etq" htmlFor="caja-ref">No. de aprobación (opcional)</label>
                      <input id="caja-ref" ref={recibidoRef} className="caja-ref" value={referencia} autoComplete="off"
                        onChange={(e) => setReferencia(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void emitir(true); } }} />
                    </>
                  )}

                  {error && <div role="alert" className="caja-aviso">{error}</div>}
                  <button type="button" className="caja-cobrar" onClick={() => void emitir(true)} disabled={emitiendo || faltaDinero || faltaId}>
                    <Printer size={22} weight="bold" aria-hidden="true" /> {emitiendo ? "Emitiendo…" : "Cobrar e imprimir factura"}
                  </button>
                  <button type="button" className="caja-btn-sec caja-sin" onClick={() => void emitir(false)} disabled={emitiendo || faltaDinero || faltaId}>
                    Cobrar sin imprimir (el cliente no la quiere)
                  </button>
                </div>
              )}
            </>
          )}

          {fin && (
            <div className="caja-fin" role="status">
              <CheckCircle size={46} weight="fill" color="var(--c-green)" aria-hidden="true" />
              <strong>Venta completada</strong>
              {fin.metodo === "efectivo" && fin.cambio > 0 && <div className="caja-devuelta">Devolver <b>RD$ {fmt(fin.cambio)}</b></div>}
              <span className="caja-nota">{fin.factura.eCF}{esMuestra ? " · comprobante de prueba" : ""}</span>
              {fin.adicional ? <span className="caja-nota">Pasó el tope de tu plan: se cobra como adicional (RD$ {fmt(fin.adicional)}) al cierre del mes.</span> : null}
              {fin.advertencia ? <span className="caja-nota">{fin.advertencia} El envío a la DGII se puede reintentar desde Facturas.</span> : null}
              <button type="button" className="caja-cobrar" onClick={reiniciar} autoFocus>Nueva venta</button>
              <button type="button" className="caja-btn-sec caja-sin" onClick={imprimirActual}><Printer size={16} aria-hidden="true" /> {fin.imprimir ? "Imprimir otra vez" : "Imprimir factura"}</button>
            </div>
          )}
        </aside>
      </div>

      {/* Copia de la factura para imprimir (no se ve): la toma el iframe de impresión. */}
      {fin && (
        <div style={{ position: "fixed", left: -9999, top: 0 }} aria-hidden="true">
          <div ref={impresionRef}><FacturaTermica factura={fin.factura} empresa={empresaImpresion} esMuestra={esMuestra} /></div>
        </div>
      )}
    </div>,
    document.body,
  );
}

// La caja solo existe mientras está abierta: así cada vez que se abre empieza con el estado en blanco.
export default function CajaRapida(props: Props) {
  return props.open ? <CajaAbierta {...props} /> : null;
}
