"use client";

import { useEffect, useMemo, useState } from "react";
import type { Cliente, Factura, LineaServicio, Producto, TipoECF } from "@/types";
import { calcTotales, fmt, genECF, localDate, resolverECFConfig, today, PLAZOS_CREDITO, TIPOS_ECF } from "@/types";
import { nextSecuencia } from "@/hooks/use-secuencias";
import { construirFacturaSimulada } from "@/lib/sandbox/emitir-factura";
import Modal from "./modal";
import TablaItems from "./tabla-items";
import { Boton, Campo, Input, Select } from "@/components/sandbox/ui";

const METODOS = ["Efectivo", "Tarjeta", "Transferencia", "Cheque"];
const LIMITE_IDENTIFICACION = 250_000;

export default function ModalNuevaFactura({
  open, onClose, onSave, tenantId, clientes, productos, nombreEmisor, rncEmisor, rootDomain,
}: {
  open: boolean; onClose: () => void; tenantId: string;
  onSave: (data: Omit<Factura, "id">) => Promise<void>;
  clientes: Cliente[]; productos: Producto[]; nombreEmisor: string; rncEmisor: string; rootDomain: string;
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

  useEffect(() => {
    if (!open) return;
    setEsWalkIn(true); setClienteId(clientes[0]?.id ?? ""); setNombreWalkIn("Consumidor Final");
    setItems([]); setTipoECFManual(null); setTerminos("Contado"); setMetodoPago("Efectivo");
    setReferencia(""); setPlazo(PLAZOS_CREDITO[1]); setRncOcasional(""); setEsExtranjeroOcasional(false);
    setNotas(""); setError(""); setConfirmando(false);
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
      const p = productos.find((prod) => prod.controlaStock && prod.codigo.toLowerCase() === codigo.toLowerCase());
      if (!p) return;
      setItems((prev) => {
        const existIdx = prev.findIndex((it) => it.codigo === p.codigo && it.fromCatalog);
        if (existIdx >= 0) {
          return prev.map((it, i) => (i === existIdx ? { ...it, cant: it.cant + 1 } : it));
        }
        return [...prev, {
          codigo: p.codigo, descripcion: p.nombre, modo: "unidad",
          cant: 1, pax: 1, precio: p.precio, descuentoMonto: 0, itbis: p.itbis,
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

  const emitir = async () => {
    if (items.length === 0) return;
    if (!esWalkIn && !clienteId) return;
    setEmitiendo(true); setError("");
    try {
      const seq = await nextSecuencia(tenantId, tipoECF);
      const eCF = genECF(tipoECF, seq);
      const fecha = today();
      const vencimientoECF = (() => { const d = new Date(); d.setFullYear(d.getFullYear() + 1); return localDate(d); })();
      const fechaVencimientoPago = terminos === "Crédito"
        ? (() => { const d = new Date(); d.setDate(d.getDate() + parseInt(plazo, 10)); return localDate(d); })()
        : undefined;

      const factura = await construirFacturaSimulada({
        tipoECF, noFactura: String(seq), eCF, fecha, vencimientoECF,
        terminos, metodoPago: terminos === "Contado" ? metodoPago : undefined,
        clienteId: esWalkIn ? "walk-in" : clienteId, items: items.filter((i) => i.descripcion.trim()),
        esConsumidorFinal: esWalkIn, nombreConsumidor: esWalkIn ? nombreWalkIn : undefined,
        rncCompradorOcasional: necesitaIdentificacion && rncOcasional.trim() ? rncOcasional.trim() : undefined,
        esExtranjeroComprador: necesitaIdentificacion && esExtranjeroOcasional ? true : undefined,
        modalidadPago: terminos === "Contado" ? "unico" : "plazo", fechaVencimientoPago,
        notas: notas.trim() || undefined,
        idTransaccion: metodoPago !== "Efectivo" ? referencia : undefined,
        rncEmisor, nombreEmisor, rootDomain,
      });
      await onSave(factura);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo emitir la factura. Intenta de nuevo.");
    } finally { setEmitiendo(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Nueva factura" maxWidth={760}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Campo label="Cliente">
          <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
            <button type="button" onClick={() => setEsWalkIn(true)} style={{
              flex: 1, padding: "8px 6px", fontSize: 12, fontWeight: 600, borderRadius: 6, cursor: "pointer",
              border: `1px solid ${esWalkIn ? "var(--c-brand)" : "var(--c-border)"}`,
              background: esWalkIn ? "var(--c-brand-bg)" : "var(--c-surface)",
            }}>Consumidor final (sin registrar)</button>
            <button type="button" onClick={() => setEsWalkIn(false)} disabled={clientes.length === 0} style={{
              flex: 1, padding: "8px 6px", fontSize: 12, fontWeight: 600, borderRadius: 6,
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
          {productos.some((p) => p.controlaStock) && (
            <div style={{ fontSize: 11, color: "var(--c-text-3)", marginBottom: 6 }}>
              📷 Puedes escanear un código de barras en cualquier momento para agregar el producto.
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
                  flex: 1, padding: "8px 6px", fontSize: 12, fontWeight: 600, borderRadius: 6, cursor: "pointer",
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
          <div style={{ padding: 12, background: "var(--c-yellow-bg)", border: "1px solid var(--c-yellow-border)", borderRadius: 6 }}>
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
            style={{ width: "100%", padding: "9px 11px", border: "1px solid #d1d5db", borderRadius: 5, fontSize: 13 }} />
        </Campo>

        {items.length > 0 && (
          <div style={{ borderTop: "1px solid var(--c-border)", paddingTop: 10, display: "flex", justifyContent: "flex-end", gap: 24, fontSize: 13 }}>
            <span>Subtotal: RD$ {fmt(totales.sub)}</span>
            <span>ITBIS: RD$ {fmt(totales.itbis)}</span>
            <span style={{ fontWeight: 700 }}>Total: RD$ {fmt(totales.total)}</span>
          </div>
        )}

        {error && <div style={{ fontSize: 12, color: "#991b1b" }}>{error}</div>}

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <Boton variant="secondary" onClick={onClose}>Cancelar</Boton>
          <Boton
            onClick={() => setConfirmando(true)}
            disabled={items.length === 0 || (!esWalkIn && !clienteId) || (necesitaIdentificacion && !rncOcasional.trim() && !esExtranjeroOcasional)}
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
            background: "var(--c-surface)", borderRadius: 10, padding: 24, maxWidth: 420, width: "100%",
          }}>
            <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "1.05rem", marginBottom: 10 }}>
              Confirmar emisión — {tipoECF}
            </h3>
            <p style={{ fontSize: 13, color: "var(--c-text-3)", marginBottom: 16 }}>
              Esto generará un comprobante de prueba con QR simulado. En el entorno de prueba no se
              envía nada a la DGII real.
            </p>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>Total: RD$ {fmt(totales.total)}</div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <Boton variant="secondary" onClick={() => setConfirmando(false)} disabled={emitiendo}>Atrás</Boton>
              <Boton onClick={emitir} disabled={emitiendo}>{emitiendo ? "Emitiendo..." : "Emitir factura"}</Boton>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
