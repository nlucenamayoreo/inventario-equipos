import { useState } from 'react';
import type { Usuario } from '../../../shared/api/types';
import { Pill } from '../../../shared/components/ui';
import type { Modelo } from '../../../shared/domain/modelo';
import type { FichaController } from '../hooks/use-ficha-controller';

/** Disponibles permitidos por el cargo, primero los tipos que le faltan. */
export function AsignarDisponibles({ m, u, c }: { m: Modelo; u: Usuario; c: FichaController }) {
  const [tipo, setTipo] = useState('');
  const todos = m.activos.filter(
    (a) => a.estado === 'disponible' && (!tipo || String(m.tipoDeActivo(a)) === tipo),
  );
  const ok = todos.filter((a) => m.puedeRecibir(u, a));
  const llenos = new Set(m.tipos.filter((t) => m.cupo(u, t.id).lleno).map((t) => t.id));
  const ocultos = todos.length - ok.length;
  const filas = ok
    .map((a) => ({ a, falta: c.faltan.includes(m.tipoDeActivo(a)) }))
    .sort(
      (x, y) =>
        Number(y.falta) - Number(x.falta) ||
        m.nombreTipo(m.tipoDeActivo(x.a)).localeCompare(m.nombreTipo(m.tipoDeActivo(y.a))),
    );

  return (
    <div className="col separador" style={{ gap: 10 }}>
      <div className="fila" style={{ justifyContent: 'space-between', gap: 8 }}>
        <span className="subtitulo">Asignar equipo disponible ({filas.length})</span>
        <select
          className="in"
          aria-label="Filtrar disponibles por tipo"
          style={{ width: 150, height: 36 }}
          value={tipo}
          onChange={(e) => setTipo(e.target.value)}
        >
          <option value="">Todos los tipos</option>
          {m.tipos.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nombre}
            </option>
          ))}
        </select>
      </div>
      {ocultos > 0 && (
        <span style={{ fontSize: 12, color: 'var(--texto-2)' }}>
          {ocultos}{' '}
          {ocultos === 1 ? 'equipo disponible no se muestra' : 'equipos disponibles no se muestran'}{' '}
          porque el cargo no los permite.
        </span>
      )}
      <div className="lista-scroll">
        {filas.map(({ a, falta }) => {
          const art = m.idx.articulo.get(a.articuloId);
          const lleno = llenos.has(m.tipoDeActivo(a));
          return (
            <div key={a.id} className="item">
              <div className="col" style={{ gap: 2 }}>
                <div className="fila" style={{ gap: 6 }}>
                  <span style={{ fontWeight: 600 }}>
                    {m.nombreTipo(m.tipoDeActivo(a))} · {art?.marca} {art?.modelo}
                  </span>
                  {falta && (
                    <Pill tono="bad" small>
                      Le falta
                    </Pill>
                  )}
                  {lleno && (
                    <Pill tono="mid" small>
                      Máximo alcanzado
                    </Pill>
                  )}
                </div>
                <span style={{ fontSize: 11 }} className="tenue mono">
                  S/N {a.serial}
                </span>
              </div>
              <button
                type="button"
                className="btn btn-primario btn-sm"
                style={{ height: 34, padding: '0 14px' }}
                disabled={c.pendiente || lleno}
                title={
                  lleno
                    ? `Ya tiene el máximo de equipos de tipo ${m.nombreTipo(m.tipoDeActivo(a))} por persona.`
                    : undefined
                }
                onClick={() => c.asignar(a)}
              >
                Asignar
              </button>
            </div>
          );
        })}
        {!filas.length && (
          <p className="tenue" style={{ padding: 10, fontSize: 12 }}>
            No hay equipos disponibles permitidos para este cargo. Regístrelos en Activos o revise
            el perfil del cargo.
          </p>
        )}
      </div>
    </div>
  );
}
