"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Tenant } from "@/types/tenant";
import type { Abono, Cotizacion, CuentaPorCobrar, Factura } from "@/types";
import { calcTotales, genECF, localDate, resolverECFConfig, today } from "@/types";
import { nextSecuencia } from "@/hooks/use-secuencias";
import { useClientes } from "@/hooks/use-clientes";
import { useProductos } from "@/hooks/use-productos";
import { useCotizaciones } from "@/hooks/use-cotizaciones";
import { useFacturas } from "@/hooks/use-facturas";
import { useFacturasRecibidas } from "@/hooks/use-facturas-recibidas";
import { useCuentasPorCobrar } from "@/hooks/use-cuentas-por-cobrar";
import { construirFacturaSimulada } from "@/lib/sandbox/emitir-factura";
import type { DatosConversion } from "@/components/modals/modal-convertir-cotizacion";
import TabDashboard from "@/components/sandbox/tab-dashboard";
import TabClientes from "@/components/sandbox/tab-clientes";
import TabInventario from "@/components/sandbox/tab-inventario";
import TabCotizaciones from "@/components/sandbox/tab-cotizaciones";
import TabFacturas from "@/components/sandbox/tab-facturas";
import TabRecibidas from "@/components/sandbox/tab-recibidas";
import TabCxC from "@/components/sandbox/tab-cxc";
import { sans, serif } from "@/components/sandbox/ui";

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "localhost:3000";

type TabId = "dashboard" | "clientes" | "inventario" | "cotizaciones" | "facturas" | "recibidas" | "cxc";

const TABS: { id: TabId; label: string }[] = [
  { id: "dashboard", label: "Resumen" },
  { id: "clientes", label: "Clientes" },
  { id: "inventario", label: "Inventario" },
  { id: "cotizaciones", label: "Cotizaciones" },
  { id: "facturas", label: "Facturas" },
  { id: "recibidas", label: "Facturas recibidas" },
  { id: "cxc", label: "Cuentas por cobrar" },
];

function SandboxContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tenantId = searchParams.get("t") ?? "";

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [cargandoTenant, setCargandoTenant] = useState(true);
  const [tab, setTab] = useState<TabId>("dashboard");

  useEffect(() => {
    if (!tenantId) { setCargandoTenant(false); return; }
    getDoc(doc(db, "tenants", tenantId)).then((snap) => {
      if (snap.exists()) setTenant({ id: snap.id, ...snap.data() } as Tenant);
      setCargandoTenant(false);
    });
  }, [tenantId]);

  const clientesHook = useClientes(tenantId);
  const productosHook = useProductos(tenantId);
  const cotizacionesHook = useCotizaciones(tenantId);
  const facturasHook = useFacturas(tenantId);
  const recibidasHook = useFacturasRecibidas(tenantId);
  const cxcHook = useCuentasPorCobrar(tenantId);

  if (!tenantId || (!cargandoTenant && !tenant)) {
    return (
      <main style={{ maxWidth: 480, margin: "80px auto", padding: "0 24px", fontFamily: sans, textAlign: "center" }}>
        <p style={{ fontSize: 13, color: "var(--c-text-3)" }}>
          No encontramos tu empresa de prueba. Vuelve a empezar el registro.
        </p>
        <a href="/onboarding" style={{ color: "var(--c-brand)", fontWeight: 600, fontSize: 13 }}>← Volver al onboarding</a>
      </main>
    );
  }

  if (cargandoTenant || !tenant) {
    return <main style={{ padding: 60, textAlign: "center", fontFamily: sans, color: "var(--c-text-3)" }}>Cargando...</main>;
  }

  const empresa = { nombre: tenant.nombreNegocio, rnc: tenant.rnc };

  const crearCxCSiCredito = async (factura: Omit<Factura, "id">) => {
    if (factura.terminos !== "Crédito" || !factura.fechaVencimientoPago) return;
    const totales = calcTotales(factura.items);
    const cuenta: Omit<CuentaPorCobrar, "id"> = {
      clienteId: factura.clienteId, numeroFactura: factura.eCF, fecha: factura.fecha,
      fechaVencimiento: factura.fechaVencimientoPago, monto: totales.total, pagado: 0,
      devuelto: 0, creditos: 0, estado: "vigente", abonos: [],
    };
    await cxcHook.agregar(cuenta);
  };

  const guardarFactura = async (data: Omit<Factura, "id">) => {
    await facturasHook.agregar(data);
    await crearCxCSiCredito(data);
  };

  const convertirCotizacion = async (cotizacion: Cotizacion, datos: DatosConversion) => {
    const cliente = clientesHook.clientes.find((c) => c.id === cotizacion.clienteId);
    const ecfConfig = resolverECFConfig(cliente, false, false);
    const tipoECF = ecfConfig.tipoDefault;
    const seq = await nextSecuencia(tenantId, tipoECF);
    const eCF = genECF(tipoECF, seq);
    const vencimientoECF = (() => { const d = new Date(); d.setFullYear(d.getFullYear() + 1); return localDate(d); })();
    const fechaVencimientoPago = datos.terminos === "Crédito"
      ? (() => { const d = new Date(); d.setDate(d.getDate() + parseInt(datos.plazo ?? "30", 10)); return localDate(d); })()
      : undefined;

    const factura = await construirFacturaSimulada({
      tipoECF, noFactura: String(seq), eCF, fecha: today(), vencimientoECF,
      terminos: datos.terminos, metodoPago: datos.metodoPago, clienteId: cotizacion.clienteId,
      items: cotizacion.items, modalidadPago: datos.terminos === "Contado" ? "unico" : "plazo",
      fechaVencimientoPago, idTransaccion: datos.referencia,
      rncEmisor: tenant.rnc, nombreEmisor: tenant.nombreNegocio, rootDomain: ROOT_DOMAIN,
    });

    await facturasHook.agregar(factura);
    await cotizacionesHook.actualizar(cotizacion.id, { estado: "convertida", facturaRef: eCF });
    await crearCxCSiCredito(factura);
  };

  const registrarAbono = async (cuenta: CuentaPorCobrar, abono: Omit<Abono, "id" | "registradoEn">) => {
    await cxcHook.registrarAbono(cuenta, abono);
  };

  return (
    <main style={{ fontFamily: sans, minHeight: "100vh", background: "var(--c-bg)" }}>
      <div style={{
        position: "sticky", top: 0, zIndex: 50, background: "#111827", color: "#fff",
        padding: "10px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap",
      }}>
        <div style={{ fontSize: 12 }}>
          <strong>Entorno de prueba</strong> — datos y comprobantes simulados, nada se envía a la DGII real.
        </div>
        <button onClick={() => router.push("/panel")} style={{
          padding: "7px 16px", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer",
          border: "none", background: "var(--c-brand)", color: "#fff",
        }}>
          Listo, comenzar certificación →
        </button>
      </div>

      <div style={{ maxWidth: 1040, margin: "0 auto", padding: "24px 24px 60px" }}>
        <h1 style={{ fontFamily: serif, fontSize: "1.4rem", marginBottom: 2 }}>{tenant.nombreNegocio}</h1>
        <p style={{ fontSize: 12, color: "var(--c-text-3)", marginBottom: 20 }}>
          RNC {tenant.rnc} · Prueba el sistema completo antes de certificarte ante la DGII.
        </p>

        <div style={{ display: "flex", gap: 4, marginBottom: 20, flexWrap: "wrap", borderBottom: "1px solid var(--c-border)" }}>
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: "9px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", border: "none",
              background: "transparent", color: tab === t.id ? "var(--c-brand)" : "var(--c-text-3)",
              borderBottom: tab === t.id ? "2px solid var(--c-brand)" : "2px solid transparent",
            }}>{t.label}</button>
          ))}
        </div>

        {tab === "dashboard" && (
          <TabDashboard
            facturas={facturasHook.facturas} cotizaciones={cotizacionesHook.cotizaciones}
            clientes={clientesHook.clientes} productos={productosHook.productos} cuentas={cxcHook.cuentas}
          />
        )}
        {tab === "clientes" && (
          <TabClientes clientes={clientesHook.clientes} agregar={clientesHook.agregar} actualizar={clientesHook.actualizar} eliminar={clientesHook.eliminar} />
        )}
        {tab === "inventario" && (
          <TabInventario productos={productosHook.productos} agregar={productosHook.agregar} actualizar={productosHook.actualizar} eliminar={productosHook.eliminar} />
        )}
        {tab === "cotizaciones" && (
          <TabCotizaciones
            cotizaciones={cotizacionesHook.cotizaciones} clientes={clientesHook.clientes} productos={productosHook.productos}
            tenantId={tenantId} onSave={cotizacionesHook.agregar} onConvertir={convertirCotizacion} cambiarEstado={cotizacionesHook.cambiarEstado}
          />
        )}
        {tab === "facturas" && (
          <TabFacturas
            facturas={facturasHook.facturas} clientes={clientesHook.clientes} productos={productosHook.productos}
            empresa={empresa} rncEmisor={tenant.rnc} rootDomain={ROOT_DOMAIN} tenantId={tenantId}
            onSave={guardarFactura} cambiarEstado={facturasHook.cambiarEstado}
          />
        )}
        {tab === "recibidas" && (
          <TabRecibidas recibidas={recibidasHook.recibidas} agregar={recibidasHook.agregar} eliminar={recibidasHook.eliminar} />
        )}
        {tab === "cxc" && (
          <TabCxC cuentas={cxcHook.cuentas} clientes={clientesHook.clientes} registrarAbono={registrarAbono} />
        )}
      </div>
    </main>
  );
}

export default function SandboxPage() {
  return (
    <Suspense fallback={<main style={{ padding: 60, textAlign: "center" }}>Cargando...</main>}>
      <SandboxContent />
    </Suspense>
  );
}
