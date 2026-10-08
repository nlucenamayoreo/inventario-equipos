import { useSesion } from './datos';

/** true si el usuario puede modificar (rol admin_ti). */
export function useEsAdmin(): boolean {
  return useSesion().data?.rol === 'admin_ti';
}
