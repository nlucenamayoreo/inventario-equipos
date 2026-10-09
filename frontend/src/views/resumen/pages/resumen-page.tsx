import { useNavigate } from 'react-router-dom';
import { FiltrosBar } from '../../../shared/components/filtros-bar';
import { Pill, PillEstadoUsuario, Seccion, Tabla } from '../../../shared/components/ui';
import type { Modelo } from '../../../shared/domain/modelo';
import { useResumenController } from '../hooks/use-resumen-controller';

export function ResumenPage({ m }: { m: Modelo }) {
  const nav = useNavigate();

  const r = useResumenController(m);

  const nombreSilo = (id: number | null) => (id != null ? m.idx.silo.get(id)?.nombre : null) ?? '—';

  return (
    <div className="col" style={{ gap: 24 }}>
      <FiltrosBar m={m} />

      <section aria-label="Indicadores" className="kpis">
        {r.kpis.map((k) => (
          <div key={k.label} className="tarjeta">
            <span className="kpi-label">{k.label}</span>
            <span className="kpi-val" style={{ color: k.color }}>
              {k.val}
            </span>
            <span className="kpi-sub">{k.sub}</span>
          </div>
        ))}
      </section>

      <Seccion titulo="Cobertura por silo">
        <div className="cards">
          {r.silos.map((c) => (
            <div key={c.s.id} className="tarjeta" style={{ gap: 10 }}>
              <div className="fila" style={{ justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 700 }}>{c.s.nombre}</span>
                <Pill tono={c.tono}>{c.pct}% dotado</Pill>
              </div>
              <div
                className="barra"
                role="progressbar"
                aria-valuenow={c.pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Cobertura ${c.s.nombre}`}
              >
                <div style={{ width: `${c.pct}%` }} />
              </div>
              <div className="fila" style={{ gap: 16, fontSize: 12, color: 'var(--texto-2)' }}>
                <span>{c.usuarios} usuarios</span>
                <span>{c.eq} equipos</span>
                <span>{c.faltantes} faltantes</span>
              </div>
            </div>
          ))}
        </div>
      </Seccion>

      <Seccion
        titulo="Cobertura por departamento"
        extra={
          <span className="sec-nota">
            Usuarios que lo tienen / usuarios cuyo cargo lo exige · «—» ningún cargo lo exige
          </span>
        }
      >
        <Tabla>
          <thead>
            <tr>
              <th>Departamento</th>
              <th>Silo</th>
              <th>Usuarios</th>
              {m.tipos.map((t) => (
                <th key={t.id} className="c">
                  {t.nombre}
                </th>
              ))}
              <th className="c">Faltantes</th>
            </tr>
          </thead>
          <tbody>
            {r.deptos.map((row) => (
              <tr key={row.d.id}>
                <td style={{ fontWeight: 600 }}>{row.d.nombre}</td>
                <td>{nombreSilo(row.d.siloId)}</td>
                <td>{row.n}</td>
                {row.celdas.map((c) => (
                  <td key={c.t}>
                    <div className={`celda pill-${c.tono}`}>{c.txt}</div>
                  </td>
                ))}
                <td>
                  <div className={`celda pill-${row.gaps ? 'bad' : 'ok'}`}>{row.gaps}</div>
                </td>
              </tr>
            ))}
            {!r.deptos.length && (
              <tr>
                <td colSpan={m.tipos.length + 4} className="vacio">
                  No hay departamentos en el filtro.
                </td>
              </tr>
            )}
          </tbody>
        </Tabla>
        <div className="leyenda">
          <span>
            <i style={{ background: '#2E8B57' }} />
            100% dotado
          </span>
          <span>
            <i style={{ background: '#E0A100' }} />
            50–99%
          </span>
          <span>
            <i style={{ background: '#C8373E' }} />
            Menos de 50%
          </span>
        </div>
      </Seccion>

      <Seccion titulo="Stock disponible para asignar">
        <div className="fila">
          {r.stock.map((s) => (
            <div key={s.t.id} className="stock">
              <Pill tono={s.n ? 'ok' : 'bad'} className="kpi-stock">
                {s.n}
              </Pill>
              <span>{s.t.nombre}</span>
            </div>
          ))}
        </div>
      </Seccion>

      <Seccion
        titulo="Matriz usuario × equipo"
        extra={
          <span className="sec-nota">
            {r.matriz.length} usuarios en el filtro · serial asignado · «Opcional» el cargo lo
            permite · «No aplica» el cargo no lo permite
          </span>
        }
      >
        <Tabla>
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Estado</th>
              <th>Departamento</th>
              <th>Silo</th>
              {m.tipos.map((t) => (
                <th key={t.id} className="c">
                  {t.nombre}
                </th>
              ))}
              <th className="c">Faltan</th>
              <th>
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {r.matriz.map(({ u, celdas, falt }) => (
              <tr key={u.id}>
                <td>
                  <div className="col" style={{ gap: 0 }}>
                    <span style={{ fontWeight: 600 }}>{u.nombre}</span>
                    <span style={{ fontSize: 11 }} className="tenue">
                      {u.codigo} · {m.cargoDe(u)?.nombre ?? 'Sin cargo'}
                    </span>
                  </div>
                </td>
                <td>
                  <PillEstadoUsuario estado={u.estado} />
                </td>
                <td>{m.deptoDe(u)?.nombre ?? '—'}</td>
                <td>{nombreSilo(m.siloIdDe(u))}</td>
                {celdas.map((c) => (
                  <td key={c.t}>
                    <div className={`celda pill-${c.tono}`}>{c.txt}</div>
                  </td>
                ))}
                <td>
                  <div className={`celda pill-${falt ? 'bad' : 'ok'}`}>{falt}</div>
                </td>
                <td>
                  <button
                    type="button"
                    className="btn btn-sm btn-link"
                    onClick={() => nav(`/usuarios/${u.id}`)}
                  >
                    Ver ficha
                  </button>
                </td>
              </tr>
            ))}
            {!r.matriz.length && (
              <tr>
                <td colSpan={m.tipos.length + 6} className="vacio">
                  No hay usuarios que coincidan con el filtro.
                </td>
              </tr>
            )}
          </tbody>
        </Tabla>
      </Seccion>
    </div>
  );
}
