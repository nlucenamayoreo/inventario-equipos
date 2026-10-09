import { useState } from 'react';
import { Campo } from '../../../shared/components/ui';
import type { SeguridadController } from '../hooks/use-seguridad-controller';

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Invitación de una persona: se crea su acceso y recibe una contraseña temporal por correo. */
export function InvitarPersona({ c }: { c: SeguridadController }) {
  const vacio = { correo: '', nombre: '', rolId: '' };
  const [f, setF] = useState(vacio);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) =>
    setF({ ...f, [k]: e.target.value });

  const invitar = async () => {
    const correo = f.correo.trim().toLowerCase();
    if (!CORREO.test(correo))
      return c.acc.setMsg({ texto: 'Indique un correo válido.', error: true });
    if (!f.nombre.trim()) return c.acc.setMsg({ texto: 'Indique el nombre.', error: true });
    if (!f.rolId) return c.acc.setMsg({ texto: 'Seleccione el rol.', error: true });
    const r = await c.invitar({ correo, nombre: f.nombre.trim(), rolId: Number(f.rolId) });
    if (r) setF(vacio);
  };

  return (
    <div className="panel panel-azul">
      <span style={{ fontWeight: 700 }}>Invitar persona</span>
      <div className="grid-form">
        <Campo label="Correo *">
          <input className="in" type="email" value={f.correo} onChange={set('correo')} />
        </Campo>
        <Campo label="Nombre *">
          <input className="in" value={f.nombre} onChange={set('nombre')} />
        </Campo>
        <Campo label="Rol *">
          <select className="in" value={f.rolId} onChange={set('rolId')}>
            <option value="">Seleccione…</option>
            {c.rolesAsignables.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nombre}
              </option>
            ))}
          </select>
        </Campo>
      </div>
      <div>
        <button
          type="button"
          className="btn btn-primario"
          onClick={invitar}
          disabled={c.acc.pendiente}
        >
          Enviar invitación
        </button>
      </div>
    </div>
  );
}
