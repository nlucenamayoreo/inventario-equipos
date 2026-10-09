import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import { authApi } from '../api/auth-api';

export type EstadoAuth = 'cargando' | 'anonimo' | 'autenticado';

/** ¿Hay sesión de Cognito? */
export function useAuthController() {
  const qc = useQueryClient();
  const [estado, setEstado] = useState<EstadoAuth>('cargando');

  useEffect(() => {
    const abort = new AbortController();
    const revisar = () =>
      authApi.currentUser().then((u) => {
        if (!abort.signal.aborted) setEstado(u ? 'autenticado' : 'anonimo');
      });
    revisar();
    const quitar = authApi.onChange(() => {
      qc.removeQueries();
      revisar();
    });
    return () => {
      abort.abort();
      quitar();
    };
  }, [qc]);

  const salir = useCallback(async () => {
    await authApi.signOut();
    qc.clear();
    setEstado('anonimo');
  }, [qc]);

  return { estado, salir };
}
