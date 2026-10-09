import { DotacionChips } from '../../../shared/components/dotacion-chips';
import { Aviso, Campo, Seccion } from '../../../shared/components/ui';
import type { Modelo } from '../../../shared/domain/modelo';
import type { FormUsuario, useUsuariosController } from '../hooks/use-usuarios-controller';

type Ctrl = ReturnType<typeof useUsuariosController>;

export function CrearUsuario({ m, c }: { m: Modelo; c: Ctrl }) {
  const set = (k: keyof FormUsuario) => (e: { target: { value: string } }) =>
    c.setForm({ ...c.form, [k]: e.target.value });
  return (
    <Seccion titulo="Crear usuario" caja>
      <div className="grid-form">
        <Campo label="Código / cédula *">
          <input
            className="in"
            value={c.form.codigo}
            onChange={set('codigo')}
            placeholder="Ej. U-014"
          />
        </Campo>
        <Campo label="Nombre completo *">
          <input className="in" value={c.form.nombre} onChange={set('nombre')} />
        </Campo>
        <Campo label="Correo">
          <input
            className="in"
            type="email"
            value={c.form.correo}
            onChange={set('correo')}
            placeholder="nombre@empresa.com"
          />
        </Campo>
        <Campo label="Cargo *">
          <select className="in" value={c.form.cargoId} onChange={set('cargoId')}>
            <option value="">Seleccione…</option>
            {m.cargos
              .filter((x) => x.activo)
              .map((x) => (
                <option key={x.id} value={x.id}>
                  {x.nombre}
                </option>
              ))}
          </select>
        </Campo>
        <Campo label="Departamento *">
          <select className="in" value={c.form.departamentoId} onChange={set('departamentoId')}>
            <option value="">Seleccione…</option>
            {m.departamentos
              .filter((d) => d.activo)
              .map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nombre} · {m.idx.silo.get(d.siloId)?.nombre ?? ''}
                </option>
              ))}
          </select>
        </Campo>
      </div>
      {c.cargoForm && (
        <div className="panel" style={{ padding: '10px 12px', gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--texto-2)' }}>
            Dotación definida para el cargo «{c.cargoForm.nombre}»
          </span>
          <DotacionChips m={m} cargo={c.cargoForm} />
        </div>
      )}
      <div className="fila" style={{ gap: 12 }}>
        <button
          type="button"
          className="btn btn-primario btn-lg"
          onClick={c.crear}
          disabled={c.accion.pendiente}
        >
          Guardar usuario
        </button>
        <Aviso msg={c.accion.msg} />
      </div>
    </Seccion>
  );
}
