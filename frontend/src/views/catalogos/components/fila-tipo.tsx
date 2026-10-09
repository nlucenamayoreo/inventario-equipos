import { useState } from 'react';
import type { TipoEquipo } from '../../../shared/api/types';

/** Tipo de equipo con sus existencias y el máximo de equipos del tipo por persona. */
export function FilaTipo({
  tipo,
  enInventario,
  disponibles,
  puede,
  pendiente,
  onGuardarMax,
}: {
  tipo: TipoEquipo;
  enInventario: number;
  disponibles: number;
  puede: boolean;
  pendiente: boolean;
  onGuardarMax: (max: number) => void;
}) {
  const [max, setMax] = useState(String(tipo.maxPorUsuario));
  const cambiado = max !== String(tipo.maxPorUsuario);

  return (
    <div className="item" style={{ flexWrap: 'wrap' }}>
      <div className="col" style={{ gap: 2 }}>
        <span style={{ fontWeight: 600 }}>{tipo.nombre}</span>
        <span className="tenue" style={{ fontSize: 12 }}>
          {enInventario} en inventario · {disponibles} disponibles
        </span>
      </div>
      {puede ? (
        <div className="fila" style={{ gap: 6, flexWrap: 'nowrap' }}>
          <label className="tenue" style={{ fontSize: 12 }} htmlFor={`max-tipo-${tipo.id}`}>
            Máx. por persona
          </label>
          <input
            id={`max-tipo-${tipo.id}`}
            className="in"
            type="number"
            min={1}
            max={20}
            step={1}
            style={{ width: 64 }}
            title="Máximo de equipos de este tipo por persona"
            value={max}
            onChange={(e) => setMax(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && cambiado && onGuardarMax(Number(max))}
          />
          <button
            type="button"
            className="btn btn-sm btn-primario"
            onClick={() => onGuardarMax(Number(max))}
            disabled={pendiente || !cambiado}
          >
            Guardar
          </button>
        </div>
      ) : (
        <span className="tenue" style={{ fontSize: 12 }}>
          Máx. por persona: {tipo.maxPorUsuario}
        </span>
      )}
    </div>
  );
}
