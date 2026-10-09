import { Seccion, Tabla } from '../../../shared/components/ui';
import type { Modelo } from '../../../shared/domain/modelo';

export function TablaArticulos({ m }: { m: Modelo }) {
  return (
    <Seccion
      titulo={`Catálogo de artículos (${m.articulos.length})`}
      extra={
        <span className="sec-nota">
          Los artículos nuevos se crean desde Activos › Nuevo artículo
        </span>
      }
    >
      <Tabla>
        <thead>
          <tr>
            <th>Código</th>
            <th>Tipo</th>
            <th>Marca</th>
            <th>Modelo</th>
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
