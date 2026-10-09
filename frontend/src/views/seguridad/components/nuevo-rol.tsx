import { useState } from 'react';
import type { Permiso } from '../../../shared/api/types';
import { Campo } from '../../../shared/components/ui';
import type { SeguridadController } from '../hooks/use-seguridad-controller';
import { PermisosChecks } from './permisos-checks';

/** Alta de un rol con su conjunto de permisos. */
export function NuevoRol({
  c,
  onCreado,
  onCancelar,
}: {
  c: SeguridadController;
  onCreado: (id: number) => void;
  onCancelar: () => void;
}) {
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [sel, setSel] = useState<Set<Permiso>>(new Set());

  const crear = async () => {
    if (!nombre.trim()) return c.acc.setMsg({ texto: 'Indique el nombre del rol.', error: true });
    const r = await c.crearRol({
      nombre: nombre.trim(),
      descripcion: descripcion.trim() || null,
      permisos: [...sel],
    });
    if (r) onCreado(r.id);
  };

  return (
    <div className="col" style={{ gap: 10 }}>
      <span style={{ fontWeight: 700 }}>Nuevo rol</span>
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
      <PermisosChecks grupos={c.grupos} sel={sel} onChange={setSel} />
      <div className="fila" style={{ gap: 8 }}>
        <button
          type="button"
          className="btn btn-primario"
          onClick={crear}
          disabled={c.acc.pendiente}
        >
          Crear rol
        </button>
        <button type="button" className="btn" onClick={onCancelar}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
