"use client";

import { Calculator, Crown, Receipt, Check, Lock, Package } from "@phosphor-icons/react/dist/ssr";
import { useSandbox } from "@/contexts/SandboxContext";
import { MODULO_ETIQUETA, ROLES_PRUEBA, ROL_PRUEBA_RESUMEN, ROL_PRUEBA_TITULO, modulosDeRol } from "@/lib/sandbox/roles-prueba";
import type { RolMembership } from "@/types/tenant";

const ICONOS: Record<string, typeof Receipt> = { vendedor: Receipt, almacen: Package, contador: Calculator, owner: Crown };

// Panel visible del entorno de prueba: elige con qué rol de tu equipo quieres ver el
// sistema. Antes era un desplegable "Ver como…" escondido en la barra lateral, que no
// se entendía. Aquí se ve quién eres ahora, qué hace esa persona y qué ve y qué no.
export default function PanelRolPrueba() {
  const { rol, setRol } = useSandbox();
  const { ve, noVe } = modulosDeRol(rol);

  return (
    <section aria-label="Probar el sistema como cada persona de tu equipo" data-tour="panel-rol" className="rolp">
      <div className="rolp-fila">
        <div className="rolp-titulo">
          <span className="rolp-etiqueta">Probando como</span>
          <span className="rolp-sub">Cada persona de tu equipo ve algo distinto</span>
        </div>
        <div role="radiogroup" aria-label="Rol" className="rolp-seg">
          {ROLES_PRUEBA.map((r: RolMembership) => {
            const Icono = ICONOS[r];
            return (
              <button key={r} type="button" role="radio" aria-checked={rol === r} onClick={() => setRol(r)} className="rolp-op">
                <Icono size={18} weight={rol === r ? "fill" : "duotone"} aria-hidden="true" />
                {ROL_PRUEBA_TITULO[r]}
              </button>
            );
          })}
        </div>
      </div>

      <p className="rolp-resumen">{ROL_PRUEBA_RESUMEN[rol]}</p>

      <div className="rolp-chips" aria-label={`Qué ve un ${ROL_PRUEBA_TITULO[rol]}`}>
        {ve.map((m) => (
          <span key={m} className="rolp-chip rolp-ve"><Check size={12} weight="bold" aria-hidden="true" />{MODULO_ETIQUETA[m]}</span>
        ))}
        {noVe.map((m) => (
          <span key={m} className="rolp-chip rolp-no" title={`Un ${ROL_PRUEBA_TITULO[rol]} no ve ${MODULO_ETIQUETA[m]}`}><Lock size={12} weight="bold" aria-hidden="true" />{MODULO_ETIQUETA[m]}</span>
        ))}
      </div>
    </section>
  );
}
