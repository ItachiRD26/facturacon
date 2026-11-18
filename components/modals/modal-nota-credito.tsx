"use client";

import { useRef, useState } from "react";
import type { Factura, LineaServicio } from "@/types";
import { calcTotales, fmt } from "@/types";
import { ErrorRedEmision, construirFacturaReal } from "@/lib/produccion/emitir-factura";
import Modal from "./modal";
import { Boton, Campo, Input } from "@/components/sandbox/ui";

// Corregir o anular un comprobante YA EMITIDO ante la DGII: se emite una NOTA DE CRÉDITO (E34) que lo referencia.
// Es la forma correcta de «anular» o devolver: el comprobante original se mantiene y la nota lo compensa, tal como lo ve
// la DGII. Usa la misma ruta de emisión de siempre (/api/facturas/emitir), que ya soporta E34; aquí solo se arma el pedido.
// Pendiente (no incluido): devolver el stock al inventario y ajustar la cuenta por cobrar de una venta a crédito.
export default function ModalNotaCredito({
  open, onClose, tenantId, factura, onEmitida,
}: {
  open: boolean; onClose: () => void; tenantId: string; factura: Factura | null; onEmitida: (nota: Factura) => void;
}) {
  // La pantalla que lo usa le pone `key={factura.id}`: cada comprobante empieza de cero (todas las líneas completas).
  const [cantidades, setCantidades] = useState<Record<number, string>>(() => (factura ? Object.fromEntries(factura.items.map((l, i) => [i, String(l.cant)])) : {}));
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const llave = useRef<string | null>(null);          // se conserva si falló la red: así un reintento no duplica la nota
  if (!factura) return null;

  const lineas: LineaServicio[] = factura.items.map((l, i) => ({ ...l, cant: Math.min(l.cant, Math.max(0, Number(cantidades[i]) || 0)) })).filter((l) => l.cant > 0);
  const totalNota = calcTotales(lineas).total;
  const totalOriginal = calcTotales(factura.items).total;
  const esTotal = lineas.length === factura.items.length && lineas.every((l, i) => l.cant === factura.items[i].cant);

  const emitir = async () => {
    setError("");
    if (!motivo.trim()) { setError("Escribe el motivo de la nota de crédito."); return; }
    if (lineas.length === 0) { setError("Deja al menos una línea con cantidad mayor que cero."); return; }
    setEnviando(true);
    try {
      llave.current ??= crypto.randomUUID();
      const nota = await construirFacturaReal({
        tenantId, idempotencyKey: llave.current, tipoECF: "E34",
        terminos: "Contado", metodoPago: factura.metodoPago, clienteId: factura.clienteId, items: lineas,
        esConsumidorFinal: factura.esConsumidorFinal, nombreConsumidor: factura.nombreConsumidor,
        rncCompradorOcasional: factura.rncCompradorOcasional, esExtranjeroComprador: factura.esExtranjeroComprador,
        modalidadPago: "unico", eCFRef: factura.eCF, motivoNota: motivo.trim().slice(0, 90),
        notas: `Nota de crédito sobre ${factura.eCF}`,
      });
      llave.current = null;
      onEmitida(nota);
      onClose();
    } catch (e) {
      // Si fue un fallo de red se mantiene la llave (no sabemos si llegó); si el servidor respondió con error, se descarta.
      if (!(e instanceof ErrorRedEmision)) llave.current = null;
      setError(e instanceof Error ? e.message : "No se pudo emitir la nota de crédito.");
    } finally { setEnviando(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title={`Nota de crédito sobre ${factura.eCF}`}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <p style={{ fontSize: 13, color: "var(--c-text-2)", lineHeight: 1.55, margin: 0 }}>
          El comprobante original <b>no se borra</b>: se emite una <b>nota de crédito (E34)</b> que lo compensa ante la DGII.
          Para anularlo por completo deja todas las líneas con su cantidad original; para una devolución parcial baja las cantidades.
        </p>

        <div style={{ border: "1px solid var(--c-border)", borderRadius: 10, overflow: "hidden" }}>
          {factura.items.map((l, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 92px 96px", gap: 10, alignItems: "center", padding: "9px 12px", borderTop: i ? "1px solid var(--c-border-lt)" : "none", fontSize: 13 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.descripcion}</div>
                <div style={{ fontSize: 11, color: "var(--c-text-4)" }}>Vendido: {l.cant} · {fmt(l.precio)} c/u</div>
              </div>
              <Input type="number" min={0} max={l.cant} step="any" value={cantidades[i] ?? ""} aria-label={`Cantidad a acreditar de ${l.descripcion}`}
                onChange={(e) => setCantidades((c) => ({ ...c, [i]: e.target.value }))} />
              <div style={{ textAlign: "right", fontFamily: "var(--font-mono)" }}>{fmt(calcTotales([{ ...l, cant: Math.min(l.cant, Math.max(0, Number(cantidades[i]) || 0)) }]).total)}</div>
            </div>
          ))}
        </div>

        <Campo label="Motivo (aparece en el comprobante)">
          <Input value={motivo} maxLength={90} placeholder="Ej. Devolución de mercancía, error en el precio…" onChange={(e) => setMotivo(e.target.value)} />
        </Campo>

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--c-text-2)" }}>
          <span>{esTotal ? "Anulación total" : "Devolución parcial"} · original {fmt(totalOriginal)}</span>
          <b style={{ fontFamily: "var(--font-mono)" }}>Nota: {fmt(totalNota)}</b>
        </div>

        {error && <div role="alert" style={{ fontSize: 12.5, color: "#991b1b", lineHeight: 1.5 }}>{error}</div>}

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <Boton variant="secondary" onClick={onClose}>Cancelar</Boton>
          <Boton onClick={emitir} disabled={enviando}>{enviando ? "Emitiendo…" : "Emitir nota de crédito"}</Boton>
        </div>
      </div>
    </Modal>
  );
}
