import { useEffect, useRef } from 'react';
import type { Activo } from '../../../shared/api/types';
import {
  Cargando,
  fmtFechaHora,
  MOTIVO,
  PillEstadoActivo,
  Tabla,
} from '../../../shared/components/ui';
import type { Modelo } from '../../../shared/domain/modelo';
import { useHistorialController } from '../hooks/use-historial-controller';

/** Historial de movimientos (auditoría) de un activo. */
export function HistorialActivo({
  m,
  activo,
  onCerrar,
}: {
  m: Modelo;
  activo: Activo;
  onCerrar: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const q = useHistorialController(activo.id);
  const art = m.idx.articulo.get(activo.articuloId);

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);

  return (
    <dialog ref={ref} className="modal" onClose={onCerrar} aria-labelledby="hist-titulo">
      <div className="modal-head">
        <div className="col" style={{ gap: 2 }}>
          <h2 id="hist-titulo" style={{ fontSize: 15 }}>
            Historial del activo
          </h2>
          <span className="tenue" style={{ fontSize: 12 }}>
            {m.nombreTipo(m.tipoDeActivo(activo))} · {art?.marca} {art?.modelo} · S/N{' '}
            <span className="mono">{activo.serial}</span>
          </span>
        </div>
        <button type="button" className="btn btn-sm" onClick={() => ref.current?.close()}>
          Cerrar
        </button>
      </div>
      <div className="modal-body">
        {q.isLoading && <Cargando />}
        {q.error && <p className="msg msg-err">{(q.error as Error).message}</p>}
        {q.data && (
          <Tabla>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Motivo</th>
                <th>Estado</th>
                <th>Titular</th>
                <th>Realizado por</th>
              </tr>
            </thead>
            <tbody>
              {q.data.map((mv) => (
                <tr key={mv.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>{fmtFechaHora(mv.realizadoEn)}</td>
                  <td>{mv.motivo ? (MOTIVO[mv.motivo] ?? mv.motivo) : '—'}</td>
                  <td>
                    <div className="fila" style={{ gap: 4, flexWrap: 'nowrap' }}>
                      {mv.estadoAnterior && (
                        <>
                          <PillEstadoActivo estado={mv.estadoAnterior} small />
                          <span aria-label="a">→</span>
                        </>
                      )}
                      <PillEstadoActivo estado={mv.estadoNuevo} small />
                    </div>
                  </td>
                  <td>
                    {mv.usuarioAnterior !== mv.usuarioNuevo
                      ? `${mv.usuarioAnteriorNombre ?? '—'} → ${mv.usuarioNuevoNombre ?? '—'}`
                      : (mv.usuarioNuevoNombre ?? '—')}
                  </td>
                  <td style={{ fontSize: 12 }}>{mv.realizadoPor}</td>
                </tr>
              ))}
              {!q.data.length && (
                <tr>
                  <td colSpan={5} className="vacio">
                    Sin movimientos registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </Tabla>
        )}
      </div>
    </dialog>
  );
}
