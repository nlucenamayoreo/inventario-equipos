import { axiosApiGateway } from './axios-api-gateway';
import type { ApiClient, Opts } from './client';

const get = async <T>(path: string, opts?: Opts, params?: Record<string, unknown>): Promise<T> =>
  (await axiosApiGateway.get<T>(path, { signal: opts?.signal, params })).data;
const send = async <T>(
  method: 'post' | 'put' | 'patch' | 'delete',
  path: string,
  body: unknown = {},
  params?: Record<string, unknown>,
): Promise<T> =>
  (
    await axiosApiGateway.request<T>({
      method,
      url: path,
      params,
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
  editarTipoEquipo: (id, datos) => send('patch', `/tipos-equipo/${id}`, datos),
  marcas: (o) => get('/marcas', o),
  crearMarca: (nombre) => send('post', '/marcas', { nombre }),
  editarMarca: (id, datos) => send('patch', `/marcas/${id}`, datos),
  modelos: (o) => get('/modelos', o),
  crearModelo: (datos) => send('post', '/modelos', datos),
  editarModelo: (id, datos) => send('patch', `/modelos/${id}`, datos),
  caracteristicas: (o) => get('/caracteristicas', o),
  crearCaracteristica: (datos) => send('post', '/caracteristicas', datos),
  editarCaracteristica: (id, datos) => send('patch', `/caracteristicas/${id}`, datos),
  articulos: (o) => get('/articulos', o),
  crearArticulo: (datos) => send('post', '/articulos', datos),
  cargos: (o) => get('/cargos', o),
  crearCargo: (nombre) => send('post', '/cargos', { nombre }),
  actualizarDotacion: (cargoId, tipoId, nivel, articuloRestringidoId) =>
    send('put', `/cargos/${cargoId}/dotacion/${tipoId}`, { nivel, articuloRestringidoId }),

  usuarios: (o) => get('/usuarios', o),
  crearUsuario: (datos) => send('post', '/usuarios', datos),
  editarUsuario: (id, datos) => send('patch', `/usuarios/${id}`, datos),
  eliminarUsuario: (id, custodioId) =>
    send('delete', `/usuarios/${id}`, undefined, custodioId ? { custodioId } : undefined),
  registrarVacaciones: (id, datos) => send('post', `/usuarios/${id}/vacaciones`, datos),
  finalizarVacaciones: (id) => send('post', `/usuarios/${id}/vacaciones/finalizar`),
  desactivarUsuario: (id, custodioId) => send('post', `/usuarios/${id}/desactivar`, { custodioId }),
  reactivarUsuario: (id) => send('post', `/usuarios/${id}/reactivar`),

  activos: (o) => get('/activos', o),
  crearActivo: (datos) => send('post', '/activos', datos),
  asignarActivo: (id, usuarioId) => send('post', `/activos/${id}/asignar`, { usuarioId }),
  liberarActivo: (id, custodioId) => send('post', `/activos/${id}/liberar`, { custodioId }),
  cambiarEstadoActivo: (id, estado, custodioId) =>
    send('post', `/activos/${id}/estado`, { estado, custodioId }),
  movimientos: (activoId, o) => get(`/activos/${activoId}/movimientos`, o),

  permisos: (o) => get('/permisos', o),
  roles: (o) => get('/roles', o),
  crearRol: (datos) => send('post', '/roles', datos),
  editarRol: (id, datos) => send('patch', `/roles/${id}`, datos),
  operadores: (o) => get('/operadores', o),
  invitarOperador: (datos) => send('post', '/operadores', datos),
  editarOperador: (id, datos) => send('patch', `/operadores/${id}`, datos),

  reasignaciones: (estado, o) => get('/reasignaciones', o, estado ? { estado } : undefined),
  solicitarReasignacion: (datos) => send('post', '/reasignaciones', datos),
  aprobarReasignacion: (id, comentario) =>
    send('post', `/reasignaciones/${id}/aprobar`, { comentario }),
  rechazarReasignacion: (id, comentario) =>
    send('post', `/reasignaciones/${id}/rechazar`, { comentario }),
  cancelarReasignacion: (id) => send('post', `/reasignaciones/${id}/cancelar`),

  importarUsuarios: (filas, confirmar) =>
    send('post', '/importaciones/usuarios', { filas, confirmar }),
  importarActivos: (filas, confirmar) => send('post', '/importaciones/activos', { filas, confirmar }),
};
