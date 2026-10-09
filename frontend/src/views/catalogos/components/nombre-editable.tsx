import { useState, type ReactNode } from 'react';
import { Pill } from '../../../shared/components/ui';

/** Fila de catálogo con nombre, detalle y acciones de renombrar y activar/desactivar. */
export function NombreEditable({
  nombre,
  activo,
  etiqueta,
  puede,
  pendiente,
  detalle,
  onRenombrar,
  onActivo,
}: {
  nombre: string;
  activo: boolean;
  /** «la marca», «el modelo»… para las etiquetas accesibles. */
  etiqueta: string;
  puede: boolean;
  pendiente: boolean;
  detalle?: ReactNode;
  onRenombrar: (nombre: string) => Promise<unknown>;
  onActivo: (activo: boolean) => void;
}) {
  const [editando, setEditando] = useState<string | null>(null);

  const guardar = async () => {
    if (editando == null) return;
    if (editando.trim() === nombre) return setEditando(null);
    if (await onRenombrar(editando)) setEditando(null);
  };

  return (
    <div className="item" style={{ flexWrap: 'wrap' }}>
      {editando != null ? (
        <div className="fila" style={{ flex: 1, gap: 6, flexWrap: 'nowrap' }}>
          <input
            className="in"
            style={{ flex: 1 }}
            aria-label={`Nuevo nombre de ${etiqueta} ${nombre}`}
            value={editando}
            autoFocus
            onChange={(e) => setEditando(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') guardar();
              if (e.key === 'Escape') setEditando(null);
            }}
          />
          <button
            type="button"
            className="btn btn-primario btn-sm"
            onClick={guardar}
            disabled={pendiente}
          >
            Guardar
          </button>
          <button type="button" className="btn btn-sm" onClick={() => setEditando(null)}>
            Cancelar
          </button>
        </div>
      ) : (
        <>
          <div className="col" style={{ gap: 2 }}>
            <span className="fila" style={{ gap: 6 }}>
              <span style={{ fontWeight: 600 }} className={activo ? '' : 'tenue'}>
                {nombre}
              </span>
              {!activo && (
                <Pill tono="neu" small>
                  Inactivo
                </Pill>
              )}
            </span>
            {detalle}
          </div>
          {puede && (
            <div className="fila" style={{ gap: 6 }}>
              <button
                type="button"
                className="btn btn-sm"
                aria-label={`Renombrar ${etiqueta} ${nombre}`}
                onClick={() => setEditando(nombre)}
              >
                Renombrar
              </button>
              <button
                type="button"
                className={`btn btn-sm${activo ? ' btn-borde-peligro' : ' btn-borde-acento'}`}
                aria-label={`${activo ? 'Desactivar' : 'Activar'} ${etiqueta} ${nombre}`}
                onClick={() => onActivo(!activo)}
                disabled={pendiente}
              >
                {activo ? 'Desactivar' : 'Activar'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
