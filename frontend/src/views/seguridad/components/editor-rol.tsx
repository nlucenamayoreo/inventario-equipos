import { useState } from 'react';
import type { Permiso, Rol } from '../../../shared/api/types';
import { Campo, Pill } from '../../../shared/components/ui';
import type { SeguridadController } from '../hooks/use-seguridad-controller';
import { PermisosChecks } from './permisos-checks';

/** Edición de un rol: nombre, descripción, permisos y estado. El rol del sistema es de solo lectura. */
export function EditorRol({ rol, c }: { rol: Rol; c: SeguridadController }) {
  const [nombre, setNombre] = useState(rol.nombre);
  const [descripcion, setDescripcion] = useState(rol.descripcion ?? '');
  const [sel, setSel] = useState<Set<Permiso>>(new Set(rol.permisos));
  const soloLectura = rol.esSistema;

  const guardar = () => {
    if (!nombre.trim()) return c.acc.setMsg({ texto: 'Indique el nombre del rol.', error: true });
    c.editarRol(
      rol.id,
      { nombre: nombre.trim(), descripcion: descripcion.trim() || null, permisos: [...sel] },
      `Rol «${nombre.trim()}» actualizado.`,
    );
  };
  const alternarActivo = () =>
    c.editarRol(
      rol.id,
      { activo: !rol.activo },
      `Rol «${rol.nombre}» ${rol.activo ? 'desactivado' : 'activado'}.`,
    );

  return (
    <div className="col" style={{ gap: 10 }}>
      <div className="fila" style={{ justifyContent: 'space-between', gap: 8 }}>
        <span style={{ fontWeight: 700 }}>{rol.nombre}</span>
        {soloLectura ? (
          <Pill tono="pur">Rol del sistema · todos los permisos</Pill>
        ) : (
          <Pill tono={rol.activo ? 'ok' : 'neu'}>{rol.activo ? 'Activo' : 'Inactivo'}</Pill>
        )}
      </div>
      {!soloLectura && (
        <div className="grid-2" style={{ gap: 8 }}>
          <Campo label="Nombre *">
            <input className="in" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </Campo>
          <Campo label="Descripción">
            <input
              className="in"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
            />
          </Campo>
        </div>
      )}
      {soloLectura && rol.descripcion && <span className="sec-nota">{rol.descripcion}</span>}
      <PermisosChecks
        grupos={c.grupos}
        sel={sel}
        onChange={setSel}
        disabled={soloLectura}
        todos={soloLectura}
      />
      {!soloLectura && (
        <div className="fila" style={{ gap: 8 }}>
          <button
            type="button"
            className="btn btn-primario"
            onClick={guardar}
            disabled={c.acc.pendiente}
          >
            Guardar cambios
          </button>
          <button
            type="button"
            className={`btn ${rol.activo ? 'btn-borde-peligro' : 'btn-ok'}`}
            onClick={alternarActivo}
            disabled={c.acc.pendiente}
          >
            {rol.activo ? 'Desactivar rol' : 'Activar rol'}
          </button>
        </div>
      )}
    </div>
  );
}
