import { useState } from 'react';
import type { Caracteristica } from '../../../shared/api/types';
import { Pill } from '../../../shared/components/ui';
import type { MaestrosController } from '../hooks/use-maestros-controller';
import { NombreEditable } from './nombre-editable';

/** Característica de un tipo con sus valores (chips) y alta de valores nuevos. */
export function FilaCaracteristica({
  car,
  mc,
  puede,
  pendiente,
}: {
  car: Caracteristica;
  mc: MaestrosController;
  puede: boolean;
  pendiente: boolean;
}) {
  const [valores, setValores] = useState('');
  const agregar = async () => {
    if (await mc.agregarValores(car.id, valores)) setValores('');
  };

  const detalle = (
    <div className="col" style={{ gap: 6, marginTop: 4 }}>
      <div className="fila" style={{ gap: 4 }}>
        {car.valores.length ? (
          car.valores.map((v) => (
            <Pill key={v.id} tono={v.activo ? 'blu' : 'neu'} small>
              {v.valor}
              {!v.activo && ' (inactivo)'}
            </Pill>
          ))
        ) : (
          <span className="tenue" style={{ fontSize: 12 }}>
            Sin valores
          </span>
        )}
      </div>
      {puede && (
        <div className="fila" style={{ gap: 6, flexWrap: 'nowrap' }}>
          <input
            className="in"
            style={{ flex: 1, minWidth: 0 }}
            aria-label={`Valores nuevos de ${car.nombre}`}
            placeholder="Valores nuevos, separados por coma"
            value={valores}
            onChange={(e) => setValores(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && agregar()}
          />
          <button type="button" className="btn btn-sm" onClick={agregar} disabled={pendiente}>
            Agregar valores
          </button>
        </div>
      )}
    </div>
  );

  return (
    <NombreEditable
      nombre={car.nombre}
      activo={car.activo}
      etiqueta="la característica"
      puede={puede}
      pendiente={pendiente}
      detalle={detalle}
      onRenombrar={(n) => mc.renombrarCaracteristica(car.id, n)}
      onActivo={(a) => mc.activarCaracteristica(car.id, a)}
    />
  );
}
