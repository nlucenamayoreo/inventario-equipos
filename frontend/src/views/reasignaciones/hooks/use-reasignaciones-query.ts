import { useQuery } from '@tanstack/react-query';
import type { EstadoReasignacion } from '../../../shared/api/types';
import { K } from '../../../shared/state/datos';
import { reasignacionesApi } from '../api/reasignaciones-api';

/** Solicitudes de reasignación por estado (`undefined` = todas). Las pendientes llegan primero. */
export function useReasignaciones(estado?: EstadoReasignacion) {
  return useQuery({
    queryKey: [K, 'reasignaciones', estado ?? 'todas'],
    queryFn: ({ signal }) => reasignacionesApi.listar(estado, { signal }),
  });
}

/** Solicitudes pendientes de aprobación. */
export const usePendientes = () => useReasignaciones('pendiente');
