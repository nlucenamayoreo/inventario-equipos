import { backend } from '../../../shared/api/backend';
import type { EdicionCatalogo } from '../../../shared/api/client';
import type { Id, NivelDotacion, NuevoArticulo } from '../../../shared/api/types';

export const catalogosApi = {
  crearSilo: (nombre: string) => backend.crearSilo(nombre),
  crearDepartamento: (nombre: string, siloId: Id) => backend.crearDepartamento(nombre, siloId),
  crearTipoEquipo: (nombre: string) => backend.crearTipoEquipo(nombre),
  editarTipoEquipo: (id: Id, datos: { nombre?: string; maxPorUsuario?: number }) =>
    backend.editarTipoEquipo(id, datos),
  crearMarca: (nombre: string) => backend.crearMarca(nombre),
  editarMarca: (id: Id, datos: EdicionCatalogo) => backend.editarMarca(id, datos),
  crearModelo: (datos: { marcaId: Id; tipoId: Id; nombre: string }) => backend.crearModelo(datos),
  editarModelo: (id: Id, datos: EdicionCatalogo) => backend.editarModelo(id, datos),
  crearCaracteristica: (datos: { tipoId: Id; nombre: string; valores: string[] }) =>
    backend.crearCaracteristica(datos),
  editarCaracteristica: (id: Id, datos: EdicionCatalogo & { valores?: string[] }) =>
    backend.editarCaracteristica(id, datos),
  crearArticulo: (datos: NuevoArticulo) => backend.crearArticulo(datos),
  crearCargo: (nombre: string) => backend.crearCargo(nombre),
  actualizarDotacion: (
    cargoId: Id,
    tipoId: Id,
    nivel: NivelDotacion,
    articuloRestringidoId: Id | null,
  ) => backend.actualizarDotacion(cargoId, tipoId, nivel, articuloRestringidoId),
};
