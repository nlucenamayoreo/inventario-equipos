import type { NivelDotacion } from '../../../shared/api/types';
import { Campo, NIVEL, Seccion, Tabla } from '../../../shared/components/ui';
import { nivelDe, restringidoDe } from '../../../shared/domain/reglas';
import type { Modelo } from '../../../shared/domain/modelo';
import type { CatalogosController } from '../hooks/use-catalogos-controller';

export function PerfilesDotacion({
  m,
  c,
  admin,
}: {
  m: Modelo;
  c: CatalogosController;
  admin: boolean;
}) {
  return (
    <Seccion
      titulo="Perfiles de dotación por cargo"
      caja
      extra={
        <span className="sec-nota" style={{ width: '100%' }}>
          Define qué equipos y artículos puede tener cada cargo. Se aplica al crear usuarios y al
          asignar equipos.
        </span>
      }
    >
      <div className="fila" style={{ alignItems: 'flex-start', gap: 20 }}>
        <div className="col" style={{ flex: '1 1 260px', minWidth: 0 }}>
          {admin && (
            <div className="fila" style={{ alignItems: 'flex-end', flexWrap: 'nowrap', gap: 8 }}>
              <Campo label="Nuevo cargo" style={{ flex: 1 }}>
                <input
                  className="in"
                  value={c.f.cargo}
                  onChange={c.set('cargo')}
                  onKeyDown={(e) => e.key === 'Enter' && c.addCargo()}
                />
              </Campo>
              <button
                type="button"
                className="btn btn-primario"
                onClick={c.addCargo}
                disabled={c.acc.pendiente}
              >
                Agregar
              </button>
            </div>
          )}
          {m.cargos.map((x) => {
            const nO = m.tiposIds.filter((t) => nivelDe(x, t) === 'obligatorio').length;
            const nN = m.tiposIds.filter((t) => nivelDe(x, t) === 'no_permitido').length;
            return (
              <button
                key={x.id}
                type="button"
                className={`cargo-btn${c.pc?.id === x.id ? ' on' : ''}`}
                aria-pressed={c.pc?.id === x.id}
                onClick={() => c.setCargoSel(x.id)}
              >
                <span style={{ fontWeight: 600 }}>{x.nombre}</span>
                <span style={{ fontSize: 12, color: 'var(--texto-2)' }}>
                  {c.usuariosCon((u) => u.cargoId === x.id)} usuarios · {nO} obligatorios · {nN} no
                  permitidos
                </span>
              </button>
            );
          })}
        </div>
        <div className="col" style={{ flex: '999 1 520px', minWidth: 0, gap: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 700 }}>Cargo: {c.pc?.nombre ?? '—'}</span>
          {c.pc && (
            <Tabla>
              <thead>
                <tr>
                  <th>Tipo de equipo</th>
                  <th>Nivel</th>
                  <th>Artículo permitido</th>
                </tr>
              </thead>
              <tbody>
                {m.tipos.map((t) => {
                  const lv = nivelDe(c.pc, t.id);
                  const restr = restringidoDe(c.pc, t.id);
                  const estilo =
                    lv === 'obligatorio'
                      ? { borderColor: 'var(--acento)', color: 'var(--blu)', fontWeight: 600 }
                      : lv === 'no_permitido'
                        ? { color: 'var(--tenue)' }
                        : undefined;
                  return (
                    <tr key={t.id}>
                      <td style={{ fontWeight: 600 }}>{t.nombre}</td>
                      <td>
                        <select
                          className="in"
                          aria-label={`Nivel de ${t.nombre}`}
                          style={estilo}
                          value={lv}
                          disabled={!admin || c.acc.pendiente}
                          onChange={(e) =>
                            c.cambiarDotacion(
                              t.id,
                              e.target.value as NivelDotacion,
                              e.target.value === 'no_permitido' ? null : restr,
                            )
                          }
                        >
                          {(Object.keys(NIVEL) as NivelDotacion[]).map((n) => (
                            <option key={n} value={n}>
                              {NIVEL[n]}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <select
                          className="in"
                          aria-label={`Artículo permitido de ${t.nombre}`}
                          value={restr ?? ''}
                          disabled={!admin || c.acc.pendiente || lv === 'no_permitido'}
                          onChange={(e) =>
                            c.cambiarDotacion(
                              t.id,
                              lv,
                              e.target.value ? Number(e.target.value) : null,
                            )
                          }
                        >
                          <option value="">Cualquier artículo del tipo</option>
                          {m.articulos
                            .filter((a) => a.tipoId === t.id)
                            .map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.marca} {a.modelo} ({a.codigo})
                              </option>
                            ))}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Tabla>
          )}
        </div>
      </div>
    </Seccion>
  );
}
