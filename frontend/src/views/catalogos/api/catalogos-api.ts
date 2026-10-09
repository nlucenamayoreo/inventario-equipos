import { backend } from '../../../shared/api/backend';
import type { Id, NivelDotacion } from '../../../shared/api/types';

export const catalogosApi = {
  crearSilo: (nombre: string) => backend.crearSilo(nombre),
  crearDepartamento: (nombre: string, siloId: Id) => backend.crearDepartamento(nombre, siloId),
  crearTipoEquipo: (nombre: string) => backend.crearTipoEquipo(nombre),
  crearCargo: (nombre: string) => backend.crearCargo(nombre),
  actualizarDotacion: (
    cargoId: Id,
    tipoId: Id,
    nivel: NivelDotacion,
    articuloRestringidoId: Id | null,
  ) => backend.actualizarDotacion(cargoId, tipoId, nivel, articuloRestringidoId),
};
