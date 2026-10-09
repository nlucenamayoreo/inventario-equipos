import { useState } from 'react';
import type { AccionVacacion, Activo, Id, Usuario } from '../../../shared/api/types';
import type { Modelo } from '../../../shared/domain/modelo';
import { useAccion } from '../../../shared/state/datos';
import { usuariosApi } from '../api/usuarios-api';

export type Panel =
  | null
  | 'editar'
  | 'vacaciones'
  | 'desactivar'
  | 'eliminar'
  | 'liberar'
  | 'reasignar';

export interface FormVacaciones {
  desde: string;
  hasta: string;
  accion: '' | AccionVacacion;
  suplenteId: string;
  nota: string;
}

export interface FormEdicion {
  codigo: string;
  nombre: string;
  correo: string;
  cargoId: string;
  departamentoId: string;
}

/** Estado y acciones de la ficha de un colaborador. */
export function useFichaController(m: Modelo, u: Usuario, onEliminado: () => void) {
  const accion = useAccion();
  const { ejecutar, setMsg } = accion;
  const [panel, setPanel] = useState<Panel>(null);
  /** Equipo sobre el que se abrió «liberar» o «reasignar». */
  const [activoSel, setActivoSel] = useState<Activo | null>(null);
  /** Responsable del resguardo de los equipos que dejan de estar en manos del colaborador. */
  const [custodio, setCustodio] = useState<Id | null>(null);
  const abrir = (p: Panel, a: Activo | null = null) => {
    setPanel(panel === p && activoSel?.id === a?.id ? null : p);
    setActivoSel(a);
    setMsg(null);
  };
  const aCargoDe = () => (custodio != null ? m.nombreOperador(custodio) : 'usted');
  const cerrarSi = (ok: unknown) => {
    if (ok) setPanel(null);
  };

  const mios = m.activos.filter((a) => a.usuarioId === u.id);
  const datos = {
    mios,
    pendientes: mios.filter((a) => a.estado === 'pendiente_recuperacion'),
    prestados: m.prestadosA(u.id),
    enUso: m.tenenciaDe(u.id),
    faltan: m.faltantesDe(u),
    vigente: u.estado === 'activo' || u.estado === 'vacaciones',
  };

  return {
    ...accion,
    ...datos,
    panel,
    abrir,
    activoSel,
    custodio,
    setCustodio,
    cerrar: () => setPanel(null),
    liberar: async (a: Activo) =>
      cerrarSi(
        await ejecutar(
          () => usuariosApi.liberarEquipo(a.id, custodio),
          `Equipo ${a.serial} ${
            a.estado === 'pendiente_recuperacion' ? 'recibido' : 'liberado'
          }; quedó disponible a cargo de ${aCargoDe()}.`,
        ),
      ),
    asignar: (a: Activo) =>
      ejecutar(() => usuariosApi.asignarEquipo(a.id, u.id), `Equipo ${a.serial} asignado.`),
    finalizarVacaciones: () =>
      ejecutar(
        () => usuariosApi.finalizarVacaciones(u.id),
        'Vacaciones finalizadas; los equipos vuelven a estar asignados al usuario.',
      ),
    reactivar: () =>
      ejecutar(
        () => usuariosApi.reactivar(u.id),
        'Usuario reactivado. Los equipos pendientes siguen así hasta que TI decida.',
      ),
    desactivar: async () =>
      cerrarSi(
        await ejecutar(
          () => usuariosApi.desactivar(u.id, custodio),
          'Usuario desactivado; sus equipos quedaron pendientes de recuperación.',
        ),
      ),
    eliminar: async () => {
      if (
        await ejecutar(
          () => usuariosApi.eliminar(u.id, custodio),
          `Usuario ${u.nombre} eliminado; sus equipos quedaron disponibles a cargo de ${aCargoDe()}.`,
        )
      )
        onEliminado();
    },
    guardarVacaciones: async (f: FormVacaciones) => {
      if (!f.desde || !f.hasta || !f.accion)
        return setMsg({ texto: 'Indique fechas y qué pasa con los equipos.', error: true });
      if (f.hasta < f.desde)
        return setMsg({ texto: 'La fecha «hasta» no puede ser anterior a «desde».', error: true });
      if (f.accion === 'prestamo' && !f.suplenteId)
        return setMsg({ texto: 'Seleccione el suplente que recibe los equipos.', error: true });
      const datosVac = {
        desde: f.desde,
        hasta: f.hasta,
        accion: f.accion,
        nota: f.nota || null,
        suplenteId: f.accion === 'prestamo' ? Number(f.suplenteId) : null,
        custodioId: f.accion === 'resguardo' ? custodio : null,
      };
      cerrarSi(
        await ejecutar(
          () => usuariosApi.registrarVacaciones(u.id, datosVac),
          'Vacaciones registradas.',
        ),
      );
    },
    guardarEdicion: async (f: FormEdicion) => {
      const cambios = {
        codigo: f.codigo,
        nombre: f.nombre,
        correo: f.correo || null,
        ...(f.cargoId ? { cargoId: Number(f.cargoId) } : {}),
        ...(f.departamentoId ? { departamentoId: Number(f.departamentoId) } : {}),
      };
      cerrarSi(
        await ejecutar(() => usuariosApi.editar(u.id, cambios), 'Datos del usuario actualizados.'),
      );
    },
  };
}

export type FichaController = ReturnType<typeof useFichaController>;
