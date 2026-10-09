import type { Permiso } from '../../../shared/api/types';
import type { GrupoPermisos } from '../hooks/use-seguridad-controller';

/** Casillas de permisos agrupadas por módulo. */
export function PermisosChecks({
  grupos,
  sel,
  onChange,
  disabled,
  todos,
}: {
  grupos: GrupoPermisos;
  sel: Set<Permiso>;
  onChange?: (sel: Set<Permiso>) => void;
  disabled?: boolean;
  /** Muestra todas marcadas (rol del sistema). */
  todos?: boolean;
}) {
  const alternar = (p: Permiso) => {
    const s = new Set(sel);
    if (s.has(p)) s.delete(p);
    else s.add(p);
    onChange?.(s);
  };
  return (
    <div className="col" style={{ gap: 10 }}>
      {grupos.map((g) => (
        <fieldset key={g.modulo} className="panel" style={{ gap: 6, margin: 0 }}>
          <legend className="etiqueta" style={{ padding: '0 4px' }}>
            {g.modulo}
          </legend>
          {g.permisos.map((p) => (
            <label
              key={p.codigo}
              className="fila"
              style={{ gap: 8, flexWrap: 'nowrap', alignItems: 'flex-start' }}
            >
              <input
                type="checkbox"
                checked={todos || sel.has(p.codigo)}
                disabled={disabled}
                onChange={() => alternar(p.codigo)}
                style={{ marginTop: 2 }}
              />
              <span>
                {p.descripcion}{' '}
                <span className="tenue mono" style={{ fontSize: 11 }}>
                  {p.codigo}
                </span>
              </span>
            </label>
          ))}
        </fieldset>
      ))}
    </div>
  );
}
