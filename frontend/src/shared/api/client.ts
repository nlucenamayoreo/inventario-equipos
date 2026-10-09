import type {
  Activo,
  Articulo,
  Cargo,
  Departamento,
  EdicionUsuario,
  EstadoActivo,
  Id,
  Movimiento,
  NivelDotacion,
  NuevaVacacion,
  NuevoActivo,
  NuevoArticulo,
  NuevoUsuario,
  ResultadoBaja,
  Sesion,
  Silo,
  SyncGoogleEstado,
  TipoEquipo,
  Usuario,
} from './types';

/** Opciones de lectura: `signal` de un AbortController para cancelar la petición. */
export interface Opts {
  signal?: AbortSignal;
}

export type EstadoSinTitular = Extract<EstadoActivo, 'disponible' | 'en_reparacion' | 'de_baja'>;

/**
 * Contrato que implementan el cliente HTTP (API Gateway) y el simulador del modo demostración.
 * Cada método corresponde a un endpoint de docs/API.md.
 */
export interface ApiClient {
  sesion(opts?: Opts): Promise<Sesion>;
  syncGoogleEstado(opts?: Opts): Promise<SyncGoogleEstado>;

  silos(opts?: Opts): Promise<Silo[]>;
  crearSilo(nombre: string): Promise<Silo>;
  departamentos(opts?: Opts): Promise<Departamento[]>;
  crearDepartamento(nombre: string, siloId: Id): Promise<Departamento>;
  tiposEquipo(opts?: Opts): Promise<TipoEquipo[]>;
  crearTipoEquipo(nombre: string): Promise<TipoEquipo>;
  articulos(opts?: Opts): Promise<Articulo[]>;
  crearArticulo(datos: NuevoArticulo): Promise<Articulo>;
  cargos(opts?: Opts): Promise<Cargo[]>;
  crearCargo(nombre: string): Promise<Cargo>;
  actualizarDotacion(
    cargoId: Id,
    tipoId: Id,
    nivel: NivelDotacion,
    articuloRestringidoId: Id | null,
  ): Promise<Cargo>;

  usuarios(opts?: Opts): Promise<Usuario[]>;
  crearUsuario(datos: NuevoUsuario): Promise<Usuario>;
  editarUsuario(id: Id, datos: EdicionUsuario): Promise<Usuario>;
  eliminarUsuario(id: Id): Promise<ResultadoBaja>;
  registrarVacaciones(id: Id, datos: NuevaVacacion): Promise<Usuario>;
  finalizarVacaciones(id: Id): Promise<Usuario>;
  desactivarUsuario(id: Id): Promise<Usuario>;
  reactivarUsuario(id: Id): Promise<Usuario>;

  activos(opts?: Opts): Promise<Activo[]>;
  crearActivo(datos: NuevoActivo): Promise<Activo>;
  asignarActivo(id: Id, usuarioId: Id): Promise<Activo>;
  liberarActivo(id: Id): Promise<Activo>;
  cambiarEstadoActivo(id: Id, estado: EstadoSinTitular): Promise<Activo>;
  movimientos(activoId: Id, opts?: Opts): Promise<Movimiento[]>;
}
