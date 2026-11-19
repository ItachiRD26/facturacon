"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Cliente, Factura, LineaServicio, Producto, TipoECF } from "@/types";
import { calcTotales, fmt, genECF, localDate, resolverECFConfig, today, PLAZOS_CREDITO, TIPOS_ECF } from "@/types";
import { nextSecuencia } from "@/hooks/use-secuencias";
import { construirFacturaSimulada } from "@/lib/sandbox/emitir-factura";
import { construirFacturaReal, ErrorRedEmision } from "@/lib/produccion/emitir-factura";
import Modal from "./modal";
import TablaItems from "./tabla-items";
import { Boton, Campo, Input, Select } from "@/components/sandbox/ui";
import Icon from "@/components/ui/icon";
import FacturaA4 from "@/components/print/factura-a4";
import FacturaTermica from "@/components/print/factura-termica";

const METODOS = ["Efectivo", "Tarjeta", "Transferencia", "Cheque"];
const LIMITE_IDENTIFICACION = 250_000;

export default function ModalNuevaFactura({
  open, onClose, onSave, tenantId, clientes, productos, nombreEmisor, nombreComercialEmisor, rncEmisor, rootDomain, modo = "sandbox",
  logoA4Url, logoTermicoUrl, bloqueo,
}: {
  open: boolean; onClose: () => void; tenantId: string;
  // En modo "produccion" llega un Factura completa (con id, ya persistida
  // server-side); en modo "sandbox" llega sin id (la crea onSave).
  onSave: (data: Factura | Omit<Factura, "id">) => Promise<void>;
  clientes: Cliente[]; productos: Producto[];
  // nombreEmisor/rncEmisor: en modo "produccion" el backend igual vuelve a
  // leer tenants/{tenantId}/config/empresa antes de firmar (estos valores
  // aquí son solo para la vista previa del lado del cliente, antes de
  // emitir — no se usan para lo fiscal).
  nombreEmisor?: string; nombreComercialEmisor?: string; rncEmisor?: string; rootDomain?: string;
  logoA4Url?: string; logoTermicoUrl?: string;
  modo?: "sandbox" | "produccion";
  // Si viene, impide emitir y muestra este mensaje (ej. el plan de pago no está
  // activo). Evita llegar a un error del servidor DESPUÉS de reservar el e-NCF.
  bloqueo?: string;
}) {
  const [esWalkIn, setEsWalkIn] = useState(true);
  const [clienteId, setClienteId] = useState("");
  const [nombreWalkIn, setNombreWalkIn] = useState("Consumidor Final");
  const [items, setItems] = useState<LineaServicio[]>([]);
  const [tipoECFManual, setTipoECFManual] = useState<TipoECF | null>(null);
  const [terminos, setTerminos] = useState<"Contado" | "Crédito">("Contado");
  const [metodoPago, setMetodoPago] = useState("Efectivo");
  const [referencia, setReferencia] = useState("");
  const [plazo, setPlazo] = useState<string>(PLAZOS_CREDITO[1]);
  const [rncOcasional, setRncOcasional] = useState("");
  const [esExtranjeroOcasional, setEsExtranjeroOcasional] = useState(false);
  const [notas, setNotas] = useState("");
  const [emitiendo, setEmitiendo] = useState(false);
  const [error, setError] = useState("");
  const [confirmando, setConfirmando] = useState(false);
  // Llave de idempotencia de la emisión en curso: se conserva si falló la red
  // (para no duplicar el comprobante al reintentar) y se renueva en cualquier otro caso.
  const llaveEmision = useRef<string | null>(null);
  const [formatoPreview, setFormatoPreview] = useState<"a4" | "termica">("a4");

  useEffect(() => {
    if (!open) return;
    setEsWalkIn(true); setClienteId(clientes[0]?.id ?? ""); setNombreWalkIn("Consumidor Final");
    setItems([]); setTipoECFManual(null); setTerminos("Contado"); setMetodoPago("Efectivo");
    setReferencia(""); setPlazo(PLAZOS_CREDITO[1]); setRncOcasional(""); setEsExtranjeroOcasional(false);
    setNotas(""); setError(""); setConfirmando(false); llaveEmision.current = null;
  }, [open, clientes]);

  // ── Scanner de pistola de código de barras ───────────────────────
  // Funciona siempre, con o sin input enfocado. Detecta pistola por
  // velocidad: chars < 60ms entre sí = scan, no tipeo manual. Bloquea
  // esos chars para que no caigan en el input enfocado.
  useEffect(() => {
    if (!open) return;
    let buffer      = "";
    let lastKeyTime = 0;
    let enModoScan  = false;
    let timer: ReturnType<typeof setTimeout>;

    const procesarScan = (codigo: string) => {
      const p = productos.find((prod) => prod.codigo.toLowerCase() === codigo.toLowerCase());
      if (!p) return;
      setItems((prev) => {
        const existIdx = prev.findIndex((it) => it.codigo === p.codigo && it.fromCatalog);
        if (existIdx >= 0) {
          return prev.map((it, i) => (i === existIdx ? { ...it, cant: it.cant + 1 } : it));
        }
        return [...prev, {
          codigo: p.codigo, descripcion: p.nombre, modo: "unidad",
          cant: 1, pax: 1, precio: p.precio, descuentoMonto: 0, itbis: p.itbis, incluyeITBIS: p.itbis > 0,
          servicioId: p.id, fromCatalog: true,
        }];
      });
    };

    const onKey = (e: KeyboardEvent) => {
      const now         = Date.now();
      const msSinceLast = now - lastKeyTime;
      lastKeyTime       = now;

      if (e.key === "Enter") {
        if (enModoScan && buffer.length > 2) {
          e.preventDefault();
          procesarScan(buffer.trim());
        }
        buffer     = "";
        enModoScan = false;
        clearTimeout(timer);
        return;
      }

      if (e.key.length !== 1) return;

      if (msSinceLast < 60 && buffer.length > 0) enModoScan = true;
      if (enModoScan) e.preventDefault();

      buffer += e.key;
      clearTimeout(timer);
      timer = setTimeout(() => { buffer = ""; enModoScan = false; }, 250);
    };

    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); clearTimeout(timer); };
  }, [open, productos]);

  const cliente = clientes.find((c) => c.id === clienteId);
  const ecfConfig = useMemo(() => resolverECFConfig(cliente, esWalkIn, false), [cliente, esWalkIn]);
  const tipoECF = ecfConfig.locked ? ecfConfig.tipoDefault : (tipoECFManual ?? ecfConfig.tipoDefault);
  const totales = calcTotales(items);
  const necesitaIdentificacion = tipoECF === "E32" && totales.total >= LIMITE_IDENTIFICACION;

  // Borrador para la vista previa antes de emitir — usa los mismos datos que
  // se enviarían, pero SIN pedir número de comprobante real todavía
  // (nextSecuencia() reserva/incrementa el contador, así que solo se llama
  // en emitir(), nunca aquí, para no gastar un número por solo mirar).
  const facturaPreview: Factura = {
    id: "preview", noFactura: "(pendiente)", eCF: `${tipoECF} — se asigna al emitir`,
    tipoECF, fecha: today(),
    vencimientoECF: (() => { const d = new Date(); d.setFullYear(d.getFullYear() + 1); return localDate(d); })(),
    terminos, metodoPago: terminos === "Contado" ? metodoPago : undefined,
    clienteId: esWalkIn ? "walk-in" : clienteId, items: items.filter((i) => i.descripcion.trim()),
    esConsumidorFinal: esWalkIn, nombreConsumidor: esWalkIn ? nombreWalkIn : undefined,
    rncCompradorOcasional: necesitaIdentificacion && rncOcasional.trim() ? rncOcasional.trim() : undefined,
    esExtranjeroComprador: necesitaIdentificacion && esExtranjeroOcasional ? true : undefined,
    estado: terminos === "Contado" ? "pagada" : "pendiente",
    modalidadPago: terminos === "Contado" ? "unico" : "plazo",
    notas: notas.trim() || undefined,
  };

  // Solo sandbox: la numeración de prueba se pide al contador de demostración.
  const datosSandbox = async <T extends object>(d: T) => {
    const seq = await nextSecuencia(tenantId, tipoECF);
    const vencimientoECF = (() => { const f = new Date(); f.setFullYear(f.getFullYear() + 1); return localDate(f); })();
    return { ...d, noFactura: String(seq), eCF: genECF(tipoECF, seq), fecha: today(), vencimientoECF };
  };

  const emitir = async () => {
    if (items.length === 0) return;
    if (!esWalkIn && !clienteId) return;
    setEmitiendo(true); setError("");
    try {
      // En producción el e-NCF, la fecha y el vencimiento los asigna el servidor
      // dentro de la secuencia autorizada por la DGII; en el sandbox se simulan.
      const fechaVencimientoPago = terminos === "Crédito"
        ? (() => { const d = new Date(); d.setDate(d.getDate() + parseInt(plazo, 10)); return localDate(d); })()
        : undefined;

      const datosComunes = {
        tipoECF,
        terminos, metodoPago: terminos === "Contado" ? metodoPago : undefined,
        clienteId: esWalkIn ? "walk-in" : clienteId, items: items.filter((i) => i.descripcion.trim()),
        esConsumidorFinal: esWalkIn, nombreConsumidor: esWalkIn ? nombreWalkIn : undefined,
        rncCompradorOcasional: necesitaIdentificacion && rncOcasional.trim() ? rncOcasional.trim() : undefined,
        esExtranjeroComprador: necesitaIdentificacion && esExtranjeroOcasional ? true : undefined,
        modalidadPago: (terminos === "Contado" ? "unico" : "plazo") as "unico" | "plazo", fechaVencimientoPago,
        notas: notas.trim() || undefined,
        idTransaccion: metodoPago !== "Efectivo" ? referencia : undefined,
      };

      const factura = modo === "produccion"
        ? await construirFacturaReal({ ...datosComunes, tenantId, idempotencyKey: (llaveEmision.current ??= crypto.randomUUID()) })
        : await construirFacturaSimulada({ ...await datosSandbox(datosComunes), rncEmisor: rncEmisor ?? "", nombreEmisor: nombreEmisor ?? "", rootDomain: rootDomain ?? "" });
      await onSave(factura);
      llaveEmision.current = null;
      const adicional = (factura as { adicional?: { costoRD: number } }).adicional;
      if (adicional) {
        window.alert(`Este comprobante pasó el tope de comprobantes de tu plan: se cobra como adicional (RD$ ${adicional.costoRD.toLocaleString("es-DO", { minimumFractionDigits: 2 })}) al cierre del mes.`);
      }
      if ("advertencia" in factura && factura.advertencia) {
        window.alert(`${factura.advertencia}
El número ${factura.eCF} ya quedó registrado; el envío a la DGII se podrá reintentar desde Facturas.`);
      }
      onClose();
    } catch (err) {
      if (!(err instanceof ErrorRedEmision)) llaveEmision.current = null;
      setError(err instanceof Error ? err.message : "No se pudo emitir la factura. Intenta de nuevo.");
    } finally { setEmitiendo(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Nueva factura" maxWidth={760}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Campo label="Cliente">
          <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
            <button type="button" onClick={() => setEsWalkIn(true)} style={{
              flex: 1, padding: "8px 6px", fontSize: 12, fontWeight: 600, borderRadius: 10, cursor: "pointer",
              border: `1px solid ${esWalkIn ? "var(--c-brand)" : "var(--c-border)"}`,
              background: esWalkIn ? "var(--c-brand-bg)" : "var(--c-surface)",
            }}>Consumidor final (sin registrar)</button>
            <button type="button" onClick={() => setEsWalkIn(false)} disabled={clientes.length === 0} style={{
              flex: 1, padding: "8px 6px", fontSize: 12, fontWeight: 600, borderRadius: 10,
              cursor: clientes.length === 0 ? "not-allowed" : "pointer",
              border: `1px solid ${!esWalkIn ? "var(--c-brand)" : "var(--c-border)"}`,
              background: !esWalkIn ? "var(--c-brand-bg)" : "var(--c-surface)",
            }}>Cliente registrado</button>
          </div>
          {esWalkIn ? (
            <Input value={nombreWalkIn} onChange={(e) => setNombreWalkIn(e.target.value)} placeholder="Nombre (opcional)" />
          ) : (
            <Select value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
              <option value="">Selecciona un cliente</option>
              {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </Select>
          )}
        </Campo>

        <Campo label="Líneas de la factura">
          {productos.length > 0 && (
            <div style={{ fontSize: 11, color: "var(--c-text-3)", marginBottom: 6, display: "flex", alignItems: "center", gap: 5 }}>
              <Icon name="scan" size={12} />
              Puedes escanear un código de barras en cualquier momento para agregar el producto.
            </div>
          )}
          <TablaItems items={items} onChange={setItems} productos={productos} />
        </Campo>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Campo label="Tipo de comprobante">
            {ecfConfig.locked ? (
              <Input value={`${tipoECF} — ${TIPOS_ECF.find((t) => t.codigo === tipoECF)?.label.split("—")[1]?.trim() ?? ""}`} disabled />
            ) : (
              <Select value={tipoECF} onChange={(e) => setTipoECFManual(e.target.value as TipoECF)}>
                {ecfConfig.tiposDisponibles.map((t) => (
                  <option key={t} value={t}>{TIPOS_ECF.find((x) => x.codigo === t)?.label ?? t}</option>
                ))}
              </Select>
            )}
            <div style={{ fontSize: 11, color: "var(--c-text-3)", marginTop: 4 }}>{ecfConfig.motivo}</div>
          </Campo>

          <Campo label="Forma de pago">
            <div style={{ display: "flex", gap: 6 }}>
              {(["Contado", "Crédito"] as const).map((t) => (
                <button key={t} type="button" onClick={() => setTerminos(t)} style={{
                  flex: 1, padding: "8px 6px", fontSize: 12, fontWeight: 600, borderRadius: 10, cursor: "pointer",
                  border: `1px solid ${terminos === t ? "var(--c-brand)" : "var(--c-border)"}`,
                  background: terminos === t ? "var(--c-brand-bg)" : "var(--c-surface)",
                }}>{t}</button>
              ))}
            </div>
          </Campo>
        </div>

        {terminos === "Contado" ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Campo label="Método de pago">
              <Select value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)}>
                {METODOS.map((m) => <option key={m} value={m}>{m}</option>)}
              </Select>
            </Campo>
            {metodoPago !== "Efectivo" && (
              <Campo label="Referencia / No. de aprobación">
                <Input value={referencia} onChange={(e) => setReferencia(e.target.value)} />
              </Campo>
            )}
          </div>
        ) : (
          <Campo label="Plazo de crédito">
            <Select value={plazo} onChange={(e) => setPlazo(e.target.value)}>
              {PLAZOS_CREDITO.map((p) => <option key={p} value={p}>{p}</option>)}
            </Select>
          </Campo>
        )}

        {necesitaIdentificacion && (
          <div style={{ padding: 12, background: "var(--c-yellow-bg)", border: "1px solid var(--c-yellow-border)", borderRadius: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>
              Venta ≥ RD$ {fmt(LIMITE_IDENTIFICACION)} — la DGII exige identificar al comprador
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <Input value={rncOcasional} onChange={(e) => setRncOcasional(e.target.value)} placeholder="RNC o cédula del comprador" style={{ flex: 1 }} />
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, whiteSpace: "nowrap" }}>
                <input type="checkbox" checked={esExtranjeroOcasional} onChange={(e) => setEsExtranjeroOcasional(e.target.checked)} />
                Es extranjero
              </label>
            </div>
          </div>
        )}

        <Campo label="Notas (opcional)">
          <textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={2}
            style={{ width: "100%", padding: "9px 11px", border: "1px solid #CDD1C9", borderRadius: 5, fontSize: 13 }} />
        </Campo>

        {items.length > 0 && (
          <div style={{ borderTop: "1px solid var(--c-border)", paddingTop: 10, display: "flex", justifyContent: "flex-end", gap: 24, fontSize: 13 }}>
            <span>Subtotal: RD$ {fmt(totales.sub)}</span>
            <span>ITBIS: RD$ {fmt(totales.itbis)}</span>
            <span style={{ fontWeight: 700 }}>Total: RD$ {fmt(totales.total)}</span>
          </div>
        )}

        {bloqueo && (
          <div role="alert" style={{ padding: "10px 12px", fontSize: 12.5, lineHeight: 1.5, borderRadius: 8, background: "var(--c-yellow-bg)", border: "1px solid var(--c-yellow-border)", color: "var(--c-yellow)" }}>
            {bloqueo}
          </div>
        )}
        {error && <div style={{ fontSize: 12, color: "#991b1b" }}>{error}</div>}

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <Boton variant="secondary" onClick={onClose}>Cancelar</Boton>
          <Boton
            onClick={() => setConfirmando(true)}
            disabled={!!bloqueo || items.length === 0 || (!esWalkIn && !clienteId) || (necesitaIdentificacion && !rncOcasional.trim() && !esExtranjeroOcasional)}
          >
            Revisar y emitir
          </Boton>
        </div>
      </div>

      {confirmando && (
        <div onClick={() => !emitiendo && setConfirmando(false)} style={{
          position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 1100,
          display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            background: "var(--c-surface)", borderRadius: 10, maxWidth: formatoPreview === "a4" ? 640 : 420,
            width: "100%", maxHeight: "92vh", display: "flex", flexDirection: "column", overflow: "hidden",
          }}>
            <div style={{ padding: "18px 24px 0" }}>
              <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "1.05rem", marginBottom: 6 }}>
                Confirmar emisión — {tipoECF}
              </h3>
              <p style={{ fontSize: 12, color: "var(--c-text-3)", marginBottom: 14 }}>
                {modo === "produccion"
                  ? "Esto firma y envía el comprobante a la DGII de verdad. No se puede deshacer."
                  : "Esto generará un comprobante de prueba con QR simulado. En el entorno de prueba no se envía nada a la DGII real."}
              </p>
              <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                <button type="button" onClick={() => setFormatoPreview("a4")} style={{
                  padding: "6px 12px", fontSize: 12, fontWeight: 600, borderRadius: 10, cursor: "pointer",
                  border: `1px solid ${formatoPreview === "a4" ? "var(--c-brand)" : "var(--c-border)"}`,
                  background: formatoPreview === "a4" ? "var(--c-brand-bg)" : "transparent",
                }}>Formato A4</button>
                <button type="button" onClick={() => setFormatoPreview("termica")} style={{
                  padding: "6px 12px", fontSize: 12, fontWeight: 600, borderRadius: 10, cursor: "pointer",
                  border: `1px solid ${formatoPreview === "termica" ? "var(--c-brand)" : "var(--c-border)"}`,
                  background: formatoPreview === "termica" ? "var(--c-brand-bg)" : "transparent",
                }}>Térmica 80mm</button>
              </div>
            </div>

            <div style={{ overflowY: "auto", padding: "0 24px 20px", display: "flex", justifyContent: "center" }}>
              {formatoPreview === "a4" ? (
                <FacturaA4 factura={facturaPreview} cliente={cliente}
                  empresa={{ nombre: nombreEmisor ?? "", nombreComercial: nombreComercialEmisor, rnc: rncEmisor ?? "", logoA4Url, logoTermicoUrl }}
                  esMuestra />
              ) : (
                <FacturaTermica factura={facturaPreview} cliente={cliente}
                  empresa={{ nombre: nombreEmisor ?? "", nombreComercial: nombreComercialEmisor, rnc: rncEmisor ?? "", logoA4Url, logoTermicoUrl }}
                  esMuestra />
              )}
            </div>

            <div style={{ padding: "14px 24px", borderTop: "1px solid var(--c-border)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>Total: RD$ {fmt(totales.total)}</div>
              {error && <div style={{ fontSize: 12, color: "#991b1b" }}>{error}</div>}
              <div style={{ display: "flex", gap: 8 }}>
                <Boton variant="secondary" onClick={() => setConfirmando(false)} disabled={emitiendo}>Atrás</Boton>
                <Boton onClick={emitir} disabled={emitiendo}>{emitiendo ? "Emitiendo..." : "Emitir factura"}</Boton>
              </div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
