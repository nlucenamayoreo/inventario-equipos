import { useState } from 'react';
import { api } from '../api';
import type { AccionVacacion, Activo, Usuario } from '../api/types';
import type { Modelo } from '../domain/modelo';
import { useAccion } from '../state/datos';
import { useEsAdmin } from '../state/sesion';
import { DotacionChips } from './DotacionChips';
import { ACCION_VACACION, Aviso, Campo, fmtFecha, fmtFechaHora, Pill, PillEstadoActivo, PillEstadoUsuario } from './ui';

type Panel = null | 'editar' | 'vacaciones' | 'desactivar' | 'eliminar';

export function FichaUsuario({ m, u, onEliminado }: { m: Modelo; u: Usuario; onEliminado: () => void }) {
  const admin = useEsAdmin();
  const { ejecutar, msg, setMsg, pendiente } = useAccion();
  const [panel, setPanel] = useState<Panel>(null);
  const abrir = (p: Panel) => { setPanel(panel === p ? null : p); setMsg(null); };

  const cargo = m.cargoDe(u);
  const depto = m.deptoDe(u);
  const silo = depto ? m.idx.silo.get(depto.siloId) : undefined;
  const mios = m.activos.filter((a) => a.usuarioId === u.id);
  const pendientes = mios.filter((a) => a.estado === 'pendiente_recuperacion');
  const prestados = m.prestadosA(u.id);
  const faltan = m.faltantesDe(u);
  const vac = u.vacacion;
  const vigente = u.estado === 'activo' || u.estado === 'vacaciones';

  const liberar = (a: Activo) => ejecutar(() => api.liberarActivo(a.id),
    a.estado === 'pendiente_recuperacion' ? `Equipo ${a.serial} recuperado; quedó disponible.` : `Equipo ${a.serial} liberado.`);

  return (
    <div className="col" style={{ gap: 16 }}>
      <div className="ficha-cab">
        <div className="fila" style={{ justifyContent: 'space-between', gap: 8 }}>
          <span className="etiqueta">FICHA DEL USUARIO</span>
          <div className="fila" style={{ gap: 6 }}>
            {u.pendienteClasificar && <Pill tono="mid">Pendiente de clasificar</Pill>}
            <PillEstadoUsuario estado={u.estado} />
          </div>
        </div>
        <span className="nombre">{u.nombre}</span>
        <span className="dato">{u.codigo} · {cargo?.nombre ?? 'Sin cargo'}</span>
        <span className="dato">{depto?.nombre ?? 'Sin departamento'} · {silo?.nombre ?? '—'}</span>
        <span className="dato">{u.correo || 'Sin correo'}</span>
      </div>

      {u.estado === 'vacaciones' && vac && (
        <div className="banner banner-mid">
          <span style={{ fontWeight: 700 }}>De vacaciones: {fmtFecha(vac.desde)} al {fmtFecha(vac.hasta)}</span>
          <span style={{ fontSize: 12 }}>
            Equipos: {vac.accion === 'prestamo' ? `en préstamo a ${m.nombreUsuario(vac.suplenteId)}` : vac.accion === 'resguardo' ? 'entregados a TI en resguardo' : 'conserva sus equipos'}
            {vac.nota ? ` · ${vac.nota}` : ''}
          </span>
        </div>
      )}
      {u.estado === 'desactivado' && (
        <div className="banner banner-bad">
          <span style={{ fontWeight: 700 }}>
            Desactivado {u.fuenteDesactivacion === 'google' ? 'en Google Workspace' : 'manualmente'} · {fmtFechaHora(u.desactivadoEn)}
          </span>
          <span style={{ fontSize: 12 }}>
            {pendientes.length ? `${pendientes.length} equipo(s) pendiente(s) de recuperación. Al recibirlos use «Recibir».` : 'Sin equipos pendientes de recuperación.'}
          </span>
        </div>
      )}

      {admin && (
        <div className="fila" style={{ gap: 8 }}>
          {u.estado === 'activo' && <button type="button" className="btn" style={{ fontWeight: 600 }} onClick={() => abrir('vacaciones')}>Registrar vacaciones</button>}
          {u.estado === 'vacaciones' && (
            <button type="button" className="btn btn-ok" disabled={pendiente}
              onClick={() => ejecutar(() => api.finalizarVacaciones(u.id), 'Vacaciones finalizadas; los equipos vuelven a estar asignados al usuario.')}>
              Finalizar vacaciones
            </button>
          )}
          <button type="button" className="btn" onClick={() => abrir('editar')}>Editar</button>
          {vigente && <button type="button" className="btn" onClick={() => abrir('desactivar')}>Desactivar</button>}
          {u.estado === 'desactivado' && (
            <button type="button" className="btn btn-ok" disabled={pendiente}
              onClick={() => ejecutar(() => api.reactivarUsuario(u.id), 'Usuario reactivado. Los equipos pendientes siguen así hasta que TI decida.')}>
              Reactivar
            </button>
          )}
          <button type="button" className="btn btn-borde-peligro" onClick={() => abrir('eliminar')}>Eliminar usuario</button>
        </div>
      )}
      <Aviso msg={msg} />

      {panel === 'editar' && <EditarUsuario m={m} u={u} onListo={() => setPanel(null)} ejecutar={ejecutar} pendiente={pendiente} />}
      {panel === 'vacaciones' && <FormVacaciones m={m} u={u} onListo={() => setPanel(null)} ejecutar={ejecutar} setMsg={setMsg} pendiente={pendiente} />}

      {panel === 'desactivar' && (
        <div className="panel panel-rojo">
          <span style={{ fontWeight: 700, color: 'var(--bad)' }}>¿Desactivar a {u.nombre}?</span>
          <span style={{ fontSize: 12, color: '#5C1A1D' }}>
            {m.tenenciaDe(u.id).length
              ? `Sus ${m.tenenciaDe(u.id).length} equipo(s) pasarán a «Pendiente de recuperación».`
              : 'No tiene equipos en uso.'}
            {prestados.length ? ` Los ${prestados.length} equipo(s) que tiene en préstamo vuelven a TI en resguardo.` : ''}
            {' '}Use esta opción si la cuenta no se gestiona en Google Workspace.
          </span>
          <div className="fila" style={{ gap: 8 }}>
            <button type="button" className="btn btn-peligro" disabled={pendiente}
              onClick={async () => { if (await ejecutar(() => api.desactivarUsuario(u.id), 'Usuario desactivado; sus equipos quedaron pendientes de recuperación.')) setPanel(null); }}>
              Sí, desactivar
            </button>
            <button type="button" className="btn" onClick={() => setPanel(null)}>Cancelar</button>
          </div>
        </div>
      )}

      {panel === 'eliminar' && (
        <div className="panel panel-rojo">
          <span style={{ fontWeight: 700, color: 'var(--bad)' }}>¿Eliminar a {u.nombre}?</span>
          <span style={{ fontSize: 12, color: '#5C1A1D' }}>
            {mios.length ? `Sus ${mios.length} equipo(s) se liberarán y quedarán como disponibles en inventario.` : 'El usuario no tiene equipos asignados.'}
            {prestados.length ? ` Los ${prestados.length} equipo(s) que recibió en préstamo vuelven a TI en resguardo.` : ''}
            {' '}El historial se conserva.
          </span>
          <div className="fila" style={{ gap: 8 }}>
            <button type="button" className="btn btn-peligro" disabled={pendiente}
              onClick={async () => {
                const r = await ejecutar(() => api.eliminarUsuario(u.id), `Usuario ${u.nombre} eliminado; sus equipos quedaron disponibles.`);
                if (r) onEliminado();
              }}>
              Sí, eliminar
            </button>
            <button type="button" className="btn" onClick={() => setPanel(null)}>Cancelar</button>
          </div>
        </div>
      )}

      <div className="col">
        <span className="subtitulo">Equipos asignados ({mios.length})</span>
        {mios.map((a) => {
          const art = m.idx.articulo.get(a.articuloId);
          return (
            <div key={a.id} className="item">
              <div className="col" style={{ gap: 2 }}>
                <span style={{ fontWeight: 600 }}>{m.nombreTipo(m.tipoDeActivo(a))} · {art?.marca} {art?.modelo}</span>
                <span style={{ fontSize: 11 }} className="tenue">S/N <span className="mono">{a.serial}</span> · desde {fmtFecha(a.fechaAsignacion)}</span>
                <div className="chips">
                  {a.estado === 'prestamo'
                    ? <Pill tono="pur" small>Prestado a {m.nombreUsuario(a.prestadoA)}</Pill>
                    : <PillEstadoActivo estado={a.estado} small />}
                  {m.fueraDePerfil(a) && <Pill tono="pur" small>Fuera del perfil del cargo</Pill>}
                </div>
              </div>
              {admin && (
                <button type="button" className="btn btn-sm btn-txt-peligro" disabled={pendiente} onClick={() => liberar(a)}>
                  {a.estado === 'pendiente_recuperacion' ? 'Recibir' : 'Liberar'}
                </button>
              )}
            </div>
          );
        })}
        {!mios.length && <span className="tenue" style={{ fontSize: 12 }}>Sin equipos.</span>}
      </div>

      {prestados.length > 0 && (
        <div className="col">
          <span className="subtitulo">Equipos recibidos en préstamo</span>
          {prestados.map((a) => {
            const art = m.idx.articulo.get(a.articuloId);
            return (
              <div key={a.id} className="item item-punteado">
                <div className="col" style={{ gap: 2 }}>
                  <span style={{ fontWeight: 600 }}>{m.nombreTipo(m.tipoDeActivo(a))} · {art?.marca} {art?.modelo}</span>
                  <span style={{ fontSize: 11 }} className="tenue">S/N <span className="mono">{a.serial}</span> · titular: {m.nombreUsuario(a.usuarioId)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="col" style={{ gap: 6 }}>
        <span className="subtitulo">Dotación del cargo</span>
        {cargo ? <DotacionChips m={m} cargo={cargo} /> : <span className="tenue">Sin cargo asignado.</span>}
      </div>

      {vigente && (
        <div className="col" style={{ gap: 6 }}>
          <span className="subtitulo">Le falta (obligatorio por cargo)</span>
          <div className="chips">
            {faltan.map((t) => <Pill key={t} tono="bad">{m.nombreTipo(t)}</Pill>)}
            {!faltan.length && <Pill tono="ok">Dotación completa</Pill>}
          </div>
        </div>
      )}

      {admin && vigente && <AsignarDisponibles m={m} u={u} faltan={faltan} ejecutar={ejecutar} pendiente={pendiente} />}
    </div>
  );
}

type Ejecutar = ReturnType<typeof useAccion>['ejecutar'];

function AsignarDisponibles({ m, u, faltan, ejecutar, pendiente }: { m: Modelo; u: Usuario; faltan: number[]; ejecutar: Ejecutar; pendiente: boolean }) {
  const [tipo, setTipo] = useState('');
  const todos = m.activos.filter((a) => a.estado === 'disponible' && (!tipo || String(m.tipoDeActivo(a)) === tipo));
  const ok = todos.filter((a) => m.puedeRecibir(u, a));
  const ocultos = todos.length - ok.length;
  const filas = ok
    .map((a) => ({ a, falta: faltan.includes(m.tipoDeActivo(a)) }))
    .sort((x, y) => Number(y.falta) - Number(x.falta) || m.nombreTipo(m.tipoDeActivo(x.a)).localeCompare(m.nombreTipo(m.tipoDeActivo(y.a))));

  return (
    <div className="col separador" style={{ gap: 10 }}>
      <div className="fila" style={{ justifyContent: 'space-between', gap: 8 }}>
        <span className="subtitulo">Asignar equipo disponible ({filas.length})</span>
        <select className="in" aria-label="Filtrar disponibles por tipo" style={{ width: 150, height: 36 }} value={tipo} onChange={(e) => setTipo(e.target.value)}>
          <option value="">Todos los tipos</option>
          {m.tipos.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
        </select>
      </div>
      {ocultos > 0 && (
        <span style={{ fontSize: 12, color: 'var(--texto-2)' }}>
          {ocultos} {ocultos === 1 ? 'equipo disponible no se muestra' : 'equipos disponibles no se muestran'} porque el cargo no los permite.
        </span>
      )}
      <div className="lista-scroll">
        {filas.map(({ a, falta }) => {
          const art = m.idx.articulo.get(a.articuloId);
          return (
            <div key={a.id} className="item">
              <div className="col" style={{ gap: 2 }}>
                <div className="fila" style={{ gap: 6 }}>
                  <span style={{ fontWeight: 600 }}>{m.nombreTipo(m.tipoDeActivo(a))} · {art?.marca} {art?.modelo}</span>
                  {falta && <Pill tono="bad" small>Le falta</Pill>}
                </div>
                <span style={{ fontSize: 11 }} className="tenue mono">S/N {a.serial}</span>
              </div>
              <button type="button" className="btn btn-primario btn-sm" style={{ height: 34, padding: '0 14px' }} disabled={pendiente}
                onClick={() => ejecutar(() => api.asignarActivo(a.id, u.id), `Equipo ${a.serial} asignado.`)}>
                Asignar
              </button>
            </div>
          );
        })}
        {!filas.length && (
          <p className="tenue" style={{ padding: 10, fontSize: 12 }}>
            No hay equipos disponibles permitidos para este cargo. Regístrelos en Activos o revise el perfil del cargo.
          </p>
        )}
      </div>
    </div>
  );
}

function FormVacaciones({ m, u, onListo, ejecutar, setMsg, pendiente }: {
  m: Modelo; u: Usuario; onListo: () => void; ejecutar: Ejecutar; setMsg: ReturnType<typeof useAccion>['setMsg']; pendiente: boolean;
}) {
  const [f, setF] = useState({ desde: '', hasta: '', accion: '' as '' | AccionVacacion, suplenteId: '', nota: '' });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const suplentes = m.usuarios.filter((x) => x.id !== u.id && x.estado === 'activo');

  const guardar = async () => {
    if (!f.desde || !f.hasta || !f.accion) return setMsg({ texto: 'Indique fechas y qué pasa con los equipos.', error: true });
    if (f.hasta < f.desde) return setMsg({ texto: 'La fecha «hasta» no puede ser anterior a «desde».', error: true });
    if (f.accion === 'prestamo' && !f.suplenteId) return setMsg({ texto: 'Seleccione el suplente que recibe los equipos.', error: true });
    const r = await ejecutar(() => api.registrarVacaciones(u.id, {
      desde: f.desde, hasta: f.hasta, accion: f.accion as AccionVacacion,
      suplenteId: f.accion === 'prestamo' ? Number(f.suplenteId) : null, nota: f.nota || null,
    }), 'Vacaciones registradas.');
    if (r) onListo();
  };

  return (
    <div className="panel">
      <span style={{ fontWeight: 700 }}>Registrar vacaciones</span>
      <div className="grid-2">
        <Campo label="Desde *"><input className="in" type="date" value={f.desde} onChange={set('desde')} /></Campo>
        <Campo label="Hasta *"><input className="in" type="date" value={f.hasta} min={f.desde || undefined} onChange={set('hasta')} /></Campo>
      </div>
      <Campo label="¿Qué pasa con sus equipos? *">
        <select className="in" value={f.accion} onChange={set('accion')}>
          <option value="">Seleccione…</option>
          {(Object.keys(ACCION_VACACION) as AccionVacacion[]).map((k) => <option key={k} value={k}>{ACCION_VACACION[k]}</option>)}
        </select>
      </Campo>
      {f.accion === 'prestamo' && (
        <Campo label="Suplente que recibe los equipos *">
          <select className="in" value={f.suplenteId} onChange={set('suplenteId')}>
            <option value="">Seleccione…</option>
            {suplentes.map((s) => <option key={s.id} value={s.id}>{s.nombre} · {m.deptoDe(s)?.nombre ?? '—'}</option>)}
          </select>
        </Campo>
      )}
      <Campo label="Observación"><input className="in" value={f.nota} onChange={set('nota')} placeholder="Opcional" /></Campo>
      <div className="fila" style={{ gap: 8 }}>
        <button type="button" className="btn btn-primario" onClick={guardar} disabled={pendiente}>Guardar</button>
        <button type="button" className="btn" onClick={onListo}>Cancelar</button>
      </div>
    </div>
  );
}

function EditarUsuario({ m, u, onListo, ejecutar, pendiente }: { m: Modelo; u: Usuario; onListo: () => void; ejecutar: Ejecutar; pendiente: boolean }) {
  const [f, setF] = useState({
    codigo: u.codigo, nombre: u.nombre, correo: u.correo ?? '',
    cargoId: u.cargoId ? String(u.cargoId) : '', departamentoId: u.departamentoId ? String(u.departamentoId) : '',
  });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const nuevoCargo = f.cargoId ? m.idx.cargo.get(Number(f.cargoId)) : undefined;
  const quedanFuera = nuevoCargo && nuevoCargo.id !== u.cargoId
    ? m.tenenciaDe(u.id).filter((a) => !m.puedeRecibir({ ...u, cargoId: nuevoCargo.id }, a)).length
    : 0;

  const guardar = async () => {
    const r = await ejecutar(() => api.editarUsuario(u.id, {
      codigo: f.codigo, nombre: f.nombre, correo: f.correo || null,
      ...(f.cargoId ? { cargoId: Number(f.cargoId) } : {}),
      ...(f.departamentoId ? { departamentoId: Number(f.departamentoId) } : {}),
    }), 'Datos del usuario actualizados.');
    if (r) onListo();
  };

  return (
    <div className="panel">
      <span style={{ fontWeight: 700 }}>Editar usuario</span>
      <div className="grid-2">
        <Campo label="Código / cédula *"><input className="in" value={f.codigo} onChange={set('codigo')} /></Campo>
        <Campo label="Nombre completo *"><input className="in" value={f.nombre} onChange={set('nombre')} /></Campo>
      </div>
      <Campo label="Correo"><input className="in" type="email" value={f.correo} onChange={set('correo')} /></Campo>
      <div className="grid-2">
        <Campo label="Cargo *">
          <select className="in" value={f.cargoId} onChange={set('cargoId')}>
            <option value="">Seleccione…</option>
            {m.cargos.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </Campo>
        <Campo label="Departamento *">
          <select className="in" value={f.departamentoId} onChange={set('departamentoId')}>
            <option value="">Seleccione…</option>
            {m.departamentos.map((d) => <option key={d.id} value={d.id}>{d.nombre} · {m.idx.silo.get(d.siloId)?.nombre ?? ''}</option>)}
          </select>
        </Campo>
      </div>
      {quedanFuera > 0 && (
        <span style={{ fontSize: 12, color: 'var(--pur)', fontWeight: 600 }}>
          Con el nuevo cargo, {quedanFuera} equipo(s) quedarán «fuera de perfil». No se liberan automáticamente.
        </span>
      )}
      <div className="fila" style={{ gap: 8 }}>
        <button type="button" className="btn btn-primario" onClick={guardar} disabled={pendiente}>Guardar cambios</button>
        <button type="button" className="btn" onClick={onListo}>Cancelar</button>
      </div>
    </div>
  );
}
