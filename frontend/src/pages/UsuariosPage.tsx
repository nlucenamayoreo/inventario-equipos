import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import type { EstadoUsuario } from '../api/types';
import { DotacionChips } from '../components/DotacionChips';
import { FichaUsuario } from '../components/FichaUsuario';
import { FiltrosBar } from '../components/FiltrosBar';
import { Aviso, Campo, ESTADO_USUARIO, PillEstadoUsuario, Seccion, Tabla } from '../components/ui';
import type { Modelo } from '../domain/modelo';
import { useAccion } from '../state/datos';
import { coincide, useFiltros } from '../state/filtros';
import { useEsAdmin } from '../state/sesion';

export function UsuariosPage({ m }: { m: Modelo }) {
  const { id } = useParams();
  const nav = useNavigate();
  const f = useFiltros();
  const admin = useEsAdmin();
  const [fEstado, setFEstado] = useState<'' | EstadoUsuario>('');
  const sel = id ? m.idx.usuario.get(Number(id)) : undefined;

  const filas = m.usuarios.filter((u) => coincide(m, f, u) && (!fEstado || u.estado === fEstado));

  return (
    <div className="dos-col">
      <div className="principal">
        {admin && <CrearUsuario m={m} onCreado={(uid) => nav(`/usuarios/${uid}`)} />}

        <Seccion
          titulo={`Usuarios (${filas.length})`}
          extra={
            <div className="fila" style={{ gap: 8 }}>
              <FiltrosBar m={m} compacto />
              <select className="in" aria-label="Filtrar por estado" style={{ width: 150 }} value={fEstado} onChange={(e) => setFEstado(e.target.value as EstadoUsuario | '')}>
                <option value="">Todos los estados</option>
                {(['activo', 'vacaciones', 'desactivado'] as const).map((e) => <option key={e} value={e}>{ESTADO_USUARIO[e].txt}</option>)}
              </select>
            </div>
          }
        >
          <Tabla>
            <thead>
              <tr><th>Código</th><th>Nombre</th><th>Cargo</th><th>Estado</th><th>Departamento</th><th>Silo</th><th>Equipos</th><th>Le falta</th><th><span className="sr-only">Acciones</span></th></tr>
            </thead>
            <tbody>
              {filas.map((u) => {
                const falt = u.estado === 'desactivado' ? [] : m.faltantesDe(u);
                const siloId = m.siloIdDe(u);
                return (
                  <tr key={u.id} className={sel?.id === u.id ? 'sel' : undefined}>
                    <td>{u.codigo}</td>
                    <td style={{ fontWeight: 600 }}>{u.nombre}</td>
                    <td>{m.cargoDe(u)?.nombre ?? 'Sin cargo'}</td>
                    <td><PillEstadoUsuario estado={u.estado} /></td>
                    <td>{m.deptoDe(u)?.nombre ?? '—'}</td>
                    <td>{siloId != null ? m.idx.silo.get(siloId)?.nombre : '—'}</td>
                    <td>{m.tenenciaDe(u.id).length}</td>
                    <td style={{ fontSize: 12, fontWeight: 600, color: u.estado === 'desactivado' ? 'var(--tenue)' : falt.length ? 'var(--bad)' : 'var(--ok)' }}>
                      {u.estado === 'desactivado' ? '—' : falt.length ? falt.map(m.nombreTipo).join(', ') : 'Completo'}
                    </td>
                    <td>
                      <button type="button" className="btn btn-sm btn-link" aria-label={`Ver ficha de ${u.nombre}`} onClick={() => nav(`/usuarios/${u.id}`)}>Ver</button>
                    </td>
                  </tr>
                );
              })}
              {!filas.length && <tr><td colSpan={9} className="vacio">No hay usuarios que coincidan con el filtro.</td></tr>}
            </tbody>
          </Tabla>
        </Seccion>
      </div>

      <aside aria-label="Ficha del usuario" className="lateral">
        {sel ? (
          <FichaUsuario key={sel.id} m={m} u={sel} onEliminado={() => nav('/usuarios')} />
        ) : (
          <p className="tenue">{id ? 'El usuario no existe o fue eliminado.' : 'Seleccione un usuario para ver y gestionar sus equipos.'}</p>
        )}
      </aside>
    </div>
  );
}

const FORM_VACIO = { codigo: '', nombre: '', correo: '', cargoId: '', departamentoId: '' };

function CrearUsuario({ m, onCreado }: { m: Modelo; onCreado: (id: number) => void }) {
  const [form, setForm] = useState(FORM_VACIO);
  const { ejecutar, msg, setMsg, pendiente } = useAccion();
  const set = (k: keyof typeof FORM_VACIO) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });
  const cargo = form.cargoId ? m.idx.cargo.get(Number(form.cargoId)) : undefined;

  const guardar = async () => {
    if (!form.codigo.trim() || !form.nombre.trim() || !form.cargoId || !form.departamentoId) {
      setMsg({ texto: 'Código, nombre, cargo y departamento son obligatorios.', error: true });
      return;
    }
    const u = await ejecutar(
      () => api.crearUsuario({
        codigo: form.codigo, nombre: form.nombre, correo: form.correo || null,
        cargoId: Number(form.cargoId), departamentoId: Number(form.departamentoId),
      }),
      (r) => `Usuario ${r.nombre} creado con la dotación de su cargo.`,
    );
    if (u) {
      setForm(FORM_VACIO);
      onCreado(u.id);
    }
  };

  return (
    <Seccion titulo="Crear usuario" caja>
      <div className="grid-form">
        <Campo label="Código / cédula *"><input className="in" value={form.codigo} onChange={set('codigo')} placeholder="Ej. U-014" /></Campo>
        <Campo label="Nombre completo *"><input className="in" value={form.nombre} onChange={set('nombre')} /></Campo>
        <Campo label="Correo"><input className="in" type="email" value={form.correo} onChange={set('correo')} placeholder="nombre@empresa.com" /></Campo>
        <Campo label="Cargo *">
          <select className="in" value={form.cargoId} onChange={set('cargoId')}>
            <option value="">Seleccione…</option>
            {m.cargos.filter((c) => c.activo).map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </Campo>
        <Campo label="Departamento *">
          <select className="in" value={form.departamentoId} onChange={set('departamentoId')}>
            <option value="">Seleccione…</option>
            {m.departamentos.filter((d) => d.activo).map((d) => (
              <option key={d.id} value={d.id}>{d.nombre} · {m.idx.silo.get(d.siloId)?.nombre ?? ''}</option>
            ))}
          </select>
        </Campo>
      </div>
      {cargo && (
        <div className="panel" style={{ padding: '10px 12px', gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--texto-2)' }}>Dotación definida para el cargo «{cargo.nombre}»</span>
          <DotacionChips m={m} cargo={cargo} />
        </div>
      )}
      <div className="fila" style={{ gap: 12 }}>
        <button type="button" className="btn btn-primario btn-lg" onClick={guardar} disabled={pendiente}>Guardar usuario</button>
        <Aviso msg={msg} />
      </div>
    </Seccion>
  );
}
