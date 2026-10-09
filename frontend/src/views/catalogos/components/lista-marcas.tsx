import { useState } from 'react';
import { Campo } from '../../../shared/components/ui';
import type { Modelo } from '../../../shared/domain/modelo';
import type { MaestrosController } from '../hooks/use-maestros-controller';
import { NombreEditable } from './nombre-editable';

export function ListaMarcas({
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
  const [nombre, setNombre] = useState('');
  const agregar = async () => {
    if (await mc.crearMarca(nombre)) setNombre('');
  };

  return (
    <div className="col" style={{ minWidth: 0 }}>
      <span style={{ fontSize: 14, fontWeight: 700 }}>Marcas ({m.marcas.length})</span>
      {puede && (
        <div className="fila" style={{ alignItems: 'flex-end', flexWrap: 'nowrap', gap: 8 }}>
          <Campo label="Nueva marca" style={{ flex: 1 }}>
            <input
              className="in"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && agregar()}
            />
          </Campo>
          <button type="button" className="btn btn-primario" onClick={agregar} disabled={pendiente}>
            Agregar
          </button>
        </div>
      )}
      {!m.marcas.length && <p className="tenue">No hay marcas registradas.</p>}
      {m.marcas.map((b) => (
        <NombreEditable
          key={b.id}
          nombre={b.nombre}
          activo={b.activo}
          etiqueta="la marca"
          puede={puede}
          pendiente={pendiente}
          detalle={
            <span className="tenue" style={{ fontSize: 12 }}>
              {m.modelos.filter((x) => x.marcaId === b.id).length} modelos
            </span>
          }
          onRenombrar={(n) => mc.renombrarMarca(b.id, n)}
          onActivo={(a) => mc.activarMarca(b.id, a)}
        />
      ))}
    </div>
  );
}
