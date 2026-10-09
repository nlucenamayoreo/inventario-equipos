import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { ApiError } from '../api/api-error';
import { backend } from '../api/backend';
import type { Permiso } from '../api/types';

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

/** true si el rol del operador incluye el permiso (el superadministrador los tiene todos). */
export function usePermiso(permiso: Permiso): boolean {
  return usePermisos()(permiso);
}

/** Comprobador de permisos del operador actual, para vistas que consultan varios. */
export function usePermisos(): (permiso: Permiso) => boolean {
  const sesion = useSesion().data;
  return useCallback(
    (permiso: Permiso) =>
      !!sesion?.activo && (sesion.superadmin || sesion.permisos.includes(permiso)),
    [sesion],
  );
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
