// Modelo derivado del inventario: índices y cálculos que usan todas las pantallas.
import type {
  Activo,
  Articulo,
  Cargo,
  Departamento,
  Id,
  Silo,
  TipoEquipo,
  Usuario,
} from '../api/types';
import { activosPorTitular, cargoPermite, esTenencia, faltantes, indexar, nivelDe } from './reglas';

export interface DatosInventario {
  silos: Silo[];
  departamentos: Departamento[];
  tipos: TipoEquipo[];
  articulos: Articulo[];
  cargos: Cargo[];
  usuarios: Usuario[];
  activos: Activo[];
}

export type Modelo = ReturnType<typeof construirModelo>;

export function construirModelo(d: DatosInventario) {
  const silo = indexar(d.silos);
  const depto = indexar(d.departamentos);
  const tipo = indexar(d.tipos);
  const articulo = indexar(d.articulos);
  const cargo = indexar(d.cargos);
  const usuario = indexar(d.usuarios);
  const tenencia = activosPorTitular(d.activos);
  const prestadosA = new Map<Id, Activo[]>();
  for (const a of d.activos) {
    if (a.estado === 'prestamo' && a.prestadoA != null) {
      const l = prestadosA.get(a.prestadoA) ?? [];
      l.push(a);
      prestadosA.set(a.prestadoA, l);
    }
  }
  const tiposIds = d.tipos.map((t) => t.id);

  const tipoDeActivo = (a: Activo) => articulo.get(a.articuloId)?.tipoId ?? -1;
  const cargoDe = (u: Usuario) => (u.cargoId != null ? cargo.get(u.cargoId) : undefined);
  const deptoDe = (u: Usuario) =>
    u.departamentoId != null ? depto.get(u.departamentoId) : undefined;
  const siloIdDe = (u: Usuario) => deptoDe(u)?.siloId ?? null;
  const tenenciaDe = (uid: Id) => tenencia.get(uid) ?? [];
  const tiposTenidos = (uid: Id) => new Set(tenenciaDe(uid).map(tipoDeActivo));

  return {
    ...d,
    idx: { silo, depto, tipo, articulo, cargo, usuario },
    tiposIds,
    tipoDeActivo,
    cargoDe,
    deptoDe,
    siloIdDe,
    tenenciaDe,
    prestadosA: (uid: Id) => prestadosA.get(uid) ?? [],
    tiposTenidos,
    nivel: (u: Usuario, tipoId: Id) => nivelDe(cargoDe(u), tipoId),
    faltantesDe: (u: Usuario) => faltantes(cargoDe(u), tiposTenidos(u.id), tiposIds),
    /** El titular tiene un equipo que su cargo no permite. */
    fueraDePerfil: (a: Activo) => {
      if (a.usuarioId == null || !esTenencia(a.estado)) return false;
      const u = usuario.get(a.usuarioId);
      const art = articulo.get(a.articuloId);
      return !!u && !!art && !cargoPermite(cargoDe(u), art);
    },
    puedeRecibir: (u: Usuario, a: Activo) => {
      const art = articulo.get(a.articuloId);
      return !!art && cargoPermite(cargoDe(u), art);
    },
    nombreUsuario: (id: Id | null) => (id != null ? (usuario.get(id)?.nombre ?? '—') : '—'),
    nombreTipo: (id: Id) => tipo.get(id)?.nombre ?? '—',
    etiquetaArticulo: (id: Id) => {
      const a = articulo.get(id);
      return a ? `${a.marca} ${a.modelo}` : '—';
    },
  };
}
