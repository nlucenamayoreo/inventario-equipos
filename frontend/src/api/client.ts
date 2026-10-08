import type {
  Activo, Articulo, Cargo, Departamento, EdicionUsuario, EstadoActivo, Id, Movimiento, NivelDotacion,
  NuevaVacacion, NuevoActivo, NuevoArticulo, NuevoUsuario, ResultadoBaja, Sesion, Silo, SyncGoogleEstado,
  TipoEquipo, Usuario,
} from './types';

/** Error de negocio o de red con mensaje listo para mostrar al usuario. */
export class ApiError extends Error {
  constructor(public status: number, message: string, public codigo?: string) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Contrato que implementan el cliente HTTP (backend real) y el simulador en memoria.
 * Cada método corresponde a un endpoint de docs/API.md.
 */
export interface ApiClient {
  sesion(): Promise<Sesion>;
  syncGoogleEstado(): Promise<SyncGoogleEstado>;

  silos(): Promise<Silo[]>;
  crearSilo(nombre: string): Promise<Silo>;
  departamentos(): Promise<Departamento[]>;
  crearDepartamento(nombre: string, siloId: Id): Promise<Departamento>;
  tiposEquipo(): Promise<TipoEquipo[]>;
  crearTipoEquipo(nombre: string): Promise<TipoEquipo>;
  articulos(): Promise<Articulo[]>;
  crearArticulo(datos: NuevoArticulo): Promise<Articulo>;
  cargos(): Promise<Cargo[]>;
  crearCargo(nombre: string): Promise<Cargo>;
  actualizarDotacion(cargoId: Id, tipoId: Id, nivel: NivelDotacion, articuloRestringidoId: Id | null): Promise<Cargo>;

  usuarios(): Promise<Usuario[]>;
  crearUsuario(datos: NuevoUsuario): Promise<Usuario>;
  editarUsuario(id: Id, datos: EdicionUsuario): Promise<Usuario>;
  eliminarUsuario(id: Id): Promise<ResultadoBaja>;
  registrarVacaciones(id: Id, datos: NuevaVacacion): Promise<Usuario>;
  finalizarVacaciones(id: Id): Promise<Usuario>;
  desactivarUsuario(id: Id): Promise<Usuario>;
  reactivarUsuario(id: Id): Promise<Usuario>;

  activos(): Promise<Activo[]>;
  crearActivo(datos: NuevoActivo): Promise<Activo>;
  asignarActivo(id: Id, usuarioId: Id): Promise<Activo>;
  liberarActivo(id: Id): Promise<Activo>;
  cambiarEstadoActivo(id: Id, estado: Extract<EstadoActivo, 'disponible' | 'en_reparacion' | 'de_baja'>): Promise<Activo>;
  movimientos(activoId: Id): Promise<Movimiento[]>;
}
