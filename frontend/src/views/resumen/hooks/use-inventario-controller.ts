import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { construirModelo, type Modelo } from '../../../shared/domain/modelo';
import { K } from '../../../shared/state/datos';
import { resumenApi } from '../api/resumen-api';

/** Carga el inventario (cancelable con `signal`) y construye el modelo que usan todas las pantallas. */
export function useInventarioController(): { modelo: Modelo | null; error: Error | null } {
  const q = useQuery({
    queryKey: [K, 'datos'],
    queryFn: ({ signal }) => resumenApi.cargarInventario({ signal }),
  });
  const modelo = useMemo(() => (q.data ? construirModelo(q.data) : null), [q.data]);
  return { modelo, error: q.error };
}
