import { Seccion } from '../../../shared/components/ui';
import type { Modelo } from '../../../shared/domain/modelo';
import { usePermisos } from '../../../shared/state/datos';
import { SolicitarReasignacion } from '../../reasignaciones/components/solicitar-reasignacion';
import { EntregarResguardo } from '../components/entregar-resguardo';
import { HistorialActivo } from '../components/historial-activo';
import { RegistrarActivo } from '../components/registrar-activo';
import { TablaActivos } from '../components/tabla-activos';
import { useActivosController } from '../hooks/use-activos-controller';

export function ActivosPage({ m }: { m: Modelo }) {
  const puede = usePermisos();
  const c = useActivosController(m);
  return (
    <div className="col" style={{ gap: 20 }}>
      {puede('activos.registrar') && <RegistrarActivo m={m} />}
      {c.reasignar && (
        <Seccion
          titulo={`Solicitar reasignación · S/N ${c.reasignar.serial}`}
          caja
          extra={
            <button type="button" className="btn btn-sm" onClick={() => c.setReasignar(null)}>
              Cerrar
            </button>
          }
        >
          <SolicitarReasignacion
            m={m}
            activoId={c.reasignar.id}
            onListo={() => c.setReasignar(null)}
          />
        </Seccion>
      )}
      <TablaActivos
        m={m}
        c={c}
        puede={{
          asignar: puede('activos.asignar'),
          reasignar: puede('reasignaciones.solicitar'),
        }}
      />
      {c.historial && (
        <HistorialActivo m={m} activo={c.historial} onCerrar={() => c.setHistorial(null)} />
      )}
      {c.entrega && (
        <EntregarResguardo
          m={m}
          entrega={c.entrega}
          pendiente={c.accion.pendiente}
          onConfirmar={c.confirmarEntrega}
          onCerrar={() => c.setEntrega(null)}
        />
      )}
    </div>
  );
}
