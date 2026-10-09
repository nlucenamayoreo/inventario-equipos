import { useEffect, useRef, useState } from 'react';
import type { Id } from '../../../shared/api/types';
import { CustodioSelect } from '../../../shared/components/custodio-select';
import { ESTADO_ACTIVO } from '../../../shared/components/ui';
import type { Modelo } from '../../../shared/domain/modelo';
import type { Entrega } from '../hooks/use-activos-controller';

/** Confirma quién queda a cargo del equipo cuando sale de manos de su titular o cambia de estado. */
export function EntregarResguardo({
  m,
  entrega,
  pendiente,
  onConfirmar,
  onCerrar,
}: {
  m: Modelo;
  entrega: Entrega;
  pendiente: boolean;
  onConfirmar: (custodioId: Id | null) => void;
  onCerrar: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [custodio, setCustodio] = useState<Id | null>(entrega.activo.custodioId);
  const { activo, estado } = entrega;
  const art = m.idx.articulo.get(activo.articuloId);
  const titulo = estado
    ? `Pasar a «${ESTADO_ACTIVO[estado].txt}»`
    : activo.estado === 'pendiente_recuperacion'
      ? 'Recibir equipo'
      : 'Liberar equipo';

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);

  return (
    <dialog ref={ref} className="modal" onClose={onCerrar} aria-labelledby="entrega-titulo">
      <div className="modal-head">
        <div className="col" style={{ gap: 2 }}>
          <h2 id="entrega-titulo" style={{ fontSize: 15 }}>
            {titulo}
          </h2>
          <span className="tenue" style={{ fontSize: 12 }}>
            {m.nombreTipo(m.tipoDeActivo(activo))} · {art?.marca} {art?.modelo} · S/N{' '}
            <span className="mono">{activo.serial}</span>
            {activo.usuarioId != null && <> · titular {m.nombreUsuario(activo.usuarioId)}</>}
          </span>
        </div>
      </div>
      <div className="modal-body col" style={{ gap: 12 }}>
        <p style={{ margin: 0 }}>
          Todo equipo que no está en manos de su titular debe tener un responsable del resguardo.
          Indique quién queda a cargo.
        </p>
        <CustodioSelect m={m} value={custodio} onChange={setCustodio} />
        <div className="fila" style={{ gap: 8 }}>
          <button
            type="button"
            className="btn btn-primario"
            disabled={pendiente}
            onClick={() => onConfirmar(custodio)}
          >
            Confirmar
          </button>
          <button type="button" className="btn" onClick={() => ref.current?.close()}>
            Cancelar
          </button>
        </div>
      </div>
    </dialog>
  );
}
