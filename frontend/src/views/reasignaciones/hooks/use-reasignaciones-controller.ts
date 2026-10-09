import { useState } from 'react';
import type { EstadoReasignacion, Reasignacion } from '../../../shared/api/types';
import { useAccion, usePermisos, useSesion } from '../../../shared/state/datos';
import { reasignacionesApi } from '../api/reasignaciones-api';
import { usePendientes, useReasignaciones } from './use-reasignaciones-query';

export type FiltroEstado = EstadoReasignacion | 'todas';

/** Listado filtrado de solicitudes y sus acciones (aprobar, rechazar, cancelar). */
export function useReasignacionesController() {
  const acc = useAccion();
  const sesion = useSesion().data;
  const puede = usePermisos();
  const [filtro, setFiltro] = useState<FiltroEstado>('pendiente');
  const lista = useReasignaciones(filtro === 'todas' ? undefined : filtro);
  const pendientes = usePendientes();

  const aprobador = puede('reasignaciones.aprobar');
  const esPropia = (r: Reasignacion) =>
    sesion?.operadorId != null && r.solicitadoPor === sesion.operadorId;
  /** Motivo por el que no puede aprobar/rechazar, o null si puede. */
  const bloqueoResolver = (r: Reasignacion): string | null => {
    if (!aprobador) return 'Su rol no permite aprobar reasignaciones.';
    if (esPropia(r) && !sesion?.superadmin) return 'No puede aprobar su propia solicitud';
    return null;
  };
  const puedeCancelar = (r: Reasignacion) => !!sesion?.activo && (esPropia(r) || aprobador);

  const aprobar = (r: Reasignacion, comentario: string) =>
    acc.ejecutar(
      () => reasignacionesApi.aprobar(r.id, comentario.trim() || null),
      'Reasignación aprobada: el equipo quedó asignado a la persona destino.',
    );
  const rechazar = async (r: Reasignacion, comentario: string) => {
    if (!comentario.trim()) {
      acc.setMsg({ texto: 'Indique el motivo del rechazo.', error: true });
      return undefined;
    }
    return acc.ejecutar(
      () => reasignacionesApi.rechazar(r.id, comentario.trim()),
      'Solicitud rechazada.',
    );
  };
  const cancelar = (r: Reasignacion) =>
    acc.ejecutar(() => reasignacionesApi.cancelar(r.id), 'Solicitud cancelada.');

  return {
    acc,
    filtro,
    setFiltro,
    lista,
    numPendientes: pendientes.data?.length ?? 0,
    bloqueoResolver,
    puedeCancelar,
    aprobar,
    rechazar,
    cancelar,
  };
}

export type ReasignacionesController = ReturnType<typeof useReasignacionesController>;
