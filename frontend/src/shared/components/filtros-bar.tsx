import type { Modelo } from '../domain/modelo';
import { useFiltros } from '../state/filtros';
import { Campo } from './ui';

/** Filtros silo → departamento → búsqueda. `compacto` para cabeceras de listados. */
export function FiltrosBar({ m, compacto }: { m: Modelo; compacto?: boolean }) {
  const f = useFiltros();
  const deptos = m.departamentos.filter((d) => !f.silo || String(d.siloId) === f.silo);

  const silo = (
    <select
      className="in"
      aria-label={compacto ? 'Filtrar por silo' : undefined}
      style={compacto ? { width: 170 } : undefined}
      value={f.silo}
      onChange={(e) => f.setSilo(e.target.value)}
    >
      <option value="">Todos los silos</option>
      {m.silos.map((s) => (
        <option key={s.id} value={s.id}>
          {s.nombre}
        </option>
      ))}
    </select>
  );
  const depto = (
    <select
      className="in"
      aria-label={compacto ? 'Filtrar por departamento' : undefined}
      style={compacto ? { width: 190 } : undefined}
      value={f.depto}
      onChange={(e) => f.setDepto(e.target.value)}
    >
      <option value="">Todos los departamentos</option>
      {deptos.map((d) => (
        <option key={d.id} value={d.id}>
          {d.nombre}
        </option>
      ))}
    </select>
  );
  const q = (
    <input
      className="in"
      type="search"
      aria-label={compacto ? 'Buscar usuario' : undefined}
      placeholder={compacto ? 'Buscar…' : 'Nombre, código o cargo'}
      style={compacto ? { width: 180 } : undefined}
      value={f.q}
      onChange={(e) => f.setQ(e.target.value)}
    />
  );

  if (compacto)
    return (
      <div className="fila" style={{ gap: 8 }}>
        {silo}
        {depto}
        {q}
      </div>
    );
  return (
    <section aria-label="Filtros" className="filtros">
      <Campo label="Silo" style={{ flex: '1 1 200px' }}>
        {silo}
      </Campo>
      <Campo label="Departamento" style={{ flex: '1 1 200px' }}>
        {depto}
      </Campo>
      <Campo label="Buscar usuario" style={{ flex: '2 1 260px' }}>
        {q}
      </Campo>
      <button type="button" className="btn" onClick={f.limpiar}>
        Limpiar filtros
      </button>
    </section>
  );
}
