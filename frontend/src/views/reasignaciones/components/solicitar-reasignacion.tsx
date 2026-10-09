import { Aviso, Campo, PillEstadoActivo } from '../../../shared/components/ui';
import type { Modelo } from '../../../shared/domain/modelo';
import { usePermiso } from '../../../shared/state/datos';
import { useSolicitudController } from '../hooks/use-solicitud-controller';

/**
 * Formulario «Solicitar reasignación». Con `activoId` el equipo queda fijo.
 * Reutilizable desde Activos y Usuarios.
 */
export function SolicitarReasignacion({
  m,
  activoId,
  onListo,
}: {
  m: Modelo;
  activoId?: number;
  onListo?: () => void;
}) {
  const permitido = usePermiso('reasignaciones.solicitar');
  const c = useSolicitudController(m, activoId, onListo);
  if (!permitido) return <p className="sec-nota">Su rol no permite solicitar reasignaciones.</p>;
  const a = c.activo;
  const fijo = activoId != null;

  return (
    <div className="panel">
      <span style={{ fontWeight: 700 }}>Solicitar reasignación</span>
      <span className="sec-nota">
        El cambio de titular requiere la aprobación del Gerente de sistemas. Al aprobarse, el equipo
        queda asignado a la persona destino y se registra en su historial.
      </span>
      {fijo ? (
        a ? (
          <div className="fila" style={{ gap: 8 }}>
            <span style={{ fontWeight: 600 }}>
              {m.nombreTipo(m.tipoDeActivo(a))} · {m.etiquetaArticulo(a.articuloId)}
            </span>
            <span className="mono">S/N {a.serial}</span>
            <PillEstadoActivo estado={a.estado} small />
          </div>
        ) : (
          <p className="msg msg-err">No se encontró el equipo.</p>
        )
      ) : (
        <div className="grid-2" style={{ gap: 8 }}>
          <Campo label="Buscar por serial o artículo">
            <input
              className="in"
              type="search"
              value={c.f.busca}
              onChange={c.set('busca')}
              placeholder="Ej.: 5CD12…"
            />
          </Campo>
          <Campo label={`Equipo * (${c.opcionesActivo.length})`}>
            <select className="in" value={c.f.activoId} onChange={c.set('activoId')}>
              <option value="">Seleccione…</option>
              {c.opcionesActivo.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.serial} · {m.etiquetaArticulo(x.articuloId)} · {m.nombreUsuario(x.usuarioId)}
                </option>
              ))}
            </select>
          </Campo>
        </div>
      )}
      {a && (
        <span className="sec-nota">
          Titular actual: <strong>{m.nombreUsuario(a.usuarioId)}</strong>
        </span>
      )}
      {c.bloqueo ? (
        <p className="msg msg-err" role="alert">
          {c.bloqueo}
        </p>
      ) : (
        <>
          <Campo label="Reasignar a *">
            <select className="in" value={c.f.destino} onChange={c.set('destino')}>
              <option value="">Seleccione…</option>
              {c.destinos.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombre} · {m.cargoDe(u)?.nombre ?? 'Sin cargo'} · {m.deptoDe(u)?.nombre ?? '—'}
                  {u.estado === 'vacaciones' ? ' (vacaciones)' : ''}
                </option>
              ))}
            </select>
          </Campo>
          {c.advertencias.map((t) => (
            <p key={t} className="msg msg-err" role="alert">
              {t}
            </p>
          ))}
          <Campo label="Motivo *">
            <textarea
              className="in"
              rows={3}
              value={c.f.motivo}
              onChange={c.set('motivo')}
              style={{ height: 'auto', paddingTop: 8 }}
            />
          </Campo>
          <div className="fila" style={{ gap: 8 }}>
            <button
              type="button"
              className="btn btn-primario"
              onClick={c.enviar}
              disabled={c.acc.pendiente || !a}
            >
              Enviar solicitud
            </button>
          </div>
        </>
      )}
      <Aviso msg={c.acc.msg} />
    </div>
  );
}
