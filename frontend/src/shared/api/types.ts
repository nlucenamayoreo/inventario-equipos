// Tipos del contrato REST (JSON en camelCase). Reflejan db/schema.sql.
// El contrato completo está documentado en docs/API.md.

export type Id = number;

export type NivelDotacion = 'obligatorio' | 'permitido' | 'no_permitido';
export type EstadoUsuario = 'activo' | 'vacaciones' | 'desactivado' | 'eliminado';
export type EstadoActivo =
  | 'disponible'
  | 'asignado'
  | 'en_resguardo'
  | 'prestamo'
  | 'pendiente_recuperacion'
  | 'en_reparacion'
  | 'de_baja';
export type AccionVacacion = 'conserva' | 'resguardo' | 'prestamo';
export type EstadoReasignacion = 'pendiente' | 'aprobada' | 'rechazada' | 'cancelada';

/** Códigos de permiso (tbl_permiso). El superadministrador los tiene todos. */
export type Permiso =
  | 'catalogos.gestionar'
  | 'articulos.gestionar'
  | 'usuarios.gestionar'
  | 'activos.registrar'
  | 'activos.asignar'
  | 'reasignaciones.solicitar'
  | 'reasignaciones.aprobar'
  | 'seguridad.gestionar';

export interface Silo {
  id: Id;
  nombre: string;
  activo: boolean;
}

export interface Departamento {
  id: Id;
  siloId: Id;
  nombre: string;
  activo: boolean;
}

export interface TipoEquipo {
  id: Id;
  nombre: string;
  activo: boolean;
  /** Máximo de equipos de este tipo por persona (Laptop 2: la propia y una de resguardo o préstamo). */
  maxPorUsuario: number;
}

export interface Marca {
  id: Id;
  nombre: string;
  activo: boolean;
}

export interface Modelo {
  id: Id;
  marcaId: Id;
  tipoId: Id;
  nombre: string;
  activo: boolean;
}

export interface ValorCaracteristica {
  id: Id;
  valor: string;
  activo: boolean;
}

/** Característica seleccionable de un tipo de equipo (RAM, Disco…) con sus valores. */
export interface Caracteristica {
  id: Id;
  tipoId: Id;
  nombre: string;
  activo: boolean;
  valores: ValorCaracteristica[];
}

export interface CaracteristicaElegida {
  caracteristicaId: Id;
  valorId: Id;
}

export interface Articulo {
  id: Id;
  codigo: string; // ART-001
  tipoId: Id;
  marca: string;
  modelo: string;
  modeloId: Id | null;
  especificaciones: string | null;
  vidaUtilMeses: number | null;
  activo: boolean;
  caracteristicas: CaracteristicaElegida[];
}

/** Una fila por tipo configurado. Tipo ausente = no_permitido. */
export interface DotacionItem {
  tipoId: Id;
  nivel: NivelDotacion;
  articuloRestringidoId: Id | null;
}

export interface Cargo {
  id: Id;
  nombre: string;
  activo: boolean;
  dotacion: DotacionItem[];
}

export interface Vacacion {
  id: Id;
  usuarioId: Id;
  desde: string; // YYYY-MM-DD
  hasta: string;
  accion: AccionVacacion;
  suplenteId: Id | null;
  nota: string | null;
  finalizadaEn: string | null;
}

export interface Usuario {
  id: Id;
  codigo: string;
  nombre: string;
  correo: string | null;
  cargoId: Id | null;
  departamentoId: Id | null;
  estado: EstadoUsuario;
  pendienteClasificar: boolean;
  fuenteDesactivacion: 'google' | 'manual' | null;
  desactivadoEn: string | null;
  /** Vacación abierta (finalizadaEn = null), si la hay. */
  vacacion: Vacacion | null;
}

export interface Activo {
  id: Id;
  articuloId: Id;
  serial: string;
  estado: EstadoActivo;
  usuarioId: Id | null; // titular
  prestadoA: Id | null; // suplente
  fechaAsignacion: string | null; // YYYY-MM-DD
  /** Persona con acceso responsable del resguardo (disponible, en resguardo, en reparación). */
  custodioId: Id | null;
}

export interface Movimiento {
  id: Id;
  activoId: Id;
  estadoAnterior: EstadoActivo | null;
  estadoNuevo: EstadoActivo;
  usuarioAnterior: Id | null;
  usuarioNuevo: Id | null;
  /** Nombres resueltos por el servidor (incluye usuarios eliminados). */
  usuarioAnteriorNombre: string | null;
  usuarioNuevoNombre: string | null;
  custodioAnterior: Id | null;
  custodioNuevo: Id | null;
  custodioAnteriorNombre: string | null;
  custodioNuevoNombre: string | null;
  motivo: string | null;
  realizadoPor: string;
  realizadoEn: string; // ISO
}

export interface SyncGoogleEstado {
  ultimaExitosa: string | null;
  ultimaCorrida: {
    iniciadoEn: string;
    finalizadoEn: string | null;
    exitoso: boolean | null;
    leidos: number | null;
    desactivados: number | null;
    reactivados: number | null;
    creados: number | null;
  } | null;
}

export interface Sesion {
  correo: string;
  nombre: string;
  /** Nombre del rol ("Visitante" si la cuenta no es una persona con acceso). */
  rol: string;
  operadorId: Id | null;
  superadmin: boolean;
  activo: boolean;
  permisos: Permiso[];
}

export interface PermisoInfo {
  codigo: Permiso;
  modulo: string;
  descripcion: string;
}

export interface Rol {
  id: Id;
  nombre: string;
  descripcion: string | null;
  esSistema: boolean;
  activo: boolean;
  permisos: Permiso[];
}

/** Persona con acceso a la aplicación (puede ser responsable de resguardo). */
export interface Operador {
  id: Id;
  correo: string;
  nombre: string;
  rolId: Id;
  rolNombre: string | null;
  activo: boolean;
  creadoEn: string | null;
}

export interface Reasignacion {
  id: Id;
  activoId: Id;
  usuarioOrigen: Id;
  usuarioDestino: Id;
  motivo: string;
  estado: EstadoReasignacion;
  solicitadoPor: Id;
  solicitadoPorNombre: string | null;
  solicitadoEn: string;
  resueltoPor: Id | null;
  resueltoPorNombre: string | null;
  resueltoEn: string | null;
  comentario: string | null;
}

export interface FilaImportacion {
  fila: number;
  ok: boolean;
  detalle: string;
}

export interface ResultadoImportacion {
  filas: FilaImportacion[];
  errores: number;
  validas: number;
  aplicado: boolean;
}

// ---------- Cuerpos de petición ----------

export interface NuevoUsuario {
  codigo: string;
  nombre: string;
  correo: string | null;
  cargoId: Id;
  departamentoId: Id;
}

export type EdicionUsuario = Partial<NuevoUsuario>;

export interface NuevaVacacion {
  desde: string;
  hasta: string;
  accion: AccionVacacion;
  suplenteId: Id | null;
  nota: string | null;
  /** Con acción "resguardo": quién queda a cargo de los equipos. */
  custodioId?: Id | null;
}

export interface NuevoArticulo {
  modeloId: Id;
  especificaciones: string | null;
  vidaUtilMeses: number | null;
  caracteristicas: CaracteristicaElegida[];
}

export interface NuevoActivo {
  articuloId: Id;
  serial: string;
  estado: 'disponible' | 'en_reparacion' | 'de_baja';
  usuarioId: Id | null;
  /** Responsable del resguardo si queda sin titular (por defecto, quien lo registra). */
  custodioId: Id | null;
}

export interface NuevoRol {
  nombre: string;
  descripcion: string | null;
  permisos: Permiso[];
}

export interface EdicionRol extends Partial<NuevoRol> {
  activo?: boolean;
}

export interface NuevoOperador {
  correo: string;
  nombre: string;
  rolId: Id;
}

export interface EdicionOperador {
  nombre?: string;
  rolId?: Id;
  activo?: boolean;
}

export interface NuevaReasignacion {
  activoId: Id;
  usuarioDestino: Id;
  motivo: string;
}

/** Fila de un machote (claves = encabezados normalizados de la hoja). */
export type FilaMachote = Record<string, string | number | null>;

export interface ResultadoBaja {
  liberados: number;
  prestamosDevueltosATi: number;
  vacacionesAjustadas: number;
}
