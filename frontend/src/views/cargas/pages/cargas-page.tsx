import type { Modelo } from '../../../shared/domain/modelo';
import { usePermiso } from '../../../shared/state/datos';
import { MAX_FILAS } from '../api/machotes';
import { TarjetaCarga } from '../components/tarjeta-carga';
import { useCargaController } from '../hooks/use-carga-controller';

export function CargasPage({ m }: { m: Modelo }) {
  const puedeUsuarios = usePermiso('usuarios.gestionar');
  const puedeActivos = usePermiso('activos.registrar');
  const usuarios = useCargaController('usuarios', m);
  const activos = useCargaController('activos', m);

  if (!puedeUsuarios && !puedeActivos)
    return (
      <p className="vacio">
        Su rol no tiene permiso para cargas masivas de usuarios ni de activos.
      </p>
    );

  return (
    <div className="col" style={{ gap: 14 }}>
      <p className="sec-nota">
        Descargue el machote, llénelo en Excel y súbalo. Primero se valida cada fila sin guardar
        nada; la carga se aplica solo si no hay errores y es todo o nada. Máximo {MAX_FILAS} filas
        por archivo.
      </p>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))',
          gap: 16,
          alignItems: 'start',
        }}
      >
        {puedeUsuarios && (
          <TarjetaCarga titulo="Usuarios" c={usuarios}>
            <p style={{ margin: 0 }}>
              Alta de usuarios con su código, nombre, correo, cargo, departamento y silo. El cargo y
              el departamento deben existir en Catálogos.
            </p>
            <div className="banner banner-mid">
              <strong>Carga preliminar.</strong>
              <span>
                Mientras no esté conectada la sincronización con Google Workspace, esta carga sirve
                para tener los usuarios en el inventario; al conectarla, Google Workspace pasará a
                ser la fuente de altas y desactivaciones.
              </span>
            </div>
          </TarjetaCarga>
        )}
        {puedeActivos && (
          <TarjetaCarga titulo="Activos" c={activos}>
            <p style={{ margin: 0 }}>
              Alta de equipos con tipo, marca, modelo, serial y estado. Opcionalmente se asignan a
              un usuario por su código o quedan en resguardo de una persona con acceso. Las marcas,
              modelos y valores de características nuevos se crean si su rol puede gestionar
              artículos.
            </p>
          </TarjetaCarga>
        )}
      </div>
    </div>
  );
}
