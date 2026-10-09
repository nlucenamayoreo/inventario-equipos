import { Aviso, Cargando, Seccion } from '../../../shared/components/ui';
import type { Modelo } from '../../../shared/domain/modelo';
import { usePermiso } from '../../../shared/state/datos';
import { SolicitarReasignacion } from '../components/solicitar-reasignacion';
import { TablaReasignaciones } from '../components/tabla-reasignaciones';
import {
  type FiltroEstado,
  useReasignacionesController,
} from '../hooks/use-reasignaciones-controller';

const FILTROS: { v: FiltroEstado; txt: string }[] = [
  { v: 'pendiente', txt: 'Pendientes' },
  { v: 'aprobada', txt: 'Aprobadas' },
  { v: 'rechazada', txt: 'Rechazadas' },
  { v: 'cancelada', txt: 'Canceladas' },
  { v: 'todas', txt: 'Todas' },
];

export function ReasignacionesPage({ m }: { m: Modelo }) {
  const c = useReasignacionesController();
  const solicitar = usePermiso('reasignaciones.solicitar');
  const n = c.numPendientes;

  return (
    <div className="col" style={{ gap: 14 }}>
      <div className={`banner ${n > 0 ? 'banner-mid' : 'banner-neu'}`} role="status">
        {n === 0
          ? 'No hay solicitudes pendientes de aprobación.'
          : `${n} ${n === 1 ? 'solicitud pendiente' : 'solicitudes pendientes'} de aprobación.`}
      </div>
      <Aviso msg={c.acc.msg} />
      {solicitar && <SolicitarReasignacion m={m} />}
      <Seccion
        titulo="Solicitudes de reasignación"
        caja
        extra={
          <div className="chips" role="group" aria-label="Filtrar por estado">
            {FILTROS.map((f) => (
              <button
                key={f.v}
                type="button"
                aria-pressed={c.filtro === f.v}
                className={`btn btn-sm${c.filtro === f.v ? ' btn-primario' : ''}`}
                onClick={() => c.setFiltro(f.v)}
              >
                {f.txt}
              </button>
            ))}
          </div>
        }
      >
        {c.lista.isLoading && <Cargando />}
        {c.lista.error && <p className="msg msg-err">{(c.lista.error as Error).message}</p>}
        {c.lista.data && <TablaReasignaciones m={m} c={c} filas={c.lista.data} />}
      </Seccion>
    </div>
  );
}
