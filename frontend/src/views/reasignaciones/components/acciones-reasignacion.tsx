import { useState } from 'react';
import type { Reasignacion } from '../../../shared/api/types';
import type { ReasignacionesController } from '../hooks/use-reasignaciones-controller';

/** Botones Aprobar / Rechazar / Cancelar de una solicitud pendiente, con comentario. */
export function AccionesReasignacion({ r, c }: { r: Reasignacion; c: ReasignacionesController }) {
  const [modo, setModo] = useState<'aprobar' | 'rechazar' | null>(null);
  const [comentario, setComentario] = useState('');
  if (r.estado !== 'pendiente') return <span className="tenue">—</span>;

  const bloqueo = c.bloqueoResolver(r);
  const cancelable = c.puedeCancelar(r);
  const ocupado = c.acc.pendiente;

  const confirmar = async () => {
    const ok =
      modo === 'aprobar' ? await c.aprobar(r, comentario) : await c.rechazar(r, comentario);
    if (ok) {
      setModo(null);
      setComentario('');
    }
  };

  if (modo)
    return (
      <div className="col" style={{ gap: 6, minWidth: 200 }}>
        <input
          className="in"
          aria-label={modo === 'aprobar' ? 'Comentario (opcional)' : 'Motivo del rechazo'}
          placeholder={modo === 'aprobar' ? 'Comentario (opcional)' : 'Motivo del rechazo *'}
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          autoFocus
        />
        <div className="fila" style={{ gap: 6 }}>
          <button
            type="button"
            className={`btn btn-sm ${modo === 'aprobar' ? 'btn-primario' : 'btn-peligro'}`}
            onClick={confirmar}
            disabled={ocupado || (modo === 'rechazar' && !comentario.trim())}
          >
            {modo === 'aprobar' ? 'Confirmar aprobación' : 'Confirmar rechazo'}
          </button>
          <button type="button" className="btn btn-sm" onClick={() => setModo(null)}>
            Volver
          </button>
        </div>
      </div>
    );

  return (
    <div className="fila" style={{ gap: 6 }}>
      {bloqueo !== 'Su rol no permite aprobar reasignaciones.' && (
        <>
          <span title={bloqueo ?? undefined}>
            <button
              type="button"
              className="btn btn-sm btn-ok"
              disabled={!!bloqueo || ocupado}
              onClick={() => setModo('aprobar')}
            >
              Aprobar
            </button>
          </span>
          <span title={bloqueo ?? undefined}>
            <button
              type="button"
              className="btn btn-sm btn-borde-peligro"
              disabled={!!bloqueo || ocupado}
              onClick={() => setModo('rechazar')}
            >
              Rechazar
            </button>
          </span>
        </>
      )}
      {cancelable && (
        <button
          type="button"
          className="btn btn-sm"
          disabled={ocupado}
          onClick={() => c.cancelar(r)}
        >
          Cancelar
        </button>
      )}
    </div>
  );
}
