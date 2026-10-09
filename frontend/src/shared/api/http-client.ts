import { axiosApiGateway } from './axios-api-gateway';
import type { ApiClient, Opts } from './client';

const get = async <T>(path: string, opts?: Opts): Promise<T> =>
  (await axiosApiGateway.get<T>(path, { signal: opts?.signal })).data;
const send = async <T>(
  method: 'post' | 'put' | 'patch' | 'delete',
  path: string,
  body: unknown = {},
): Promise<T> =>
  (
    await axiosApiGateway.request<T>({
      method,
      url: path,
      data: method === 'delete' ? undefined : body,
    })
  ).data;

/** Implementación del contrato contra API Gateway (docs/API.md). */
export const httpClient: ApiClient = {
  sesion: (o) => get('/me', o),
  syncGoogleEstado: (o) => get('/sync-google/estado', o),

  silos: (o) => get('/silos', o),
  crearSilo: (nombre) => send('post', '/silos', { nombre }),
  departamentos: (o) => get('/departamentos', o),
  crearDepartamento: (nombre, siloId) => send('post', '/departamentos', { nombre, siloId }),
  tiposEquipo: (o) => get('/tipos-equipo', o),
  crearTipoEquipo: (nombre) => send('post', '/tipos-equipo', { nombre }),
  articulos: (o) => get('/articulos', o),
  crearArticulo: (datos) => send('post', '/articulos', datos),
  cargos: (o) => get('/cargos', o),
  crearCargo: (nombre) => send('post', '/cargos', { nombre }),
  actualizarDotacion: (cargoId, tipoId, nivel, articuloRestringidoId) =>
    send('put', `/cargos/${cargoId}/dotacion/${tipoId}`, { nivel, articuloRestringidoId }),

  usuarios: (o) => get('/usuarios', o),
  crearUsuario: (datos) => send('post', '/usuarios', datos),
  editarUsuario: (id, datos) => send('patch', `/usuarios/${id}`, datos),
  eliminarUsuario: (id) => send('delete', `/usuarios/${id}`),
  registrarVacaciones: (id, datos) => send('post', `/usuarios/${id}/vacaciones`, datos),
  finalizarVacaciones: (id) => send('post', `/usuarios/${id}/vacaciones/finalizar`),
  desactivarUsuario: (id) => send('post', `/usuarios/${id}/desactivar`),
  reactivarUsuario: (id) => send('post', `/usuarios/${id}/reactivar`),

  activos: (o) => get('/activos', o),
  crearActivo: (datos) => send('post', '/activos', datos),
  asignarActivo: (id, usuarioId) => send('post', `/activos/${id}/asignar`, { usuarioId }),
  liberarActivo: (id) => send('post', `/activos/${id}/liberar`),
  cambiarEstadoActivo: (id, estado) => send('post', `/activos/${id}/estado`, { estado }),
  movimientos: (activoId, o) => get(`/activos/${activoId}/movimientos`, o),
};
