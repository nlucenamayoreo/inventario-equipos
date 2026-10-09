import { Aviso, Cargando } from '../../../shared/components/ui';
import type { Modelo } from '../../../shared/domain/modelo';
import { usePermiso } from '../../../shared/state/datos';
import { PersonasAcceso } from '../components/personas-acceso';
import { RolesPermisos } from '../components/roles-permisos';
import { useSeguridadController } from '../hooks/use-seguridad-controller';

// `m` se conserva por uniformidad con las demás vistas.
export function SeguridadPage(_props: { m: Modelo }) {
  const puede = usePermiso('seguridad.gestionar');
  if (!puede) return <p className="vacio">Su rol no permite administrar la seguridad.</p>;
  return <Seguridad />;
}

function Seguridad() {
  const c = useSeguridadController();
  if (c.cargando) return <Cargando />;
  if (c.error) return <p className="msg msg-err">{c.error}</p>;
  return (
    <div className="col" style={{ gap: 14 }}>
      <Aviso msg={c.acc.msg} />
      <RolesPermisos c={c} />
      <PersonasAcceso c={c} />
    </div>
  );
}
