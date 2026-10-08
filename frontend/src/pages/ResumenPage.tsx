import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiltrosBar } from '../components/FiltrosBar';
import { Pill, PillEstadoUsuario, Seccion, Tabla, type TonoPill } from '../components/ui';
import type { Modelo } from '../domain/modelo';
import { esVigente, tonoCobertura } from '../domain/reglas';
import { coincide, enAlcance, useFiltros } from '../state/filtros';

export function ResumenPage({ m }: { m: Modelo }) {
  const f = useFiltros();
  const nav = useNavigate();

  const r = useMemo(() => {
    const alcance = m.usuarios.filter((u) => enAlcance(m, f, u));
    const vigentes = alcance.filter(esVigente);
    const filtrados = vigentes.filter((u) => coincide(m, f, u));
    const cnt = (e: string) => m.activos.filter((a) => a.estado === e).length;
    const faltan = new Map(vigentes.map((u) => [u.id, m.faltantesDe(u)]));
    const conFaltantes = vigentes.filter((u) => faltan.get(u.id)!.length > 0).length;
    const fuera = m.activos.filter(m.fueraDePerfil).length;
    const desactivados = alcance.filter((u) => u.estado === 'desactivado').length;

    const kpis: { label: string; val: number; sub: string; color: string }[] = [
      { label: 'Equipos activos', val: m.activos.length - cnt('de_baja'), sub: 'Excluye equipos de baja', color: 'var(--texto)' },
      { label: 'Asignados', val: cnt('asignado'), sub: 'En uso por su titular', color: 'var(--primario)' },
      { label: 'Resguardo / préstamo', val: cnt('en_resguardo') + cnt('prestamo'), sub: `${cnt('en_resguardo')} en TI · ${cnt('prestamo')} prestados`, color: 'var(--pur)' },
      { label: 'Disponibles', val: cnt('disponible'), sub: 'Listos para asignar', color: 'var(--ok)' },
      { label: 'Usuarios de vacaciones', val: vigentes.filter((u) => u.estado === 'vacaciones').length, sub: 'En el filtro actual', color: 'var(--mid)' },
      { label: 'Usuarios con faltantes', val: conFaltantes, sub: `${vigentes.length - conFaltantes} de ${vigentes.length} con dotación obligatoria completa`, color: 'var(--bad)' },
      { label: 'Fuera de perfil', val: fuera, sub: 'Equipos que el cargo no permite', color: 'var(--pur)' },
      { label: 'Usuarios desactivados', val: desactivados, sub: 'Detectados en Google o manual', color: 'var(--bad)' },
      { label: 'Pendientes de recuperación', val: cnt('pendiente_recuperacion'), sub: 'Equipos de usuarios desactivados', color: 'var(--bad)' },
    ];

    const tiene = (uid: number, t: number) => m.tiposTenidos(uid).has(t);

    const silos = m.silos.filter((s) => !f.silo || String(s.id) === f.silo).map((s) => {
      const us = m.usuarios.filter((u) => esVigente(u) && m.siloIdDe(u) === s.id);
      let eq = 0, hv = 0, tot = 0;
      for (const u of us) {
        eq += m.tenenciaDe(u.id).length;
        for (const t of m.tiposIds) if (m.nivel(u, t) === 'obligatorio') { tot++; if (tiene(u.id, t)) hv++; }
      }
      return { s, usuarios: us.length, eq, faltantes: tot - hv, pct: tot ? Math.round((hv / tot) * 100) : 0, tono: tonoCobertura(hv, tot) };
    });

    const deptos = m.departamentos
      .filter((d) => (!f.silo || String(d.siloId) === f.silo) && (!f.depto || String(d.id) === f.depto))
      .map((d) => {
        const us = m.usuarios.filter((u) => esVigente(u) && u.departamentoId === d.id);
        let gaps = 0;
        const celdas = m.tiposIds.map((t) => {
          const req = us.filter((u) => m.nivel(u, t) === 'obligatorio');
          const hv = req.filter((u) => tiene(u.id, t)).length;
          gaps += req.length - hv;
          return { t, txt: req.length ? `${hv} / ${req.length}` : '—', tono: tonoCobertura(hv, req.length) };
        });
        return { d, n: us.length, celdas, gaps };
      });

    const stock = m.tipos.map((t) => ({
      t, n: m.activos.filter((a) => a.estado === 'disponible' && m.tipoDeActivo(a) === t.id).length,
    }));

    const matriz = filtrados.map((u) => {
      const mios = m.tenenciaDe(u.id);
      const celdas = m.tiposIds.map((t): { t: number; txt: string; tono: TonoPill } => {
        const hit = mios.filter((a) => m.tipoDeActivo(a) === t);
        if (hit.length) {
          const fueraP = hit.some(m.fueraDePerfil);
          const fuera = hit.every((a) => a.estado !== 'asignado');
          return { t, txt: hit.map((a) => a.serial).join(', ') + (fueraP ? ' · fuera de perfil' : ''), tono: fueraP ? 'pur' : fuera ? 'mid' : 'ok' };
        }
        const lv = m.nivel(u, t);
        if (lv === 'obligatorio') return { t, txt: 'Falta', tono: 'bad' };
        if (lv === 'permitido') return { t, txt: 'Opcional', tono: 'neu' };
        return { t, txt: 'No aplica', tono: 'na' };
      });
      return { u, celdas, falt: faltan.get(u.id)!.length };
    });

    return { kpis, silos, deptos, stock, matriz };
  }, [m, f]);

  const nombreSilo = (id: number | null) => (id != null ? m.idx.silo.get(id)?.nombre : null) ?? '—';

  return (
    <div className="col" style={{ gap: 24 }}>
      <FiltrosBar m={m} />

      <section aria-label="Indicadores" className="kpis">
        {r.kpis.map((k) => (
          <div key={k.label} className="tarjeta">
            <span className="kpi-label">{k.label}</span>
            <span className="kpi-val" style={{ color: k.color }}>{k.val}</span>
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
              <div className="barra" role="progressbar" aria-valuenow={c.pct} aria-valuemin={0} aria-valuemax={100} aria-label={`Cobertura ${c.s.nombre}`}>
                <div style={{ width: `${c.pct}%` }} />
              </div>
              <div className="fila" style={{ gap: 16, fontSize: 12, color: 'var(--texto-2)' }}>
                <span>{c.usuarios} usuarios</span><span>{c.eq} equipos</span><span>{c.faltantes} faltantes</span>
              </div>
            </div>
          ))}
        </div>
      </Seccion>

      <Seccion titulo="Cobertura por departamento" extra={<span className="sec-nota">Usuarios que lo tienen / usuarios cuyo cargo lo exige · «—» ningún cargo lo exige</span>}>
        <Tabla>
          <thead>
            <tr>
              <th>Departamento</th><th>Silo</th><th>Usuarios</th>
              {m.tipos.map((t) => <th key={t.id} className="c">{t.nombre}</th>)}
              <th className="c">Faltantes</th>
            </tr>
          </thead>
          <tbody>
            {r.deptos.map((row) => (
              <tr key={row.d.id}>
                <td style={{ fontWeight: 600 }}>{row.d.nombre}</td>
                <td>{nombreSilo(row.d.siloId)}</td>
                <td>{row.n}</td>
                {row.celdas.map((c) => <td key={c.t}><div className={`celda pill-${c.tono}`}>{c.txt}</div></td>)}
                <td><div className={`celda pill-${row.gaps ? 'bad' : 'ok'}`}>{row.gaps}</div></td>
              </tr>
            ))}
            {!r.deptos.length && <tr><td colSpan={m.tipos.length + 4} className="vacio">No hay departamentos en el filtro.</td></tr>}
          </tbody>
        </Tabla>
        <div className="leyenda">
          <span><i style={{ background: '#2E8B57' }} />100% dotado</span>
          <span><i style={{ background: '#E0A100' }} />50–99%</span>
          <span><i style={{ background: '#C8373E' }} />Menos de 50%</span>
        </div>
      </Seccion>

      <Seccion titulo="Stock disponible para asignar">
        <div className="fila">
          {r.stock.map((s) => (
            <div key={s.t.id} className="stock">
              <Pill tono={s.n ? 'ok' : 'bad'} className="kpi-stock">{s.n}</Pill>
              <span>{s.t.nombre}</span>
            </div>
          ))}
        </div>
      </Seccion>

      <Seccion titulo="Matriz usuario × equipo"
        extra={<span className="sec-nota">{r.matriz.length} usuarios en el filtro · serial asignado · «Opcional» el cargo lo permite · «No aplica» el cargo no lo permite</span>}>
        <Tabla>
          <thead>
            <tr>
              <th>Usuario</th><th>Estado</th><th>Departamento</th><th>Silo</th>
              {m.tipos.map((t) => <th key={t.id} className="c">{t.nombre}</th>)}
              <th className="c">Faltan</th><th><span className="sr-only">Acciones</span></th>
            </tr>
          </thead>
          <tbody>
            {r.matriz.map(({ u, celdas, falt }) => (
              <tr key={u.id}>
                <td>
                  <div className="col" style={{ gap: 0 }}>
                    <span style={{ fontWeight: 600 }}>{u.nombre}</span>
                    <span style={{ fontSize: 11 }} className="tenue">{u.codigo} · {m.cargoDe(u)?.nombre ?? 'Sin cargo'}</span>
                  </div>
                </td>
                <td><PillEstadoUsuario estado={u.estado} /></td>
                <td>{m.deptoDe(u)?.nombre ?? '—'}</td>
                <td>{nombreSilo(m.siloIdDe(u))}</td>
                {celdas.map((c) => <td key={c.t}><div className={`celda pill-${c.tono}`}>{c.txt}</div></td>)}
                <td><div className={`celda pill-${falt ? 'bad' : 'ok'}`}>{falt}</div></td>
                <td><button type="button" className="btn btn-sm btn-link" onClick={() => nav(`/usuarios/${u.id}`)}>Ver ficha</button></td>
              </tr>
            ))}
            {!r.matriz.length && <tr><td colSpan={m.tipos.length + 6} className="vacio">No hay usuarios que coincidan con el filtro.</td></tr>}
          </tbody>
        </Tabla>
      </Seccion>
    </div>
  );
}
