import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import { api, ApiError } from '../api';
import { construirModelo, type Modelo } from '../domain/modelo';

const K = 'inv';

/** Carga los catálogos, usuarios y activos y construye el modelo derivado. */
export function useInventario(): { modelo: Modelo | null; cargando: boolean; error: Error | null } {
  const qs = useQueries({
    queries: [
      { queryKey: [K, 'silos'], queryFn: api.silos },
      { queryKey: [K, 'departamentos'], queryFn: api.departamentos },
      { queryKey: [K, 'tipos'], queryFn: api.tiposEquipo },
      { queryKey: [K, 'articulos'], queryFn: api.articulos },
      { queryKey: [K, 'cargos'], queryFn: api.cargos },
      { queryKey: [K, 'usuarios'], queryFn: api.usuarios },
      { queryKey: [K, 'activos'], queryFn: api.activos },
    ],
  });
  const [silos, departamentos, tipos, articulos, cargos, usuarios, activos] = qs.map((q) => q.data);
  const listo = qs.every((q) => q.data !== undefined);
  const modelo = useMemo(
    () => (listo ? construirModelo({
      silos: silos!, departamentos: departamentos!, tipos: tipos!, articulos: articulos!,
      cargos: cargos!, usuarios: usuarios!, activos: activos!,
    } as Parameters<typeof construirModelo>[0]) : null),
    [listo, silos, departamentos, tipos, articulos, cargos, usuarios, activos],
  );
  return { modelo, cargando: qs.some((q) => q.isLoading), error: (qs.find((q) => q.error)?.error as Error) ?? null };
}

export function useSesion() {
  return useQuery({ queryKey: ['sesion'], queryFn: api.sesion, retry: false, staleTime: 5 * 60_000 });
}

export function useSyncGoogle() {
  return useQuery({ queryKey: [K, 'sync'], queryFn: api.syncGoogleEstado, refetchInterval: 5 * 60_000 });
}

export interface Mensaje {
  texto: string;
  error: boolean;
}

/**
 * Ejecuta una acción contra la API, refresca el inventario y deja un mensaje
 * de éxito o error listo para mostrar.
 */
export function useAccion() {
  const qc = useQueryClient();
  const [msg, setMsg] = useState<Mensaje | null>(null);
  const [pendiente, setPendiente] = useState(false);

  const ejecutar = useCallback(
    async <T,>(fn: () => Promise<T>, ok?: string | ((r: T) => string)): Promise<T | undefined> => {
      setPendiente(true);
      try {
        const r = await fn();
        await qc.invalidateQueries({ queryKey: [K] });
        setMsg(ok ? { texto: typeof ok === 'function' ? ok(r) : ok, error: false } : null);
        return r;
      } catch (e) {
        setMsg({ texto: e instanceof ApiError ? e.message : 'Ocurrió un error inesperado.', error: true });
        if (e instanceof ApiError && e.status === 409) await qc.invalidateQueries({ queryKey: [K] });
        return undefined;
      } finally {
        setPendiente(false);
      }
    },
    [qc],
  );

  return { ejecutar, msg, setMsg, pendiente };
}
