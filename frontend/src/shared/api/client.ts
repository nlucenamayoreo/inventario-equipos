import type {
  Activo,
  Articulo,
  Caracteristica,
  Cargo,
  Departamento,
  EdicionOperador,
  EdicionRol,
  EdicionUsuario,
  EstadoActivo,
  EstadoReasignacion,
  FilaMachote,
  Id,
  Marca,
  Modelo,
  Movimiento,
  NivelDotacion,
  NuevaReasignacion,
  NuevaVacacion,
  NuevoActivo,
  NuevoArticulo,
  NuevoOperador,
  NuevoRol,
  NuevoUsuario,
  Operador,
  PermisoInfo,
  Reasignacion,
  ResultadoBaja,
  ResultadoImportacion,
  Rol,
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

/** Nombre y estado (activo/inactivo) de un registro de catálogo editable. */
export interface EdicionCatalogo {
  nombre?: string;
  activo?: boolean;
}

/** Contrato REST (docs/API.md). Cada método corresponde a un endpoint. */
export interface ApiClient {
  sesion(opts?: Opts): Promise<Sesion>;
  syncGoogleEstado(opts?: Opts): Promise<SyncGoogleEstado>;

  silos(opts?: Opts): Promise<Silo[]>;
  crearSilo(nombre: string): Promise<Silo>;
  departamentos(opts?: Opts): Promise<Departamento[]>;
  crearDepartamento(nombre: string, siloId: Id): Promise<Departamento>;
  tiposEquipo(opts?: Opts): Promise<TipoEquipo[]>;
  crearTipoEquipo(nombre: string): Promise<TipoEquipo>;
  editarTipoEquipo(id: Id, datos: { nombre?: string; maxPorUsuario?: number }): Promise<TipoEquipo>;
  marcas(opts?: Opts): Promise<Marca[]>;
  crearMarca(nombre: string): Promise<Marca>;
  editarMarca(id: Id, datos: EdicionCatalogo): Promise<Marca>;
  modelos(opts?: Opts): Promise<Modelo[]>;
  crearModelo(datos: { marcaId: Id; tipoId: Id; nombre: string }): Promise<Modelo>;
  editarModelo(id: Id, datos: EdicionCatalogo): Promise<Modelo>;
  caracteristicas(opts?: Opts): Promise<Caracteristica[]>;
  crearCaracteristica(datos: {
    tipoId: Id;
    nombre: string;
    valores: string[];
  }): Promise<Caracteristica>;
  editarCaracteristica(
    id: Id,
    datos: EdicionCatalogo & { valores?: string[] },
  ): Promise<Caracteristica>;
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
  eliminarUsuario(id: Id, custodioId: Id | null): Promise<ResultadoBaja>;
  registrarVacaciones(id: Id, datos: NuevaVacacion): Promise<Usuario>;
  finalizarVacaciones(id: Id): Promise<Usuario>;
  desactivarUsuario(id: Id, custodioId: Id | null): Promise<Usuario>;
  reactivarUsuario(id: Id): Promise<Usuario>;

  activos(opts?: Opts): Promise<Activo[]>;
  crearActivo(datos: NuevoActivo): Promise<Activo>;
  asignarActivo(id: Id, usuarioId: Id): Promise<Activo>;
  liberarActivo(id: Id, custodioId: Id | null): Promise<Activo>;
  cambiarEstadoActivo(id: Id, estado: EstadoSinTitular, custodioId: Id | null): Promise<Activo>;
  movimientos(activoId: Id, opts?: Opts): Promise<Movimiento[]>;

  permisos(opts?: Opts): Promise<PermisoInfo[]>;
  roles(opts?: Opts): Promise<Rol[]>;
  crearRol(datos: NuevoRol): Promise<Rol>;
  editarRol(id: Id, datos: EdicionRol): Promise<Rol>;
  operadores(opts?: Opts): Promise<Operador[]>;
  invitarOperador(datos: NuevoOperador): Promise<Operador>;
  editarOperador(id: Id, datos: EdicionOperador): Promise<Operador>;

  reasignaciones(estado?: EstadoReasignacion, opts?: Opts): Promise<Reasignacion[]>;
  solicitarReasignacion(datos: NuevaReasignacion): Promise<Reasignacion>;
  aprobarReasignacion(id: Id, comentario: string | null): Promise<Reasignacion>;
  rechazarReasignacion(id: Id, comentario: string): Promise<Reasignacion>;
  cancelarReasignacion(id: Id): Promise<Reasignacion>;

  importarUsuarios(filas: FilaMachote[], confirmar: boolean): Promise<ResultadoImportacion>;
  importarActivos(filas: FilaMachote[], confirmar: boolean): Promise<ResultadoImportacion>;
}
