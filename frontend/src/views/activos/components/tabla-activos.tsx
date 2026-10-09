import { Link } from 'react-router-dom';
import type { EstadoSinTitular } from '../../../shared/api/client';
import type { EstadoActivo } from '../../../shared/api/types';
import {
  Aviso,
  ESTADO_ACTIVO,
  fmtFecha,
  Pill,
  PillEstadoActivo,
  Seccion,
  Tabla,
} from '../../../shared/components/ui';
import type { Modelo } from '../../../shared/domain/modelo';
import type { ActivosController } from '../hooks/use-activos-controller';

const ESTADOS_SIN_TITULAR: EstadoSinTitular[] = ['disponible', 'en_reparacion', 'de_baja'];

export function TablaActivos({ m, c, admin }: { m: Modelo; c: ActivosController; admin: boolean }) {
  return (
    <Seccion
      titulo={`Activos (${c.filas.length})`}
      extra={
        <div className="fila" style={{ gap: 8 }}>
          <select
            className="in"
            aria-label="Filtrar por tipo"
            style={{ width: 160 }}
            value={c.fTipo}
            onChange={(e) => c.setFTipo(e.target.value)}
          >
            <option value="">Todos los tipos</option>
            {m.tipos.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nombre}
              </option>
            ))}
          </select>
          <select
            className="in"
            aria-label="Filtrar por estado"
            style={{ width: 200 }}
            value={c.fEstado}
            onChange={(e) => c.setFEstado(e.target.value as EstadoActivo | '')}
          >
            <option value="">Todos los estados</option>
            {(Object.keys(ESTADO_ACTIVO) as EstadoActivo[]).map((e) => (
              <option key={e} value={e}>
                {ESTADO_ACTIVO[e].txt}
              </option>
            ))}
          </select>
          <input
            className="in"
            type="search"
            aria-label="Buscar activo"
            placeholder="Serial, marca o usuario"
            style={{ width: 220 }}
            value={c.q}
            onChange={(e) => c.setQ(e.target.value)}
          />
        </div>
      }
    >
      <Aviso msg={c.accion.msg} />
      <Tabla>
        <thead>
          <tr>
            <th>Tipo</th>
            <th>Marca</th>
            <th>Modelo</th>
            <th>Serial</th>
            <th>Estado</th>
            <th>Titular</th>
            <th>En uso por</th>
            <th>Departamento</th>
            <th>Desde</th>
            <th>
              <span className="sr-only">Acciones</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {c.filas.map((a) => {
            const art = m.idx.articulo.get(a.articuloId);
            const titular = a.usuarioId != null ? m.idx.usuario.get(a.usuarioId) : undefined;
            return (
              <tr key={a.id}>
                <td style={{ fontWeight: 600 }}>{m.nombreTipo(m.tipoDeActivo(a))}</td>
                <td>{art?.marca ?? '—'}</td>
                <td>{art?.modelo ?? '—'}</td>
                <td className="mono" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                  {a.serial}
                </td>
                <td>
                  <div className="chips" style={{ gap: 4 }}>
                    <PillEstadoActivo estado={a.estado} />
                    {m.fueraDePerfil(a) && (
                      <Pill tono="pur" small>
                        Fuera de perfil
                      </Pill>
                    )}
                  </div>
                </td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  {titular ? <Link to={`/usuarios/${titular.id}`}>{titular.nombre}</Link> : '—'}
                </td>
                <td>{c.enUso(a)}</td>
                <td>{titular ? (m.deptoDe(titular)?.nombre ?? '—') : '—'}</td>
                <td>{fmtFecha(a.fechaAsignacion)}</td>
                <td>
                  <div className="fila" style={{ gap: 6, flexWrap: 'nowrap' }}>
                    {admin && a.usuarioId != null && (
                      <button
                        type="button"
                        className="btn btn-sm btn-txt-peligro"
                        disabled={c.accion.pendiente}
                        onClick={() => c.liberar(a)}
                      >
                        {a.estado === 'pendiente_recuperacion' ? 'Recibir' : 'Liberar'}
                      </button>
                    )}
                    {admin && a.usuarioId == null && (
                      <select
                        className="in"
                        aria-label={`Cambiar estado de ${a.serial}`}
                        style={{ height: 32, width: 140, fontSize: 12 }}
                        value={a.estado}
                        disabled={c.accion.pendiente}
                        onChange={(e) => c.cambiarEstado(a, e.target.value as EstadoSinTitular)}
                      >
                        {ESTADOS_SIN_TITULAR.map((e) => (
                          <option key={e} value={e}>
                            {ESTADO_ACTIVO[e].txt}
                          </option>
                        ))}
                      </select>
                    )}
                    <button
                      type="button"
                      className="btn btn-sm btn-link"
                      onClick={() => c.setHistorial(a)}
                    >
                      Historial
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
          {!c.filas.length && (
            <tr>
              <td colSpan={10} className="vacio">
                No hay activos que coincidan con el filtro.
              </td>
            </tr>
          )}
        </tbody>
      </Tabla>
    </Seccion>
  );
}
