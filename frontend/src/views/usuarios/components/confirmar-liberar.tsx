import type { Activo } from '../../../shared/api/types';
import { CustodioSelect } from '../../../shared/components/custodio-select';
import type { Modelo } from '../../../shared/domain/modelo';
import type { FichaController } from '../hooks/use-ficha-controller';

/** Liberar o recibir un equipo del colaborador indicando quién queda a cargo del resguardo. */
export function ConfirmarLiberar({ m, a, c }: { m: Modelo; a: Activo; c: FichaController }) {
  const art = m.idx.articulo.get(a.articuloId);
  const recibir = a.estado === 'pendiente_recuperacion';
  return (
    <div className="panel">
      <span style={{ fontWeight: 700 }}>
        {recibir ? 'Recibir' : 'Liberar'} {m.nombreTipo(art?.tipoId ?? -1)} · S/N{' '}
        <span className="mono">{a.serial}</span>
      </span>
      <span style={{ fontSize: 12 }} className="tenue">
        El equipo queda disponible. Indique quién queda a cargo de su resguardo.
      </span>
      <CustodioSelect m={m} value={c.custodio} onChange={c.setCustodio} />
      <div className="fila" style={{ gap: 8 }}>
        <button
          type="button"
          className="btn btn-primario"
          disabled={c.pendiente}
          onClick={() => c.liberar(a)}
        >
          {recibir ? 'Recibir' : 'Liberar'}
        </button>
        <button type="button" className="btn" onClick={c.cerrar}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
