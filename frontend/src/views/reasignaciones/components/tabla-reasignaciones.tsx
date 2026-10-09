import type { EstadoReasignacion, Reasignacion } from '../../../shared/api/types';
import { fmtFechaHora, Pill, Tabla, type TonoPill } from '../../../shared/components/ui';
import type { Modelo } from '../../../shared/domain/modelo';
import type { ReasignacionesController } from '../hooks/use-reasignaciones-controller';
import { AccionesReasignacion } from './acciones-reasignacion';

export const ESTADO_REASIGNACION: Record<EstadoReasignacion, { txt: string; tono: TonoPill }> = {
  pendiente: { txt: 'Pendiente', tono: 'mid' },
  aprobada: { txt: 'Aprobada', tono: 'ok' },
  rechazada: { txt: 'Rechazada', tono: 'bad' },
  cancelada: { txt: 'Cancelada', tono: 'neu' },
};

/** Solicitudes de reasignación con su estado, resolución y acciones. */
export function TablaReasignaciones({
  m,
  c,
  filas,
}: {
  m: Modelo;
  c: ReasignacionesController;
  filas: Reasignacion[];
}) {
  return (
    <Tabla>
      <thead>
        <tr>
          <th>Equipo</th>
          <th>De</th>
          <th>A</th>
          <th>Motivo</th>
          <th>Solicitado</th>
          <th>Estado</th>
          <th>Resolución</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        {filas.map((r) => {
          const a = m.activos.find((x) => x.id === r.activoId);
          const e = ESTADO_REASIGNACION[r.estado];
          return (
            <tr key={r.id}>
              <td>
                <div style={{ fontWeight: 600 }}>{a ? m.etiquetaArticulo(a.articuloId) : '—'}</div>
                <div className="tenue mono" style={{ fontSize: 12 }}>
                  {a ? `S/N ${a.serial}` : `Activo #${r.activoId}`}
                </div>
              </td>
              <td>{m.nombreUsuario(r.usuarioOrigen)}</td>
              <td>{m.nombreUsuario(r.usuarioDestino)}</td>
              <td style={{ maxWidth: 260, whiteSpace: 'normal' }}>{r.motivo}</td>
              <td>
                <div>{r.solicitadoPorNombre ?? m.nombreOperador(r.solicitadoPor)}</div>
                <div className="tenue" style={{ fontSize: 12 }}>
                  {fmtFechaHora(r.solicitadoEn)}
                </div>
              </td>
              <td>
                <Pill tono={e.tono}>{e.txt}</Pill>
              </td>
              <td style={{ maxWidth: 240, whiteSpace: 'normal' }}>
                {r.resueltoEn ? (
                  <>
                    <div>{r.resueltoPorNombre ?? m.nombreOperador(r.resueltoPor)}</div>
                    <div className="tenue" style={{ fontSize: 12 }}>
                      {fmtFechaHora(r.resueltoEn)}
                    </div>
                    {r.comentario && <div style={{ fontSize: 12 }}>«{r.comentario}»</div>}
                  </>
                ) : (
                  <span className="tenue">—</span>
                )}
              </td>
              <td>
                <AccionesReasignacion r={r} c={c} />
              </td>
            </tr>
          );
        })}
        {filas.length === 0 && (
          <tr>
            <td colSpan={8} className="vacio">
              No hay solicitudes en este estado.
            </td>
          </tr>
        )}
      </tbody>
    </Tabla>
  );
}
