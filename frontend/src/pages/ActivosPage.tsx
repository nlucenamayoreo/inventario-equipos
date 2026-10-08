import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import type { Activo, EstadoActivo } from '../api/types';
import { HistorialActivo } from '../components/HistorialActivo';
import { Aviso, Campo, ESTADO_ACTIVO, fmtFecha, Pill, PillEstadoActivo, Seccion, Tabla } from '../components/ui';
import type { Modelo } from '../domain/modelo';
import { cargoPermite, esVigente } from '../domain/reglas';
import { useAccion } from '../state/datos';
import { useEsAdmin } from '../state/sesion';

type EstadoSinTitular = 'disponible' | 'en_reparacion' | 'de_baja';
const ESTADOS_SIN_TITULAR: EstadoSinTitular[] = ['disponible', 'en_reparacion', 'de_baja'];

export function ActivosPage({ m }: { m: Modelo }) {
  const admin = useEsAdmin();
  const [fTipo, setFTipo] = useState('');
  const [fEstado, setFEstado] = useState<'' | EstadoActivo>('');
  const [q, setQ] = useState('');
  const [historial, setHistorial] = useState<Activo | null>(null);
  const lista = useAccion();

  const qq = q.trim().toLowerCase();
  const filas = m.activos
    .filter((a) => {
      const art = m.idx.articulo.get(a.articuloId);
      const hay = `${a.serial} ${art?.marca} ${art?.modelo} ${art?.codigo} ${m.nombreUsuario(a.usuarioId)} ${a.prestadoA ? m.nombreUsuario(a.prestadoA) : ''}`.toLowerCase();
      return (!fTipo || String(art?.tipoId) === fTipo) && (!fEstado || a.estado === fEstado) && (!qq || hay.includes(qq));
    })
    .sort((x, y) => m.nombreTipo(m.tipoDeActivo(x)).localeCompare(m.nombreTipo(m.tipoDeActivo(y))) || x.serial.localeCompare(y.serial));

  const enUso = (a: Activo) => {
    switch (a.estado) {
      case 'asignado': return m.nombreUsuario(a.usuarioId);
      case 'prestamo': return `${m.nombreUsuario(a.prestadoA)} (suplente)`;
      case 'en_resguardo': return 'TI (resguardo)';
      case 'pendiente_recuperacion': return 'Por devolver';
      default: return '—';
    }
  };

  return (
    <div className="col" style={{ gap: 20 }}>
      {admin && <RegistrarActivo m={m} />}

      <Seccion
        titulo={`Activos (${filas.length})`}
        extra={
          <div className="fila" style={{ gap: 8 }}>
            <select className="in" aria-label="Filtrar por tipo" style={{ width: 160 }} value={fTipo} onChange={(e) => setFTipo(e.target.value)}>
              <option value="">Todos los tipos</option>
              {m.tipos.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
            </select>
            <select className="in" aria-label="Filtrar por estado" style={{ width: 200 }} value={fEstado} onChange={(e) => setFEstado(e.target.value as EstadoActivo | '')}>
              <option value="">Todos los estados</option>
              {(Object.keys(ESTADO_ACTIVO) as EstadoActivo[]).map((e) => <option key={e} value={e}>{ESTADO_ACTIVO[e].txt}</option>)}
            </select>
            <input className="in" type="search" aria-label="Buscar activo" placeholder="Serial, marca o usuario" style={{ width: 220 }} value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        }
      >
        <Aviso msg={lista.msg} />
        <Tabla>
          <thead>
            <tr><th>Tipo</th><th>Marca</th><th>Modelo</th><th>Serial</th><th>Estado</th><th>Titular</th><th>En uso por</th><th>Departamento</th><th>Desde</th><th><span className="sr-only">Acciones</span></th></tr>
          </thead>
          <tbody>
            {filas.map((a) => {
              const art = m.idx.articulo.get(a.articuloId);
              const titular = a.usuarioId != null ? m.idx.usuario.get(a.usuarioId) : undefined;
              return (
                <tr key={a.id}>
                  <td style={{ fontWeight: 600 }}>{m.nombreTipo(m.tipoDeActivo(a))}</td>
                  <td>{art?.marca ?? '—'}</td>
                  <td>{art?.modelo ?? '—'}</td>
                  <td className="mono" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{a.serial}</td>
                  <td>
                    <div className="chips" style={{ gap: 4 }}>
                      <PillEstadoActivo estado={a.estado} />
                      {m.fueraDePerfil(a) && <Pill tono="pur" small>Fuera de perfil</Pill>}
                    </div>
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>{titular ? <Link to={`/usuarios/${titular.id}`}>{titular.nombre}</Link> : '—'}</td>
                  <td>{enUso(a)}</td>
                  <td>{titular ? m.deptoDe(titular)?.nombre ?? '—' : '—'}</td>
                  <td>{fmtFecha(a.fechaAsignacion)}</td>
                  <td>
                    <div className="fila" style={{ gap: 6, flexWrap: 'nowrap' }}>
                      {admin && a.usuarioId != null && (
                        <button type="button" className="btn btn-sm btn-txt-peligro" disabled={lista.pendiente}
                          onClick={() => lista.ejecutar(() => api.liberarActivo(a.id), `Equipo ${a.serial} ${a.estado === 'pendiente_recuperacion' ? 'recuperado' : 'liberado'}; quedó disponible.`)}>
                          {a.estado === 'pendiente_recuperacion' ? 'Recibir' : 'Liberar'}
                        </button>
                      )}
                      {admin && a.usuarioId == null && (
                        <select className="in" aria-label={`Cambiar estado de ${a.serial}`} style={{ height: 32, width: 140, fontSize: 12 }} value={a.estado}
                          disabled={lista.pendiente}
                          onChange={(e) => lista.ejecutar(() => api.cambiarEstadoActivo(a.id, e.target.value as EstadoSinTitular), `Equipo ${a.serial}: ${ESTADO_ACTIVO[e.target.value as EstadoActivo].txt.toLowerCase()}.`)}>
                          {ESTADOS_SIN_TITULAR.map((e) => <option key={e} value={e}>{ESTADO_ACTIVO[e].txt}</option>)}
                        </select>
                      )}
                      <button type="button" className="btn btn-sm btn-link" onClick={() => setHistorial(a)}>Historial</button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!filas.length && <tr><td colSpan={10} className="vacio">No hay activos que coincidan con el filtro.</td></tr>}
          </tbody>
        </Tabla>
      </Seccion>

      {historial && <HistorialActivo m={m} activo={historial} onCerrar={() => setHistorial(null)} />}
    </div>
  );
}

const ART_VACIO = { tipoId: '', marca: '', modelo: '', especificaciones: '', vida: '' };
const ACT_VACIO = { articuloId: '', serial: '', estado: 'disponible' as EstadoSinTitular, usuarioId: '' };

function RegistrarActivo({ m }: { m: Modelo }) {
  const [verArt, setVerArt] = useState(false);
  const [art, setArt] = useState(ART_VACIO);
  const [f, setF] = useState(ACT_VACIO);
  const accArt = useAccion();
  const acc = useAccion();

  const articulo = f.articuloId ? m.idx.articulo.get(Number(f.articuloId)) : undefined;
  const destino = f.usuarioId ? m.idx.usuario.get(Number(f.usuarioId)) : undefined;
  const noPermitido = !!(articulo && destino && !cargoPermite(m.cargoDe(destino), articulo));

  const crearArticulo = async () => {
    if (!art.tipoId || !art.marca.trim() || !art.modelo.trim()) return accArt.setMsg({ texto: 'Tipo, marca y modelo son obligatorios.', error: true });
    const vida = art.vida.trim() === '' ? null : Number(art.vida);
    if (vida !== null && (!Number.isInteger(vida) || vida < 0)) return accArt.setMsg({ texto: 'La vida útil debe ser un número entero de meses.', error: true });
    const r = await accArt.ejecutar(() => api.crearArticulo({
      tipoId: Number(art.tipoId), marca: art.marca, modelo: art.modelo, especificaciones: art.especificaciones || null, vidaUtilMeses: vida,
    }));
    if (r) {
      setArt(ART_VACIO);
      setVerArt(false);
      setF({ ...f, articuloId: String(r.id) });
      acc.setMsg({ texto: `Artículo ${r.codigo} creado. Ya puede registrar sus unidades con serial.`, error: false });
    }
  };

  const guardar = async () => {
    if (!f.articuloId || !f.serial.trim()) return acc.setMsg({ texto: 'Artículo y serial son obligatorios.', error: true });
    const r = await acc.ejecutar(() => api.crearActivo({
      articuloId: Number(f.articuloId), serial: f.serial, estado: f.estado, usuarioId: f.usuarioId ? Number(f.usuarioId) : null,
    }), (a) => `Activo ${a.serial} registrado${a.usuarioId ? ` y asignado a ${destino?.nombre}` : ''}.`);
    if (r) setF({ ...ACT_VACIO, articuloId: f.articuloId });
  };

  return (
    <Seccion titulo="Registrar activo" caja
      extra={<button type="button" className="btn btn-borde-acento" onClick={() => { setVerArt(!verArt); accArt.setMsg(null); }}>{verArt ? 'Cerrar nuevo artículo' : '+ Nuevo artículo'}</button>}>
      {verArt && (
        <div className="panel panel-azul">
          <div className="col" style={{ gap: 2 }}>
            <span style={{ fontWeight: 700 }}>Nuevo artículo</span>
            <span style={{ fontSize: 12, color: 'var(--texto-2)' }}>Cree el modelo una sola vez; luego registre cada unidad con su serial.</span>
          </div>
          <div className="grid-form" style={{ gap: 10 }}>
            <Campo label="Tipo de equipo *">
              <select className="in" value={art.tipoId} onChange={(e) => setArt({ ...art, tipoId: e.target.value })}>
                <option value="">Seleccione…</option>
                {m.tipos.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
              </select>
            </Campo>
            <Campo label="Marca *"><input className="in" value={art.marca} onChange={(e) => setArt({ ...art, marca: e.target.value })} /></Campo>
            <Campo label="Modelo *"><input className="in" value={art.modelo} onChange={(e) => setArt({ ...art, modelo: e.target.value })} /></Campo>
            <Campo label="Especificaciones"><input className="in" value={art.especificaciones} onChange={(e) => setArt({ ...art, especificaciones: e.target.value })} placeholder="Ej. i5, 16 GB, 512 GB SSD" /></Campo>
            <Campo label="Vida útil (meses)"><input className="in" type="number" min={0} step={1} value={art.vida} onChange={(e) => setArt({ ...art, vida: e.target.value })} /></Campo>
          </div>
          <div className="fila">
            <button type="button" className="btn btn-primario" onClick={crearArticulo} disabled={accArt.pendiente}>Crear artículo</button>
            <Aviso msg={accArt.msg} />
          </div>
        </div>
      )}

      <div className="grid-form" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))' }}>
        <Campo label="Artículo *" style={{ gridColumn: 'span 2' }}>
          <select className="in" value={f.articuloId} onChange={(e) => setF({ ...f, articuloId: e.target.value })}>
            <option value="">Seleccione…</option>
            {m.articulos.map((a) => <option key={a.id} value={a.id}>{m.nombreTipo(a.tipoId)} · {a.marca} {a.modelo} ({a.codigo})</option>)}
          </select>
        </Campo>
        <Campo label="Serial *"><input className="in" value={f.serial} onChange={(e) => setF({ ...f, serial: e.target.value })} placeholder="Número de serie" /></Campo>
        <Campo label="Estado">
          <select className="in" value={f.usuarioId ? 'asignado' : f.estado} disabled={!!f.usuarioId} onChange={(e) => setF({ ...f, estado: e.target.value as EstadoSinTitular })}>
            {f.usuarioId && <option value="asignado">Asignado</option>}
            {ESTADOS_SIN_TITULAR.map((e) => <option key={e} value={e}>{ESTADO_ACTIVO[e].txt}</option>)}
          </select>
        </Campo>
        <Campo label="Asignar a (opcional)">
          <select className="in" value={f.usuarioId} onChange={(e) => setF({ ...f, usuarioId: e.target.value })}>
            <option value="">Sin asignar</option>
            {m.usuarios.filter(esVigente).map((u) => <option key={u.id} value={u.id}>{u.nombre} ({u.codigo}) · {m.cargoDe(u)?.nombre ?? 'Sin cargo'}</option>)}
          </select>
        </Campo>
      </div>
      {noPermitido && (
        <span className="msg msg-err">El cargo de {destino!.nombre} no permite este artículo. Regístrelo sin asignar o ajuste el perfil del cargo.</span>
      )}
      <div className="fila" style={{ gap: 12 }}>
        <button type="button" className="btn btn-primario btn-lg" onClick={guardar} disabled={acc.pendiente || noPermitido}>Guardar activo</button>
        <Aviso msg={acc.msg} />
      </div>
    </Seccion>
  );
}
