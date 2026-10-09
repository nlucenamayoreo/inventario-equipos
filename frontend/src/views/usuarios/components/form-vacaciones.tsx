import { useState } from 'react';
import type { AccionVacacion, Usuario } from '../../../shared/api/types';
import { CustodioSelect } from '../../../shared/components/custodio-select';
import { ACCION_VACACION, Campo } from '../../../shared/components/ui';
import type { Modelo } from '../../../shared/domain/modelo';
import type { FichaController, FormVacaciones as Form } from '../hooks/use-ficha-controller';

export function FormVacaciones({ m, u, c }: { m: Modelo; u: Usuario; c: FichaController }) {
  const [f, setF] = useState<Form>({ desde: '', hasta: '', accion: '', suplenteId: '', nota: '' });
  const set = (k: keyof Form) => (e: { target: { value: string } }) =>
    setF({ ...f, [k]: e.target.value });
  const suplentes = m.usuarios.filter((x) => x.id !== u.id && x.estado === 'activo');

  return (
    <div className="panel">
      <span style={{ fontWeight: 700 }}>Registrar vacaciones</span>
      <div className="grid-2">
        <Campo label="Desde *">
          <input className="in" type="date" value={f.desde} onChange={set('desde')} />
        </Campo>
        <Campo label="Hasta *">
          <input
            className="in"
            type="date"
            value={f.hasta}
            min={f.desde || undefined}
            onChange={set('hasta')}
          />
        </Campo>
      </div>
      <Campo label="¿Qué pasa con sus equipos? *">
        <select className="in" value={f.accion} onChange={set('accion')}>
          <option value="">Seleccione…</option>
          {(Object.keys(ACCION_VACACION) as AccionVacacion[]).map((k) => (
            <option key={k} value={k}>
              {ACCION_VACACION[k]}
            </option>
          ))}
        </select>
      </Campo>
      {f.accion === 'prestamo' && (
        <Campo label="Suplente que recibe los equipos *">
          <select className="in" value={f.suplenteId} onChange={set('suplenteId')}>
            <option value="">Seleccione…</option>
            {suplentes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre} · {m.deptoDe(s)?.nombre ?? '—'}
              </option>
            ))}
          </select>
        </Campo>
      )}
      {f.accion === 'resguardo' && (
        <CustodioSelect m={m} value={c.custodio} onChange={c.setCustodio} />
      )}
      <Campo label="Observación">
        <input className="in" value={f.nota} onChange={set('nota')} placeholder="Opcional" />
      </Campo>
      <div className="fila" style={{ gap: 8 }}>
        <button
          type="button"
          className="btn btn-primario"
          onClick={() => c.guardarVacaciones(f)}
          disabled={c.pendiente}
        >
          Guardar
        </button>
        <button type="button" className="btn" onClick={c.cerrar}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
