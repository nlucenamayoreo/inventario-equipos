import { config } from '../config';
import { ApiError, type ApiClient } from './client';

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${config.apiUrl}/api${path}`, {
      method,
      credentials: 'include',
      headers: body === undefined ? { Accept: 'application/json' } : { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'No se pudo conectar con el servidor. Verifique su conexión.');
  }
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const err = data?.error;
    const fallback = res.status === 401 ? 'Su sesión expiró. Vuelva a ingresar.'
      : res.status === 403 ? 'No tiene permisos para esta acción.'
      : `Error del servidor (${res.status}).`;
    throw new ApiError(res.status, err?.mensaje || fallback, err?.codigo);
  }
  return data as T;
}

const get = <T,>(p: string) => req<T>('GET', p);
const post = <T,>(p: string, b: unknown = {}) => req<T>('POST', p, b);

export const httpApi: ApiClient = {
  sesion: () => get('/me'),
  syncGoogleEstado: () => get('/sync-google/estado'),

  silos: () => get('/silos'),
  crearSilo: (nombre) => post('/silos', { nombre }),
  departamentos: () => get('/departamentos'),
  crearDepartamento: (nombre, siloId) => post('/departamentos', { nombre, siloId }),
  tiposEquipo: () => get('/tipos-equipo'),
  crearTipoEquipo: (nombre) => post('/tipos-equipo', { nombre }),
  articulos: () => get('/articulos'),
  crearArticulo: (datos) => post('/articulos', datos),
  cargos: () => get('/cargos'),
  crearCargo: (nombre) => post('/cargos', { nombre }),
  actualizarDotacion: (cargoId, tipoId, nivel, articuloRestringidoId) =>
    req('PUT', `/cargos/${cargoId}/dotacion/${tipoId}`, { nivel, articuloRestringidoId }),

  usuarios: () => get('/usuarios'),
  crearUsuario: (datos) => post('/usuarios', datos),
  editarUsuario: (id, datos) => req('PATCH', `/usuarios/${id}`, datos),
  eliminarUsuario: (id) => req('DELETE', `/usuarios/${id}`),
  registrarVacaciones: (id, datos) => post(`/usuarios/${id}/vacaciones`, datos),
  finalizarVacaciones: (id) => post(`/usuarios/${id}/vacaciones/finalizar`),
  desactivarUsuario: (id) => post(`/usuarios/${id}/desactivar`),
  reactivarUsuario: (id) => post(`/usuarios/${id}/reactivar`),

  activos: () => get('/activos'),
  crearActivo: (datos) => post('/activos', datos),
  asignarActivo: (id, usuarioId) => post(`/activos/${id}/asignar`, { usuarioId }),
  liberarActivo: (id) => post(`/activos/${id}/liberar`),
  cambiarEstadoActivo: (id, estado) => post(`/activos/${id}/estado`, { estado }),
  movimientos: (activoId) => get(`/activos/${activoId}/movimientos`),
};
