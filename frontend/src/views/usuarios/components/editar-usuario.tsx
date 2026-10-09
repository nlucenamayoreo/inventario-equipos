import { useState } from 'react';
import type { Usuario } from '../../../shared/api/types';
import { Campo } from '../../../shared/components/ui';
import type { Modelo } from '../../../shared/domain/modelo';
import type { FichaController, FormEdicion } from '../hooks/use-ficha-controller';

export function EditarUsuario({ m, u, c }: { m: Modelo; u: Usuario; c: FichaController }) {
  const [f, setF] = useState<FormEdicion>({
    codigo: u.codigo,
    nombre: u.nombre,
    correo: u.correo ?? '',
    cargoId: u.cargoId ? String(u.cargoId) : '',
    departamentoId: u.departamentoId ? String(u.departamentoId) : '',
  });
  const set = (k: keyof FormEdicion) => (e: { target: { value: string } }) =>
    setF({ ...f, [k]: e.target.value });
  const nuevoCargo = f.cargoId ? Number(f.cargoId) : null;
  const quedanFuera =
    nuevoCargo && nuevoCargo !== u.cargoId
      ? c.enUso.filter((a) => !m.puedeRecibir({ ...u, cargoId: nuevoCargo }, a)).length
      : 0;

  return (
    <div className="panel">
      <span style={{ fontWeight: 700 }}>Editar usuario</span>
      <div className="grid-2">
        <Campo label="Código / cédula *">
          <input className="in" value={f.codigo} onChange={set('codigo')} />
        </Campo>
        <Campo label="Nombre completo *">
          <input className="in" value={f.nombre} onChange={set('nombre')} />
        </Campo>
      </div>
      <Campo label="Correo">
        <input className="in" type="email" value={f.correo} onChange={set('correo')} />
      </Campo>
      <div className="grid-2">
        <Campo label="Cargo *">
          <select className="in" value={f.cargoId} onChange={set('cargoId')}>
            <option value="">Seleccione…</option>
            {m.cargos.map((x) => (
              <option key={x.id} value={x.id}>
                {x.nombre}
              </option>
            ))}
          </select>
        </Campo>
        <Campo label="Departamento *">
          <select className="in" value={f.departamentoId} onChange={set('departamentoId')}>
            <option value="">Seleccione…</option>
            {m.departamentos.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nombre} · {m.idx.silo.get(d.siloId)?.nombre ?? ''}
              </option>
            ))}
          </select>
        </Campo>
      </div>
      {quedanFuera > 0 && (
        <span style={{ fontSize: 12, color: 'var(--pur)', fontWeight: 600 }}>
          Con el nuevo cargo, {quedanFuera} equipo(s) quedarán «fuera de perfil». No se liberan
          automáticamente.
        </span>
      )}
      <div className="fila" style={{ gap: 8 }}>
        <button
          type="button"
          className="btn btn-primario"
          onClick={() => c.guardarEdicion(f)}
          disabled={c.pendiente}
        >
          Guardar cambios
        </button>
        <button type="button" className="btn" onClick={c.cerrar}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
