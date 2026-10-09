import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { ApiError } from '../api/api-error';
import { backend } from '../api/backend';

/** Prefijo de las consultas del inventario: toda mutación lo invalida. */
export const K = 'inv';

export function useSesion() {
  return useQuery({
    queryKey: ['sesion'],
    queryFn: ({ signal }) => backend.sesion({ signal }),
    retry: false,
    staleTime: 5 * 60_000,
  });
}

export function useSyncGoogle() {
  return useQuery({
    queryKey: [K, 'sync'],
    queryFn: ({ signal }) => backend.syncGoogleEstado({ signal }),
    refetchInterval: 5 * 60_000,
  });
}

/** true si el operador puede modificar (rol admin_ti). */
export function useEsAdmin(): boolean {
  return useSesion().data?.rol === 'admin_ti';
}

export interface Mensaje {
  texto: string;
  error: boolean;
}

/**
 * Ejecuta una acción contra la API, refresca el inventario y deja un mensaje de éxito o error
 * listo para mostrar. La usan los controllers de cada módulo.
 */
export function useAccion() {
  const qc = useQueryClient();
  const [msg, setMsg] = useState<Mensaje | null>(null);
  const [pendiente, setPendiente] = useState(false);

  const ejecutar = useCallback(
    async <T>(fn: () => Promise<T>, ok?: string | ((r: T) => string)): Promise<T | undefined> => {
      setPendiente(true);
      try {
        const r = await fn();
        await qc.invalidateQueries({ queryKey: [K] });
        setMsg(ok ? { texto: typeof ok === 'function' ? ok(r) : ok, error: false } : null);
        return r;
      } catch (e) {
        setMsg({
          texto: e instanceof ApiError ? e.message : 'Ocurrió un error inesperado.',
          error: true,
        });
        if (e instanceof ApiError && (e.status === 409 || e.status === 422))
          await qc.invalidateQueries({ queryKey: [K] });
        return undefined;
      } finally {
        setPendiente(false);
      }
    },
    [qc],
  );

  return { ejecutar, msg, setMsg, pendiente };
}

export type Accion = ReturnType<typeof useAccion>;
