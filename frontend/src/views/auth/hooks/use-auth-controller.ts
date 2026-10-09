import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import { esModoDemo } from '../../../shared/api/backend';
import { authApi } from '../api/auth-api';

export type EstadoAuth = 'cargando' | 'anonimo' | 'autenticado';

/** ¿Hay sesión de Cognito? En modo demostración siempre hay (no hay login). */
export function useAuthController() {
  const qc = useQueryClient();
  const [estado, setEstado] = useState<EstadoAuth>(esModoDemo ? 'autenticado' : 'cargando');

  useEffect(() => {
    if (esModoDemo) return;
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

  return { estado, salir: esModoDemo ? null : salir };
}
