import { Campo, Seccion } from '../../../shared/components/ui';
import type { Modelo } from '../../../shared/domain/modelo';
import type { CatalogosController } from '../hooks/use-catalogos-controller';

export function CatalogosBasicos({
  m,
  c,
  admin,
}: {
  m: Modelo;
  c: CatalogosController;
  admin: boolean;
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: 16,
        alignItems: 'start',
      }}
    >
      <Seccion titulo="Silos" caja>
        {admin && (
          <div className="fila" style={{ alignItems: 'flex-end', flexWrap: 'nowrap', gap: 8 }}>
            <Campo label="Nuevo silo" style={{ flex: 1 }}>
              <input
                className="in"
                value={c.f.silo}
                onChange={c.set('silo')}
                onKeyDown={(e) => e.key === 'Enter' && c.addSilo()}
              />
            </Campo>
            <button
              type="button"
              className="btn btn-primario"
              onClick={c.addSilo}
              disabled={c.acc.pendiente}
            >
              Agregar
            </button>
          </div>
        )}
        {m.silos.map((s) => (
          <div key={s.id} className="item">
            <span style={{ fontWeight: 600 }}>{s.nombre}</span>
            <span className="tenue" style={{ fontSize: 12 }}>
              {m.departamentos.filter((d) => d.siloId === s.id).length} deptos ·{' '}
              {c.usuariosCon((u) => m.siloIdDe(u) === s.id)} usuarios
            </span>
          </div>
        ))}
      </Seccion>

      <Seccion titulo="Departamentos" caja>
        {admin && (
          <>
            <div className="grid-2" style={{ gap: 8 }}>
              <Campo label="Nombre">
                <input className="in" value={c.f.depto} onChange={c.set('depto')} />
              </Campo>
              <Campo label="Silo">
                <select className="in" value={c.f.deptoSilo} onChange={c.set('deptoSilo')}>
                  <option value="">Seleccione…</option>
                  {m.silos.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombre}
                    </option>
                  ))}
                </select>
              </Campo>
            </div>
            <button
              type="button"
              className="btn btn-primario"
              onClick={c.addDepto}
              disabled={c.acc.pendiente}
            >
              Agregar departamento
            </button>
          </>
        )}
        {m.departamentos.map((d) => (
          <div key={d.id} className="item">
            <span style={{ fontWeight: 600 }}>{d.nombre}</span>
            <span className="tenue" style={{ fontSize: 12 }}>
              {m.idx.silo.get(d.siloId)?.nombre ?? '—'} ·{' '}
              {c.usuariosCon((u) => u.departamentoId === d.id)} usuarios
            </span>
          </div>
        ))}
      </Seccion>

      <Seccion titulo="Tipos de equipo (dotación estándar)" caja>
        {admin && (
          <div className="fila" style={{ alignItems: 'flex-end', flexWrap: 'nowrap', gap: 8 }}>
            <Campo label="Nuevo tipo" style={{ flex: 1 }}>
              <input
                className="in"
                value={c.f.tipo}
                onChange={c.set('tipo')}
                onKeyDown={(e) => e.key === 'Enter' && c.addTipo()}
              />
            </Campo>
            <button
              type="button"
              className="btn btn-primario"
              onClick={c.addTipo}
              disabled={c.acc.pendiente}
            >
              Agregar
            </button>
          </div>
        )}
        {m.tipos.map((t) => {
          const deTipo = m.activos.filter((a) => m.tipoDeActivo(a) === t.id);
          return (
            <div key={t.id} className="item">
              <span style={{ fontWeight: 600 }}>{t.nombre}</span>
              <span className="tenue" style={{ fontSize: 12 }}>
                {deTipo.filter((a) => a.estado !== 'de_baja').length} en inventario ·{' '}
                {deTipo.filter((a) => a.estado === 'disponible').length} disponibles
              </span>
            </div>
          );
        })}
      </Seccion>
    </div>
  );
}
