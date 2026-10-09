import { useState } from 'react';
import { Campo, Seccion } from '../../../shared/components/ui';
import type { Modelo } from '../../../shared/domain/modelo';
import type { MaestrosController } from '../hooks/use-maestros-controller';
import { FilaCaracteristica } from './fila-caracteristica';

export function CaracteristicasTipo({
  m,
  mc,
  puede,
  pendiente,
}: {
  m: Modelo;
  mc: MaestrosController;
  puede: boolean;
  pendiente: boolean;
}) {
  const [tipoSel, setTipoSel] = useState(String(m.tipos[0]?.id ?? ''));
  const [nueva, setNueva] = useState({ nombre: '', valores: '' });
  const tipoId = tipoSel ? Number(tipoSel) : null;
  const lista = m.caracteristicas.filter((c) => c.tipoId === tipoId);

  const agregar = async () => {
    if (await mc.crearCaracteristica(tipoId, nueva.nombre, nueva.valores))
      setNueva({ nombre: '', valores: '' });
  };

  return (
    <Seccion
      titulo="Características por tipo"
      caja
      extra={
        <span className="sec-nota" style={{ width: '100%' }}>
          Atributos seleccionables al crear un artículo (p. ej. Laptop: RAM, Disco, Procesador).
        </span>
      }
    >
      <div className="fila" style={{ alignItems: 'flex-end', gap: 12 }}>
        <Campo label="Tipo de equipo" style={{ flex: '0 1 240px' }}>
          <select className="in" value={tipoSel} onChange={(e) => setTipoSel(e.target.value)}>
            {m.tipos.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nombre}
              </option>
            ))}
          </select>
        </Campo>
      </div>
      {puede && tipoId != null && (
        <div className="panel col" style={{ gap: 8 }}>
          <div className="grid-form" style={{ gap: 8 }}>
            <Campo label="Nueva característica">
              <input
                className="in"
                placeholder="p. ej. RAM"
                value={nueva.nombre}
                onChange={(e) => setNueva({ ...nueva, nombre: e.target.value })}
              />
            </Campo>
            <Campo label="Valores iniciales (separados por coma)">
              <input
                className="in"
                placeholder="p. ej. 8 GB, 16 GB, 32 GB"
                value={nueva.valores}
                onChange={(e) => setNueva({ ...nueva, valores: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && agregar()}
              />
            </Campo>
          </div>
          <div className="fila">
            <button
              type="button"
              className="btn btn-primario"
              onClick={agregar}
              disabled={pendiente}
            >
              Agregar característica
            </button>
          </div>
        </div>
      )}
      {!lista.length && (
        <p className="tenue">{m.nombreTipo(tipoId ?? -1)} no tiene características definidas.</p>
      )}
      {lista.map((c) => (
        <FilaCaracteristica key={c.id} car={c} mc={mc} puede={puede} pendiente={pendiente} />
      ))}
    </Seccion>
  );
}
