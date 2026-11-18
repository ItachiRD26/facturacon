"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { collection, onSnapshot, orderBy, query, where, type Unsubscribe } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { excluirMuestra } from "@/lib/tenant/excluir-muestra";

// Escucha COMPARTIDA de una colección de la empresa.
//
// Antes cada pantalla abría su propio listener y lo cerraba al salir: al pasar de «Facturas» al «Dashboard» y de
// vuelta, Firestore volvía a leer (y a cobrar) la colección ENTERA cada vez. Ahora hay una sola escucha por
// colección y por empresa, y se comparte entre pantallas y componentes:
//  - la primera pantalla que la pide la abre; las demás reutilizan lo ya descargado, sin leer otra vez;
//  - al salir de la última pantalla no se cierra enseguida: se retiene RETENCION_MS por si la persona vuelve
//    (navegar entre pantallas es lo normal), y solo entonces se libera;
//  - al cerrar sesión se cierra todo y se vacía la memoria (los datos de una empresa no se quedan en el navegador).
// Los cambios llegan igual en tiempo real; solo se evitan las relecturas completas.
const RETENCION_MS = 120_000;

interface Estado { datos: unknown[]; cargando: boolean; error: string | null }
interface Entrada { estado: Estado; oyentes: Set<() => void>; baja: Unsubscribe | null; temporizador: ReturnType<typeof setTimeout> | null }

const VACIO: Estado = { datos: [], cargando: true, error: null };
const almacen = new Map<string, Entrada>();

export interface Descriptor {
  tenantId: string;
  coleccion: string;
  orden: [campo: string, sentido: "asc" | "desc"];
  /** Filtro de igualdad (p. ej. un cajero solo ve sus facturas: la regla de Firestore lo exige en la consulta). */
  donde?: [campo: string, valor: string];
  /** Mensaje que ve la persona si la lectura falla. */
  mensajeError: string;
}

const claveDe = (d: Descriptor) => `${d.tenantId}|${d.coleccion}|${d.donde ? d.donde.join("=") : ""}|${d.orden.join(":")}`;
const avisar = (e: Entrada) => e.oyentes.forEach((cb) => cb());

function abrir(e: Entrada, d: Descriptor): Unsubscribe {
  // Solo en desarrollo: lleva la cuenta de cuántas veces se abre cada escucha (sirve para comprobar que no se relee).
  if (process.env.NODE_ENV !== "production") {
    const w = window as unknown as { __escuchasAbiertas?: string[] };
    (w.__escuchasAbiertas ??= []).push(claveDe(d));
  }
  const base = collection(db, "tenants", d.tenantId, d.coleccion);
  const q = d.donde ? query(base, where(d.donde[0], "==", d.donde[1]), orderBy(...d.orden)) : query(base, orderBy(...d.orden));
  return onSnapshot(q,
    (snap) => {
      e.estado = { datos: excluirMuestra(snap.docs.map((x) => ({ id: x.id, ...x.data() }) as { id: string; esMuestra?: boolean })), cargando: false, error: null };
      avisar(e);
    },
    (err) => {
      console.error(`[${d.coleccion}]`, err);
      e.estado = { datos: [], cargando: false, error: d.mensajeError };
      e.baja = null;                 // la escucha murió: la próxima pantalla que la pida la abre de nuevo
      avisar(e);
    },
  );
}

function suscribir(d: Descriptor, cb: () => void): () => void {
  const clave = claveDe(d);
  let e = almacen.get(clave);
  if (!e) { e = { estado: VACIO, oyentes: new Set(), baja: null, temporizador: null }; almacen.set(clave, e); }
  if (e.temporizador) { clearTimeout(e.temporizador); e.temporizador = null; }
  e.oyentes.add(cb);
  if (!e.baja) e.baja = abrir(e, d);
  const entrada = e;
  return () => {
    entrada.oyentes.delete(cb);
    if (entrada.oyentes.size === 0 && !entrada.temporizador) {
      entrada.temporizador = setTimeout(() => {
        if (entrada.oyentes.size > 0) return;
        entrada.baja?.();
        if (almacen.get(clave) === entrada) almacen.delete(clave);
      }, RETENCION_MS);
    }
  };
}

// Al cerrar sesión, o si cambia la persona conectada, se libera todo: los datos de una cuenta no pasan a otra.
if (typeof window !== "undefined") {
  let uidPrevio: string | null | undefined;
  onAuthStateChanged(auth, (u) => {
    const uid = u?.uid ?? null;
    const cambio = uidPrevio !== undefined && uid !== uidPrevio;
    uidPrevio = uid;
    if (!cambio) return;
    for (const e of almacen.values()) { if (e.temporizador) clearTimeout(e.temporizador); e.baja?.(); }
    almacen.clear();
  });
}

export function useColeccionCompartida<T>(args: { tenantId: string | null | undefined; coleccion: string; orden: [string, "asc" | "desc"]; donde?: [string, string]; mensajeError: string; activo?: boolean }): { datos: T[]; loading: boolean; error: string | null } {
  const { tenantId, coleccion, mensajeError, activo = true } = args;
  const [campoOrden, sentido] = args.orden;
  const dondeCampo = args.donde?.[0], dondeValor = args.donde?.[1];

  const d = useMemo<Descriptor | null>(
    () => (tenantId && activo ? { tenantId, coleccion, orden: [campoOrden, sentido], donde: dondeCampo && dondeValor ? [dondeCampo, dondeValor] : undefined, mensajeError } : null),
    [tenantId, activo, coleccion, campoOrden, sentido, dondeCampo, dondeValor, mensajeError],
  );
  const clave = d ? claveDe(d) : null;

  const subscribe = useCallback((cb: () => void) => (d ? suscribir(d, cb) : () => {}), [d]);
  const getSnapshot = useCallback(() => (clave ? almacen.get(clave)?.estado ?? VACIO : VACIO), [clave]);
  const estado = useSyncExternalStore(subscribe, getSnapshot, () => VACIO);

  return { datos: estado.datos as T[], loading: estado.cargando, error: estado.error };
}
