import { useQuery } from '@tanstack/react-query';
import type { Id } from '../../../shared/api/types';
import { K } from '../../../shared/state/datos';
import { activosApi } from '../api/activos-api';

/** Historial de movimientos de un activo (cancelable con `signal`). */
export function useHistorialController(activoId: Id) {
  return useQuery({
    queryKey: [K, 'movimientos', activoId],
    queryFn: ({ signal }) => activosApi.movimientos(activoId, { signal }),
  });
}
