import type { Id } from '../api/types';
import type { Modelo } from '../domain/modelo';
import { useSesion } from '../state/datos';
import { Campo } from './ui';

/**
 * Responsable del resguardo: persona con acceso que queda a cargo del equipo cuando no está en manos de
 * su titular. Vacío = quien realiza la acción.
 */
export function CustodioSelect({
  m,
  value,
  onChange,
  label = 'Responsable del resguardo *',
}: {
  m: Modelo;
  value: Id | null;
  onChange: (id: Id | null) => void;
  label?: string;
}) {
  const yo = useSesion().data?.operadorId ?? null;
  return (
    <Campo label={label}>
      <select
        className="in"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
      >
        <option value="">Yo{yo != null ? ` (${m.nombreOperador(yo)})` : ''}</option>
        {m
          .custodios()
          .filter((o) => o.id !== yo)
          .map((o) => (
            <option key={o.id} value={o.id}>
              {o.nombre} · {o.rolNombre ?? 'Sin rol'}
            </option>
          ))}
      </select>
    </Campo>
  );
}
