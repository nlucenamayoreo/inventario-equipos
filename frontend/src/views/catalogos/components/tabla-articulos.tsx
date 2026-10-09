import { useState } from 'react';
import { FormArticulo } from '../../../shared/components/form-articulo';
import { Seccion, Tabla } from '../../../shared/components/ui';
import type { Modelo } from '../../../shared/domain/modelo';
import type { MaestrosController } from '../hooks/use-maestros-controller';

export function TablaArticulos({
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
  const [abierto, setAbierto] = useState(false);

  return (
    <Seccion
      titulo={`Catálogo de artículos (${m.articulos.length})`}
      extra={
        puede && (
          <button
            type="button"
            className={abierto ? 'btn' : 'btn btn-primario'}
            aria-expanded={abierto}
            onClick={() => setAbierto(!abierto)}
          >
            {abierto ? 'Cerrar' : 'Nuevo artículo'}
          </button>
        )
      }
    >
      {puede && abierto && (
        <div className="panel">
          <FormArticulo m={m} pendiente={pendiente} onGuardar={mc.crearArticulo} />
        </div>
      )}
      <Tabla>
        <thead>
          <tr>
            <th>Código</th>
            <th>Tipo</th>
            <th>Marca</th>
            <th>Modelo</th>
            <th>Características</th>
            <th>Especificaciones</th>
            <th>Vida útil</th>
            <th>Unidades</th>
            <th>Disponibles</th>
          </tr>
        </thead>
        <tbody>
          {m.articulos.map((a) => {
            const uds = m.activos.filter((x) => x.articuloId === a.id);
            return (
              <tr key={a.id}>
                <td>{a.codigo}</td>
                <td style={{ fontWeight: 600 }}>{m.nombreTipo(a.tipoId)}</td>
                <td>{a.marca}</td>
                <td>{a.modelo}</td>
                <td>{m.caracteristicasDe(a) || '—'}</td>
                <td>{a.especificaciones || '—'}</td>
                <td>{a.vidaUtilMeses != null ? `${a.vidaUtilMeses} meses` : '—'}</td>
                <td>{uds.filter((x) => x.estado !== 'de_baja').length}</td>
                <td>{uds.filter((x) => x.estado === 'disponible').length}</td>
              </tr>
            );
          })}
        </tbody>
      </Tabla>
    </Seccion>
  );
}
