import { useState } from 'react';
import { api } from '../api';
import type { NivelDotacion } from '../api/types';
import { Aviso, Campo, NIVEL, Seccion, Tabla } from '../components/ui';
import type { Modelo } from '../domain/modelo';
import { nivelDe, restringidoDe } from '../domain/reglas';
import { useAccion } from '../state/datos';
import { useEsAdmin } from '../state/sesion';

export function CatalogosPage({ m }: { m: Modelo }) {
  const admin = useEsAdmin();
  const acc = useAccion();
  const [f, setF] = useState({ silo: '', depto: '', deptoSilo: '', tipo: '', cargo: '' });
  const [cargoSel, setCargoSel] = useState<number | null>(m.cargos[0]?.id ?? null);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  const agregar = async <T,>(campos: Partial<typeof f>, fn: () => Promise<T>, ok: string | ((r: T) => string)) => {
    const r = await acc.ejecutar(fn, ok);
    if (r) setF((x) => ({ ...x, ...campos }));
    return r;
  };

  const addSilo = () => f.silo.trim()
    ? agregar({ silo: '' }, () => api.crearSilo(f.silo), `Silo ${f.silo.trim()} agregado.`)
    : acc.setMsg({ texto: 'Indique el nombre del silo.', error: true });
  const addDepto = () => f.depto.trim() && f.deptoSilo
    ? agregar({ depto: '', deptoSilo: '' }, () => api.crearDepartamento(f.depto, Number(f.deptoSilo)), `Departamento ${f.depto.trim()} agregado.`)
    : acc.setMsg({ texto: 'Indique nombre y silo del departamento.', error: true });
  const addTipo = () => f.tipo.trim()
    ? agregar({ tipo: '' }, () => api.crearTipoEquipo(f.tipo), `Tipo ${f.tipo.trim()} agregado. Quedó como «No permitido» en todos los cargos: defina en qué cargos aplica.`)
    : acc.setMsg({ texto: 'Indique el tipo de equipo.', error: true });
  const addCargo = async () => {
    if (!f.cargo.trim()) return acc.setMsg({ texto: 'Indique el nombre del cargo.', error: true });
    const c = await agregar({ cargo: '' }, () => api.crearCargo(f.cargo), (r) => `Cargo ${r.nombre} creado con todos los equipos como opcionales. Ajuste su dotación.`);
    if (c) setCargoSel(c.id);
  };

  const pc = (cargoSel != null && m.idx.cargo.get(cargoSel)) || m.cargos[0];
  const usuariosCon = (pred: (u: Modelo['usuarios'][number]) => boolean) => m.usuarios.filter(pred).length;

  const cambiarDotacion = (tipoId: number, nivel: NivelDotacion, restr: number | null) => {
    if (!pc) return;
    const tipo = m.nombreTipo(tipoId);
    acc.ejecutar(() => api.actualizarDotacion(pc.id, tipoId, nivel, restr), `Dotación de «${pc.nombre}» actualizada: ${tipo} · ${NIVEL[nivel]}.`);
  };

  return (
    <div className="col" style={{ gap: 14 }}>
      <Aviso msg={acc.msg} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, alignItems: 'start' }}>
        <Seccion titulo="Silos" caja>
          {admin && (
            <div className="fila" style={{ alignItems: 'flex-end', flexWrap: 'nowrap', gap: 8 }}>
              <Campo label="Nuevo silo" style={{ flex: 1 }}><input className="in" value={f.silo} onChange={set('silo')} onKeyDown={(e) => e.key === 'Enter' && addSilo()} /></Campo>
              <button type="button" className="btn btn-primario" onClick={addSilo} disabled={acc.pendiente}>Agregar</button>
            </div>
          )}
          {m.silos.map((s) => (
            <div key={s.id} className="item">
              <span style={{ fontWeight: 600 }}>{s.nombre}</span>
              <span className="tenue" style={{ fontSize: 12 }}>
                {m.departamentos.filter((d) => d.siloId === s.id).length} deptos · {usuariosCon((u) => m.siloIdDe(u) === s.id)} usuarios
              </span>
            </div>
          ))}
        </Seccion>

        <Seccion titulo="Departamentos" caja>
          {admin && (
            <>
              <div className="grid-2" style={{ gap: 8 }}>
                <Campo label="Nombre"><input className="in" value={f.depto} onChange={set('depto')} /></Campo>
                <Campo label="Silo">
                  <select className="in" value={f.deptoSilo} onChange={set('deptoSilo')}>
                    <option value="">Seleccione…</option>
                    {m.silos.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                  </select>
                </Campo>
              </div>
              <button type="button" className="btn btn-primario" onClick={addDepto} disabled={acc.pendiente}>Agregar departamento</button>
            </>
          )}
          {m.departamentos.map((d) => (
            <div key={d.id} className="item">
              <span style={{ fontWeight: 600 }}>{d.nombre}</span>
              <span className="tenue" style={{ fontSize: 12 }}>{m.idx.silo.get(d.siloId)?.nombre ?? '—'} · {usuariosCon((u) => u.departamentoId === d.id)} usuarios</span>
            </div>
          ))}
        </Seccion>

        <Seccion titulo="Tipos de equipo (dotación estándar)" caja>
          {admin && (
            <div className="fila" style={{ alignItems: 'flex-end', flexWrap: 'nowrap', gap: 8 }}>
              <Campo label="Nuevo tipo" style={{ flex: 1 }}><input className="in" value={f.tipo} onChange={set('tipo')} onKeyDown={(e) => e.key === 'Enter' && addTipo()} /></Campo>
              <button type="button" className="btn btn-primario" onClick={addTipo} disabled={acc.pendiente}>Agregar</button>
            </div>
          )}
          {m.tipos.map((t) => {
            const deTipo = m.activos.filter((a) => m.tipoDeActivo(a) === t.id);
            return (
              <div key={t.id} className="item">
                <span style={{ fontWeight: 600 }}>{t.nombre}</span>
                <span className="tenue" style={{ fontSize: 12 }}>
                  {deTipo.filter((a) => a.estado !== 'de_baja').length} en inventario · {deTipo.filter((a) => a.estado === 'disponible').length} disponibles
                </span>
              </div>
            );
          })}
        </Seccion>
      </div>

      <Seccion titulo="Perfiles de dotación por cargo" caja
        extra={<span className="sec-nota" style={{ width: '100%' }}>Define qué equipos y artículos puede tener cada cargo. Se aplica al crear usuarios y al asignar equipos.</span>}>
        <div className="fila" style={{ alignItems: 'flex-start', gap: 20 }}>
          <div className="col" style={{ flex: '1 1 260px', minWidth: 0 }}>
            {admin && (
              <div className="fila" style={{ alignItems: 'flex-end', flexWrap: 'nowrap', gap: 8 }}>
                <Campo label="Nuevo cargo" style={{ flex: 1 }}><input className="in" value={f.cargo} onChange={set('cargo')} onKeyDown={(e) => e.key === 'Enter' && addCargo()} /></Campo>
                <button type="button" className="btn btn-primario" onClick={addCargo} disabled={acc.pendiente}>Agregar</button>
              </div>
            )}
            {m.cargos.map((c) => {
              const nO = m.tiposIds.filter((t) => nivelDe(c, t) === 'obligatorio').length;
              const nN = m.tiposIds.filter((t) => nivelDe(c, t) === 'no_permitido').length;
              return (
                <button key={c.id} type="button" className={`cargo-btn${pc?.id === c.id ? ' on' : ''}`} aria-pressed={pc?.id === c.id} onClick={() => setCargoSel(c.id)}>
                  <span style={{ fontWeight: 600 }}>{c.nombre}</span>
                  <span style={{ fontSize: 12, color: 'var(--texto-2)' }}>{usuariosCon((u) => u.cargoId === c.id)} usuarios · {nO} obligatorios · {nN} no permitidos</span>
                </button>
              );
            })}
          </div>
          <div className="col" style={{ flex: '999 1 520px', minWidth: 0, gap: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 700 }}>Cargo: {pc?.nombre ?? '—'}</span>
            {pc && (
              <Tabla>
                <thead><tr><th>Tipo de equipo</th><th>Nivel</th><th>Artículo permitido</th></tr></thead>
                <tbody>
                  {m.tipos.map((t) => {
                    const lv = nivelDe(pc, t.id);
                    const restr = restringidoDe(pc, t.id);
                    const estilo = lv === 'obligatorio' ? { borderColor: 'var(--acento)', color: 'var(--blu)', fontWeight: 600 } : lv === 'no_permitido' ? { color: 'var(--tenue)' } : undefined;
                    return (
                      <tr key={t.id}>
                        <td style={{ fontWeight: 600 }}>{t.nombre}</td>
                        <td>
                          <select className="in" aria-label={`Nivel de ${t.nombre}`} style={estilo} value={lv} disabled={!admin || acc.pendiente}
                            onChange={(e) => cambiarDotacion(t.id, e.target.value as NivelDotacion, e.target.value === 'no_permitido' ? null : restr)}>
                            {(Object.keys(NIVEL) as NivelDotacion[]).map((n) => <option key={n} value={n}>{NIVEL[n]}</option>)}
                          </select>
                        </td>
                        <td>
                          <select className="in" aria-label={`Artículo permitido de ${t.nombre}`} value={restr ?? ''} disabled={!admin || acc.pendiente || lv === 'no_permitido'}
                            onChange={(e) => cambiarDotacion(t.id, lv, e.target.value ? Number(e.target.value) : null)}>
                            <option value="">Cualquier artículo del tipo</option>
                            {m.articulos.filter((a) => a.tipoId === t.id).map((a) => <option key={a.id} value={a.id}>{a.marca} {a.modelo} ({a.codigo})</option>)}
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Tabla>
            )}
          </div>
        </div>
      </Seccion>

      <Seccion titulo={`Catálogo de artículos (${m.articulos.length})`} extra={<span className="sec-nota">Los artículos nuevos se crean desde Activos › Nuevo artículo</span>}>
        <Tabla>
          <thead><tr><th>Código</th><th>Tipo</th><th>Marca</th><th>Modelo</th><th>Especificaciones</th><th>Vida útil</th><th>Unidades</th><th>Disponibles</th></tr></thead>
          <tbody>
            {m.articulos.map((a) => {
              const uds = m.activos.filter((x) => x.articuloId === a.id);
              return (
                <tr key={a.id}>
                  <td>{a.codigo}</td>
                  <td style={{ fontWeight: 600 }}>{m.nombreTipo(a.tipoId)}</td>
                  <td>{a.marca}</td>
                  <td>{a.modelo}</td>
                  <td>{a.especificaciones || '—'}</td>
                  <td>{a.vidaUtilMeses != null ? `${a.vidaUtilMeses} meses` : '—'}</td>
                  <td>{uds.filter((x) => x.estado !== 'de_baja').length}</td>
                  <td>{uds.filter((x) => x.estado === 'disponible').length}</td>
                </tr>
              );
            })}
          </tbody>
        </Tabla>
      </Seccion>
    </div>
  );
}
