import type { EstadoUsuario, Usuario } from '../../../shared/api/types';
import { FiltrosBar } from '../../../shared/components/filtros-bar';
import { ESTADO_USUARIO, PillEstadoUsuario, Seccion, Tabla } from '../../../shared/components/ui';
import type { Modelo } from '../../../shared/domain/modelo';

interface Props {
  m: Modelo;
  filas: Usuario[];
  selId?: number;
  fEstado: '' | EstadoUsuario;
  setFEstado: (v: '' | EstadoUsuario) => void;
  onVer: (id: number) => void;
}

export function TablaUsuarios({ m, filas, selId, fEstado, setFEstado, onVer }: Props) {
  return (
    <Seccion
      titulo={`Usuarios (${filas.length})`}
      extra={
        <div className="fila" style={{ gap: 8 }}>
          <FiltrosBar m={m} compacto />
          <select
            className="in"
            aria-label="Filtrar por estado"
            style={{ width: 150 }}
            value={fEstado}
            onChange={(e) => setFEstado(e.target.value as EstadoUsuario | '')}
          >
            <option value="">Todos los estados</option>
            {(['activo', 'vacaciones', 'desactivado'] as const).map((e) => (
              <option key={e} value={e}>
                {ESTADO_USUARIO[e].txt}
              </option>
            ))}
          </select>
        </div>
      }
    >
      <Tabla>
        <thead>
          <tr>
            <th>Código</th>
            <th>Nombre</th>
            <th>Cargo</th>
            <th>Estado</th>
            <th>Departamento</th>
            <th>Silo</th>
            <th>Equipos</th>
            <th>Le falta</th>
            <th>
              <span className="sr-only">Acciones</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {filas.map((u) => {
            const desactivado = u.estado === 'desactivado';
            const falt = desactivado ? [] : m.faltantesDe(u);
            const siloId = m.siloIdDe(u);
            return (
              <tr key={u.id} className={selId === u.id ? 'sel' : undefined}>
                <td>{u.codigo}</td>
                <td style={{ fontWeight: 600 }}>{u.nombre}</td>
                <td>{m.cargoDe(u)?.nombre ?? 'Sin cargo'}</td>
                <td>
                  <PillEstadoUsuario estado={u.estado} />
                </td>
                <td>{m.deptoDe(u)?.nombre ?? '—'}</td>
                <td>{siloId != null ? m.idx.silo.get(siloId)?.nombre : '—'}</td>
                <td>{m.tenenciaDe(u.id).length}</td>
                <td
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: desactivado ? 'var(--tenue)' : falt.length ? 'var(--bad)' : 'var(--ok)',
                  }}
                >
                  {desactivado ? '—' : falt.length ? falt.map(m.nombreTipo).join(', ') : 'Completo'}
                </td>
                <td>
                  <button
                    type="button"
                    className="btn btn-sm btn-link"
                    aria-label={`Ver ficha de ${u.nombre}`}
                    onClick={() => onVer(u.id)}
                  >
                    Ver
                  </button>
                </td>
              </tr>
            );
          })}
          {!filas.length && (
            <tr>
              <td colSpan={9} className="vacio">
                No hay usuarios que coincidan con el filtro.
              </td>
            </tr>
          )}
        </tbody>
      </Tabla>
    </Seccion>
  );
}
