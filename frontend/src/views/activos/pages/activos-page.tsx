import type { Modelo } from '../../../shared/domain/modelo';
import { useEsAdmin } from '../../../shared/state/datos';
import { HistorialActivo } from '../components/historial-activo';
import { RegistrarActivo } from '../components/registrar-activo';
import { TablaActivos } from '../components/tabla-activos';
import { useActivosController } from '../hooks/use-activos-controller';

export function ActivosPage({ m }: { m: Modelo }) {
  const admin = useEsAdmin();
  const c = useActivosController(m);
  return (
    <div className="col" style={{ gap: 20 }}>
      {admin && <RegistrarActivo m={m} />}
      <TablaActivos m={m} c={c} admin={admin} />
      {c.historial && (
        <HistorialActivo m={m} activo={c.historial} onCerrar={() => c.setHistorial(null)} />
      )}
    </div>
  );
}
