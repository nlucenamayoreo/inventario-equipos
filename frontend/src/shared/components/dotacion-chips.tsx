import type { Cargo } from '../api/types';
import type { Modelo } from '../domain/modelo';
import { nivelDe, restringidoDe } from '../domain/reglas';
import { Pill } from './ui';

/** Dotación de un cargo: obligatorio / opcional / no permitido (+ artículo restringido). */
export function DotacionChips({ m, cargo }: { m: Modelo; cargo: Cargo | undefined | null }) {
  return (
    <div className="chips">
      {m.tipos.map((t) => {
        const lv = nivelDe(cargo, t.id);
        const r = restringidoDe(cargo, t.id);
        const extra = r ? ` (${m.etiquetaArticulo(r)})` : '';
        if (lv === 'obligatorio')
          return (
            <Pill key={t.id} tono="blu">
              {t.nombre} · Obligatorio{extra}
            </Pill>
          );
        if (lv === 'permitido')
          return (
            <Pill key={t.id} tono="neu">
              {t.nombre} · Opcional{extra}
            </Pill>
          );
        return (
          <Pill key={t.id} tono="na" className="tachado">
            {t.nombre} · No permitido
          </Pill>
        );
      })}
    </div>
  );
}
