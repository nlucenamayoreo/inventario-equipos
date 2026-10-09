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
export type Rol = 'admin_ti' | 'consulta';

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
}

export interface Articulo {
  id: Id;
  codigo: string; // ART-001
  tipoId: Id;
  marca: string;
  modelo: string;
  especificaciones: string | null;
  vidaUtilMeses: number | null;
  activo: boolean;
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
  rol: Rol;
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
}

export interface NuevoArticulo {
  tipoId: Id;
  marca: string;
  modelo: string;
  especificaciones: string | null;
  vidaUtilMeses: number | null;
}

export interface NuevoActivo {
  articuloId: Id;
  serial: string;
  estado: 'disponible' | 'en_reparacion' | 'de_baja';
  usuarioId: Id | null;
}

export interface ResultadoBaja {
  liberados: number;
  prestamosDevueltosATi: number;
  vacacionesAjustadas: number;
}
