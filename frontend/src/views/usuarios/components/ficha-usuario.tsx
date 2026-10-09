import type { Usuario } from '../../../shared/api/types';
import {
  Aviso,
  fmtFecha,
  fmtFechaHora,
  Pill,
  PillEstadoUsuario,
} from '../../../shared/components/ui';
import type { Modelo } from '../../../shared/domain/modelo';
import { usePermisos } from '../../../shared/state/datos';
import { SolicitarReasignacion } from '../../reasignaciones/components/solicitar-reasignacion';
import { useFichaController } from '../hooks/use-ficha-controller';
import { AsignarDisponibles } from './asignar-disponibles';
import { ConfirmarLiberar } from './confirmar-liberar';
import { ConfirmarRetiro } from './confirmar-retiro';
import { EditarUsuario } from './editar-usuario';
import { FichaEquipos } from './ficha-equipos';
import { FormVacaciones } from './form-vacaciones';

export function FichaUsuario({
  m,
  u,
  onEliminado,
}: {
  m: Modelo;
  u: Usuario;
  onEliminado: () => void;
}) {
  const puede = usePermisos();
  const admin = puede('usuarios.gestionar');
  const asignar = puede('activos.asignar');
  const c = useFichaController(m, u, onEliminado);
  const depto = m.deptoDe(u);
  const silo = depto ? m.idx.silo.get(depto.siloId) : undefined;
  const vac = u.vacacion;

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
        <span className="dato">
          {u.codigo} · {m.cargoDe(u)?.nombre ?? 'Sin cargo'}
        </span>
        <span className="dato">
          {depto?.nombre ?? 'Sin departamento'} · {silo?.nombre ?? '—'}
        </span>
        <span className="dato">{u.correo || 'Sin correo'}</span>
      </div>

      {u.estado === 'vacaciones' && vac && (
        <div className="banner banner-mid">
          <span style={{ fontWeight: 700 }}>
            De vacaciones: {fmtFecha(vac.desde)} al {fmtFecha(vac.hasta)}
          </span>
          <span style={{ fontSize: 12 }}>
            Equipos:{' '}
            {vac.accion === 'prestamo'
              ? `en préstamo a ${m.nombreUsuario(vac.suplenteId)}`
              : vac.accion === 'resguardo'
                ? 'entregados a TI en resguardo'
                : 'conserva sus equipos'}
            {vac.nota ? ` · ${vac.nota}` : ''}
          </span>
        </div>
      )}
      {u.estado === 'desactivado' && (
        <div className="banner banner-bad">
          <span style={{ fontWeight: 700 }}>
            Desactivado {u.fuenteDesactivacion === 'google' ? 'en Google Workspace' : 'manualmente'}{' '}
            · {fmtFechaHora(u.desactivadoEn)}
          </span>
          <span style={{ fontSize: 12 }}>
            {c.pendientes.length
              ? `${c.pendientes.length} equipo(s) pendiente(s) de recuperación. Al recibirlos use «Recibir».`
              : 'Sin equipos pendientes de recuperación.'}
          </span>
        </div>
      )}

      {admin && (
        <div className="fila" style={{ gap: 8 }}>
          {u.estado === 'activo' && (
            <button
              type="button"
              className="btn"
              style={{ fontWeight: 600 }}
              onClick={() => c.abrir('vacaciones')}
            >
              Registrar vacaciones
            </button>
          )}
          {u.estado === 'vacaciones' && (
            <button
              type="button"
              className="btn btn-ok"
              disabled={c.pendiente}
              onClick={c.finalizarVacaciones}
            >
              Finalizar vacaciones
            </button>
          )}
          <button type="button" className="btn" onClick={() => c.abrir('editar')}>
            Editar
          </button>
          {c.vigente && (
            <button type="button" className="btn" onClick={() => c.abrir('desactivar')}>
              Desactivar
            </button>
          )}
          {u.estado === 'desactivado' && (
            <button
              type="button"
              className="btn btn-ok"
              disabled={c.pendiente}
              onClick={c.reactivar}
            >
              Reactivar
            </button>
          )}
          <button
            type="button"
            className="btn btn-borde-peligro"
            onClick={() => c.abrir('eliminar')}
          >
            Eliminar usuario
          </button>
        </div>
      )}
      <Aviso msg={c.msg} />

      {c.panel === 'editar' && <EditarUsuario m={m} u={u} c={c} />}
      {c.panel === 'vacaciones' && <FormVacaciones m={m} u={u} c={c} />}
      {(c.panel === 'desactivar' || c.panel === 'eliminar') && (
        <ConfirmarRetiro m={m} u={u} c={c} tipo={c.panel} />
      )}
      {c.panel === 'liberar' && c.activoSel && <ConfirmarLiberar m={m} a={c.activoSel} c={c} />}
      {c.panel === 'reasignar' && c.activoSel && (
        <div className="panel">
          <span style={{ fontWeight: 700 }}>
            Solicitar reasignación · S/N <span className="mono">{c.activoSel.serial}</span>
          </span>
          <SolicitarReasignacion m={m} activoId={c.activoSel.id} onListo={c.cerrar} />
        </div>
      )}

      <FichaEquipos
        m={m}
        u={u}
        c={c}
        puede={{ asignar, reasignar: puede('reasignaciones.solicitar') }}
      />
      {asignar && c.vigente && <AsignarDisponibles m={m} u={u} c={c} />}
    </div>
  );
}
