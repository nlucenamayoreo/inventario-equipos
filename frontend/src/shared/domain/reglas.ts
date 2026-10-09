// Reglas de negocio puras (docs/ESPECIFICACION.md). Las usa la UI para calcular
// indicadores y el simulador para validar; el backend debe aplicar las mismas.
import type {
  Activo,
  Articulo,
  Cargo,
  EstadoActivo,
  EstadoUsuario,
  Id,
  NivelDotacion,
  Usuario,
} from '../api/types';

/** Estados en los que el titular "tiene" el equipo (cuenta para cobertura). */
export const ESTADOS_TENENCIA: readonly EstadoActivo[] = ['asignado', 'en_resguardo', 'prestamo'];
/** Estados que exigen titular. */
export const ESTADOS_CON_TITULAR: readonly EstadoActivo[] = [
  ...ESTADOS_TENENCIA,
  'pendiente_recuperacion',
];
/** Usuarios que cuentan en cobertura y faltantes. */
export const ESTADOS_USUARIO_VIGENTE: readonly EstadoUsuario[] = ['activo', 'vacaciones'];

export const esTenencia = (e: EstadoActivo) => ESTADOS_TENENCIA.includes(e);
export const tieneTitular = (e: EstadoActivo) => ESTADOS_CON_TITULAR.includes(e);
export const esVigente = (u: Usuario) => ESTADOS_USUARIO_VIGENTE.includes(u.estado);

export function nivelDe(cargo: Cargo | undefined | null, tipoId: Id): NivelDotacion {
  return cargo?.dotacion.find((d) => d.tipoId === tipoId)?.nivel ?? 'no_permitido';
}

export function restringidoDe(cargo: Cargo | undefined | null, tipoId: Id): Id | null {
  return cargo?.dotacion.find((d) => d.tipoId === tipoId)?.articuloRestringidoId ?? null;
}

/** ¿El cargo permite recibir este artículo? (equivale a puede_recibir() en SQL) */
export function cargoPermite(cargo: Cargo | undefined | null, articulo: Articulo): boolean {
  if (!cargo) return false;
  const d = cargo.dotacion.find((x) => x.tipoId === articulo.tipoId);
  if (!d || d.nivel === 'no_permitido') return false;
  return d.articuloRestringidoId == null || d.articuloRestringidoId === articulo.id;
}

/** Tipos obligatorios del cargo que el usuario no tiene. */
export function faltantes(
  cargo: Cargo | undefined | null,
  tiposTenidos: Set<Id>,
  tiposOrden: Id[],
): Id[] {
  if (!cargo) return [];
  return tiposOrden.filter((t) => nivelDe(cargo, t) === 'obligatorio' && !tiposTenidos.has(t));
}

/** Semáforo de cobertura: 100 % verde, 50–99 % ámbar, < 50 % rojo. */
export type Tono = 'ok' | 'mid' | 'bad' | 'neu';
export function tonoCobertura(cubiertos: number, exigidos: number): Tono {
  if (!exigidos) return 'neu';
  const p = cubiertos / exigidos;
  return p >= 1 ? 'ok' : p >= 0.5 ? 'mid' : 'bad';
}

/** Índices auxiliares para consultas rápidas en pantalla. */
export function indexar<T extends { id: Id }>(lista: T[]): Map<Id, T> {
  return new Map(lista.map((x) => [x.id, x]));
}

export function activosPorTitular(activos: Activo[]): Map<Id, Activo[]> {
  const m = new Map<Id, Activo[]>();
  for (const a of activos) {
    if (a.usuarioId != null && esTenencia(a.estado)) {
      const l = m.get(a.usuarioId) ?? [];
      l.push(a);
      m.set(a.usuarioId, l);
    }
  }
  return m;
}

export function hoyISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
